(() => {
  "use strict";

  const MAX_WORDS = 250;
  const REFRESH_MS = 30000;

  const CATEGORIES = [
    "Interview Prep Advice",
    "Office Selection",
    "Application",
    "Consulting Advice",
    "Interesting Case",
    "Miscellaneous",
  ];

  // ---------- Server API (Cloudflare Pages Functions) ----------
  // The password check and the database key both live on the server.
  let unlocked = false; // true once the visitor is past the password screen

  async function api(path, init = {}) {
    const res = await fetch("/api/" + path, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
      credentials: "same-origin",
    });
    if (res.status === 401 && unlocked) {
      location.reload(); // session expired: back to the password screen
      throw new Error("Session expired.");
    }
    let data = null;
    if (res.status !== 204) { try { data = await res.json(); } catch { /* empty */ } }
    if (!res.ok) {
      const err = new Error((data && data.error) || `Something went wrong (error ${res.status}).`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  const db = {
    list: () => api("tips"),
    add: (tip) => api("tips", { method: "POST", body: JSON.stringify(tip) }),
  };

  const $ = (id) => document.getElementById(id);
  const countWords = (text) => (text.trim().match(/\S+/g) || []).length;

  // ---------- Floating specks background ----------
  function startSpecks() {
    const canvas = $("specks");
    const ctx = canvas.getContext("2d");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let specks = [];
    let w = 0, h = 0, dpr = 1;

    function resize() {
      dpr = window.devicePixelRatio || 1;
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(90, (w * h) / 16000));
      specks = Array.from({ length: count }, makeSpeck);
    }

    function makeSpeck() {
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.8 + 0.6,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -(Math.random() * 0.25 + 0.05),
        phase: Math.random() * Math.PI * 2,
        alpha: Math.random() * 0.5 + 0.25,
      };
    }

    function frame(t) {
      ctx.clearRect(0, 0, w, h);
      for (const s of specks) {
        s.x += s.vx + Math.sin(t / 2000 + s.phase) * 0.12;
        s.y += s.vy;
        if (s.y < -5) { s.y = h + 5; s.x = Math.random() * w; }
        if (s.x < -5) s.x = w + 5;
        if (s.x > w + 5) s.x = -5;
        const twinkle = 0.6 + 0.4 * Math.sin(t / 900 + s.phase);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(145, 40%, 85%, ${s.alpha * twinkle})`;
        ctx.shadowColor = "hsla(145, 40%, 80%, 0.8)";
        ctx.shadowBlur = 6;
        ctx.fill();
      }
      if (!reduceMotion) requestAnimationFrame(frame);
    }

    window.addEventListener("resize", resize);
    resize();
    requestAnimationFrame(frame);
  }

  // ---------- Password gate ----------
  async function initGate(onUnlock) {
    try {
      await api("session");
      onUnlock();
      return;
    } catch { /* not logged in: show the gate */ }

    const gate = $("gate");
    const form = $("gate-form");
    const input = $("gate-password");
    const error = $("gate-error");
    const button = form.querySelector("button");
    gate.hidden = false;
    input.focus();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      error.textContent = "";
      button.disabled = true;
      try {
        await api("login", { method: "POST", body: JSON.stringify({ password: input.value }) });
        onUnlock();
      } catch (err) {
        error.textContent = err.status === 401 ? "Incorrect password. Try again." : err.message;
        form.classList.remove("shake");
        void form.offsetWidth; // restart animation
        form.classList.add("shake");
        input.select();
      } finally {
        button.disabled = false;
      }
    });
  }

  // ---------- Main app ----------
  function initApp() {
    unlocked = true;
    $("gate").remove();
    $("app").hidden = false;

    let tips = [];
    let loaded = false;
    let activeFilter = "All";

    const status = $("status");
    function setStatus(message, isError = false) {
      status.textContent = message || "";
      status.classList.toggle("error", isError);
      status.hidden = !message;
    }

    // Category select + filter chips
    const select = $("tip-category");
    select.innerHTML = '<option value="" disabled selected>Choose a category</option>' +
      CATEGORIES.map((c) => `<option>${c}</option>`).join("");

    const filters = $("filters");
    function renderFilters() {
      filters.replaceChildren(...["All", ...CATEGORIES].map((c) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "chip" + (c === activeFilter ? " active" : "");
        b.textContent = c;
        b.setAttribute("aria-pressed", c === activeFilter);
        b.addEventListener("click", () => { activeFilter = c; renderFilters(); renderTips(); });
        return b;
      }));
    }

    // Tip cards (built with textContent so user input is never parsed as HTML)
    function renderTips() {
      const grid = $("tips");
      const visible = tips
        .filter((t) => activeFilter === "All" || t.category === activeFilter)
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

      grid.replaceChildren(...visible.map((t) => {
        const card = document.createElement("article");
        card.className = "tip";

        const cat = document.createElement("span");
        cat.className = "tip-category";
        cat.textContent = t.category;

        const title = document.createElement("h3");
        title.textContent = t.title;

        const body = document.createElement("p");
        body.className = "tip-body";
        body.textContent = t.body;

        const meta = document.createElement("div");
        meta.className = "tip-meta";
        meta.append(metaLine("By", t.contributor || "Anonymous"));
        if (t.source) meta.append(metaLine("Source", t.source));
        meta.append(metaLine("Posted", new Date(t.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })));

        card.append(cat, title, body, meta);
        return card;
      }));

      const empty = $("empty");
      empty.textContent = activeFilter === "All"
        ? "No tips yet — be the first to add one."
        : "No tips in this category yet — be the first to add one.";
      empty.hidden = !loaded || visible.length > 0;
    }

    function metaLine(label, value) {
      const div = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = label + ": ";
      div.append(strong, document.createTextNode(value));
      return div;
    }

    async function refresh({ quiet = false } = {}) {
      if (!quiet && !loaded) setStatus("Loading tips…");
      try {
        tips = await db.list();
        loaded = true;
        setStatus("");
      } catch (err) {
        if (!quiet || !loaded) setStatus(err.message + " Try refreshing the page.", true);
      }
      renderTips();
    }

    // Form behaviour
    const panel = $("form-panel");
    const form = $("tip-form");
    const bodyInput = $("tip-body");
    const wordCount = $("word-count");
    const anon = $("tip-anon");
    const contributor = $("tip-contributor");
    const formError = $("form-error");
    const submitBtn = $("submit-tip");

    function updateWordCount() {
      const n = countWords(bodyInput.value);
      wordCount.textContent = `${n} / ${MAX_WORDS} words`;
      wordCount.classList.toggle("over", n > MAX_WORDS);
      return n;
    }

    function closeForm() {
      form.reset();
      contributor.disabled = false;
      formError.textContent = "";
      updateWordCount();
      panel.hidden = true;
    }

    $("open-form").addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      if (!panel.hidden) $("tip-title").focus();
    });
    $("cancel-form").addEventListener("click", closeForm);
    bodyInput.addEventListener("input", updateWordCount);
    anon.addEventListener("change", () => {
      contributor.disabled = anon.checked;
      if (anon.checked) contributor.value = "";
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = $("tip-title").value.trim();
      const category = select.value;
      const body = bodyInput.value.trim();
      const words = updateWordCount();

      if (!title) return (formError.textContent = "Please add a title.");
      if (!category) return (formError.textContent = "Please choose a category.");
      if (!body) return (formError.textContent = "Please write your tip.");
      if (words > MAX_WORDS) return (formError.textContent = `Your tip is ${words} words — please trim it to ${MAX_WORDS} or fewer.`);

      formError.textContent = "";
      submitBtn.disabled = true;
      submitBtn.textContent = "Posting…";
      try {
        const saved = await db.add({
          title,
          category,
          contributor: anon.checked ? null : (contributor.value.trim() || null),
          source: $("tip-source").value.trim() || null,
          body,
        });
        if (saved) tips.push(saved);
        activeFilter = "All";
        renderFilters();
        renderTips();
        closeForm();
      } catch (err) {
        formError.textContent = err.message;
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Post tip";
      }
    });

    renderFilters();
    renderTips();

    refresh();
    // Pick up tips other people post while the page is open.
    setInterval(() => { if (!document.hidden) refresh({ quiet: true }); }, REFRESH_MS);
  }

  startSpecks();
  initGate(initApp);
})();
