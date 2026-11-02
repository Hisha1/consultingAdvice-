(() => {
  "use strict";

  const PASSWORD = "Wharton";
  const AUTH_KEY = "cag-authenticated";
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

  // ---------- Shared database (Supabase REST API) ----------
  const cfg = window.TIPS_CONFIG || {};
  const dbConfigured = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
  const endpoint = dbConfigured ? cfg.supabaseUrl.replace(/\/+$/, "") + "/rest/v1/tips" : "";
  const dbHeaders = {
    apikey: cfg.supabaseAnonKey,
    Authorization: "Bearer " + cfg.supabaseAnonKey,
    "Content-Type": "application/json",
  };

  const db = {
    async list() {
      const res = await fetch(endpoint + "?select=*&order=created_at.desc", { headers: dbHeaders });
      if (!res.ok) throw new Error(`Could not load tips (error ${res.status}).`);
      return res.json();
    },
    async add(tip) {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { ...dbHeaders, Prefer: "return=representation" },
        body: JSON.stringify(tip),
      });
      if (!res.ok) throw new Error(`Could not save your tip (error ${res.status}).`);
      const rows = await res.json();
      return rows[0];
    },
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
  function initGate(onUnlock) {
    let authed = false;
    try { authed = sessionStorage.getItem(AUTH_KEY) === "1"; } catch { /* ignore */ }
    if (authed) { onUnlock(); return; }

    const form = $("gate-form");
    const input = $("gate-password");
    const error = $("gate-error");
    input.focus();

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (input.value === PASSWORD) {
        try { sessionStorage.setItem(AUTH_KEY, "1"); } catch { /* ignore */ }
        onUnlock();
      } else {
        error.textContent = "Incorrect password. Try again.";
        form.classList.remove("shake");
        void form.offsetWidth; // restart animation
        form.classList.add("shake");
        input.select();
      }
    });
  }

  // ---------- Main app ----------
  function initApp() {
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
      if (!dbConfigured) return;
      if (!quiet && !loaded) setStatus("Loading tips…");
      try {
        tips = await db.list();
        loaded = true;
        setStatus("");
      } catch (err) {
        if (!quiet || !loaded) setStatus(err.message + " Check your connection and refresh the page.", true);
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
      if (!dbConfigured) return (formError.textContent = "The tips database isn't set up yet, so tips can't be saved.");

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
        formError.textContent = err.message + " Please try again.";
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Post tip";
      }
    });

    renderFilters();
    renderTips();

    if (!dbConfigured) {
      setStatus("The tips database isn't connected yet. Add your Supabase URL and anon key to config.js (see README).", true);
      return;
    }
    refresh();
    // Pick up tips other people post while the page is open.
    setInterval(() => { if (!document.hidden) refresh({ quiet: true }); }, REFRESH_MS);
  }

  startSpecks();
  initGate(initApp);
})();
