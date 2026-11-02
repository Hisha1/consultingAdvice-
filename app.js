(() => {
  "use strict";

  const PASSWORD = "Wharton";
  const AUTH_KEY = "cag-authenticated";
  const TIPS_KEY = "cag-tips";
  const MAX_WORDS = 250;

  const CATEGORIES = [
    "Interview Prep Advice",
    "Office Selection",
    "Application",
    "Consulting Advice",
    "Interesting Case",
    "Miscellaneous",
  ];

  const SEED_TIPS = [
    {
      id: "seed-1",
      title: "Structure out loud before you calculate",
      category: "Interview Prep Advice",
      contributor: "",
      source: "Feedback from a mock case with a second-year",
      body: "Interviewers care more about how you think than how fast you multiply. Before touching any numbers, take 30 seconds to lay out your approach, say it out loud, and check that the interviewer agrees. It saves you from solving the wrong problem.",
      createdAt: Date.parse("2026-09-15T12:00:00Z"),
    },
    {
      id: "seed-2",
      title: "Pick the office for the people, not the city",
      category: "Office Selection",
      contributor: "Alex",
      source: "Personal experience across two summer internships",
      body: "Staffing models differ a lot between offices. Ask how projects are assigned, how much travel is typical, and which industries dominate locally. A smaller office can mean more exposure to partners early on.",
      createdAt: Date.parse("2026-09-20T12:00:00Z"),
    },
    {
      id: "seed-3",
      title: "Quantify every resume bullet",
      category: "Application",
      contributor: "",
      source: "Career services resume review",
      body: "Screeners skim. Lead each bullet with an action verb and end it with a number: revenue, percentage, time saved, team size. If you can't quantify it, ask whether the bullet belongs at all.",
      createdAt: Date.parse("2026-10-01T12:00:00Z"),
    },
  ];

  // ---------- Storage helpers (fail gracefully if storage is blocked) ----------
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
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

    let tips = store.get(TIPS_KEY, null);
    if (!Array.isArray(tips)) { tips = SEED_TIPS.slice(); store.set(TIPS_KEY, tips); }
    let activeFilter = "All";

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
        .sort((a, b) => b.createdAt - a.createdAt);

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
        meta.append(metaLine("Posted", new Date(t.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })));

        card.append(cat, title, body, meta);

        if (t.mine) {
          const actions = document.createElement("div");
          actions.className = "tip-actions";
          const del = document.createElement("button");
          del.type = "button";
          del.className = "link-btn";
          del.textContent = "Delete";
          del.addEventListener("click", () => {
            if (!confirm("Delete this tip?")) return;
            tips = tips.filter((x) => x.id !== t.id);
            store.set(TIPS_KEY, tips);
            renderTips();
          });
          actions.append(del);
          card.append(actions);
        }
        return card;
      }));

      $("empty").hidden = visible.length > 0;
    }

    function metaLine(label, value) {
      const div = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = label + ": ";
      div.append(strong, document.createTextNode(value));
      return div;
    }

    // Form behaviour
    const panel = $("form-panel");
    const form = $("tip-form");
    const bodyInput = $("tip-body");
    const wordCount = $("word-count");
    const anon = $("tip-anon");
    const contributor = $("tip-contributor");
    const formError = $("form-error");

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

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = $("tip-title").value.trim();
      const category = select.value;
      const body = bodyInput.value.trim();
      const words = updateWordCount();

      if (!title) return (formError.textContent = "Please add a title.");
      if (!category) return (formError.textContent = "Please choose a category.");
      if (!body) return (formError.textContent = "Please write your tip.");
      if (words > MAX_WORDS) return (formError.textContent = `Your tip is ${words} words — please trim it to ${MAX_WORDS} or fewer.`);

      tips.push({
        id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()),
        title,
        category,
        contributor: anon.checked ? "" : contributor.value.trim(),
        source: $("tip-source").value.trim(),
        body,
        createdAt: Date.now(),
        mine: true,
      });
      store.set(TIPS_KEY, tips);
      activeFilter = "All";
      renderFilters();
      renderTips();
      closeForm();
    });

    renderFilters();
    renderTips();
  }

  startSpecks();
  initGate(initApp);
})();
