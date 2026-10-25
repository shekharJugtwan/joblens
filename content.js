// content.js — runs on linkedin.com, finds feed posts, scores them, hides or shows them.

(() => {
  // All LinkedIn-specific selectors live here. When LinkedIn changes its page, fix only this block.
  // LinkedIn (2026 layout) uses random class names, so we rely on attributes instead.
  const SELECTORS = {
    post: [
      'div[role="listitem"][componentkey^="update-card"]', // current layout
      'div[role="listitem"][componentkey*="FeedType_"]', // current layout, fallback
      'div[data-urn^="urn:li:activity"]', // older layout
      "div.feed-shared-update-v2", // older layout
    ],
    // Exact post-body containers, if LinkedIn exposes one. Otherwise we fall back to
    // all text in the post minus the parts listed in `exclude`.
    text: [
      '[data-testid="expandable-text-box"]',
      ".update-components-text",
      ".feed-shared-update-v2__description",
    ],
    exclude: [
      ".jl-bar", // our own bar
      '[componentkey*="commentsSection"]', // comments under the post
      '[componentkey*="CommentTools"]', // like/comment/repost toolbar
      "button",
      "script",
      "style",
      "svg",
    ],
    jobLink: 'a[href*="/jobs/view/"], a[href*="/jobs/collections/"]',
  };
  const EXCLUDE = SELECTORS.exclude.join(",");

  const DEFAULTS = { enabled: true, mode: "collapse", showScores: false, labeling: false };
  let settings = { ...DEFAULTS };
  let settingsVersion = 0;
  const labeledIds = new Map(); // id -> label

  // ---------- helpers ----------
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();

  function hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return "p" + (h >>> 0).toString(36);
  }

  function findPosts() {
    const sel = SELECTORS.post.join(",");
    const all = [...document.querySelectorAll(sel)];
    // keep only outermost matches (some post containers are nested)
    return all.filter((el) => !el.parentElement || !el.parentElement.closest(sel));
  }

  // Collect text under `root`, skipping excluded subtrees (comments, buttons, our bar).
  function collectText(root) {
    const parts = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (n.nodeType === Node.ELEMENT_NODE) {
          return n.matches(EXCLUDE) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    while (walker.nextNode()) parts.push(walker.currentNode.nodeValue);
    return clean(parts.join(" "));
  }

  function getText(post) {
    for (const sel of SELECTORS.text) {
      const els = post.querySelectorAll(sel);
      if (els.length) return clean([...els].map((e) => e.textContent).join(" "));
    }
    return collectText(post);
  }

  // ---------- the bar we add at the top of each post ----------
  function getBar(post) {
    let bar = post.querySelector(":scope > .jl-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "jl-bar";
      post.prepend(bar);
    }
    return bar;
  }

  function removeBar(post) {
    const bar = post.querySelector(":scope > .jl-bar");
    if (bar) bar.remove();
  }

  function resetPost(post) {
    post.classList.remove("jl-collapsed", "jl-removed", "jl-peek", "jl-job");
    removeBar(post);
    delete post.dataset.jlSig;
  }

  function renderBar(post, result, id, text) {
    const needBar =
      (!result.isJob && settings.mode === "collapse") || settings.showScores || settings.labeling;
    if (!needBar) {
      removeBar(post);
      return;
    }
    const bar = getBar(post);
    bar.textContent = "";
    bar.classList.toggle("jl-bar-job", result.isJob);

    const status = document.createElement("span");
    status.className = "jl-status";
    status.textContent = result.isJob
      ? "✓ Hiring post"
      : post.classList.contains("jl-peek")
      ? "Not a hiring post (click to hide)"
      : "Hidden: not a hiring post (click to show)";
    if (settings.showScores) {
      status.textContent += `  ·  score ${result.score}`;
      status.title = result.reasons.join("\n") || "no rules matched";
    }
    if (!result.isJob) {
      status.classList.add("jl-clickable");
      status.addEventListener("click", () => {
        post.classList.toggle("jl-peek");
        delete post.dataset.jlSig;
        schedule();
      });
    }
    bar.appendChild(status);

    if (settings.labeling) {
      const current = labeledIds.get(id);
      const mk = (label, txt) => {
        const b = document.createElement("button");
        b.className = "jl-btn" + (current === label ? " jl-btn-on" : "");
        b.textContent = txt;
        b.addEventListener("click", async (e) => {
          e.stopPropagation();
          await saveLabel(id, text, label, result.score);
          delete post.dataset.jlSig;
          schedule();
        });
        return b;
      };
      const box = document.createElement("span");
      box.className = "jl-labels";
      box.append(mk(1, "Job"), mk(0, "Not job"));
      bar.appendChild(box);
    }
  }

  // ---------- labeling (training data for version 2, stored only in your browser) ----------
  async function saveLabel(id, text, label, autoScore) {
    const { labels = [] } = await chrome.storage.local.get("labels");
    const rec = { id, text, label, auto_score: autoScore, ts: new Date().toISOString() };
    const i = labels.findIndex((l) => l.id === id);
    if (i >= 0) labels[i] = rec;
    else labels.push(rec);
    await chrome.storage.local.set({ labels });
    labeledIds.set(id, label);
  }

  // ---------- main pass ----------
  function processPost(post) {
    if (!settings.enabled) {
      if (post.dataset.jlSig) resetPost(post);
      return;
    }
    const text = getText(post);
    if (!text) return; // post not loaded yet

    const id = hash(text);
    const sig = `${settingsVersion}:${id}:${post.classList.contains("jl-peek")}:${labeledIds.get(id)}`;
    if (post.dataset.jlSig === sig) return; // already handled, nothing changed
    post.dataset.jlSig = sig;

    const hasJobLink = !!post.querySelector(SELECTORS.jobLink);
    const result = window.JobLensRules.scoreText(text, hasJobLink);

    post.classList.toggle("jl-job", result.isJob);
    post.classList.toggle("jl-collapsed", !result.isJob && settings.mode === "collapse" && !post.classList.contains("jl-peek"));
    post.classList.toggle("jl-removed", !result.isJob && settings.mode === "remove");

    renderBar(post, result, id, text);
  }

  function run() {
    if (!location.pathname.startsWith("/feed")) return;
    findPosts().forEach(processPost);
  }

  // Debounce: LinkedIn changes the page constantly while you scroll.
  let timer = null;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(run, 250);
  }

  // ---------- startup ----------
  async function init() {
    const stored = await chrome.storage.local.get(["settings", "labels"]);
    settings = { ...DEFAULTS, ...(stored.settings || {}) };
    (stored.labels || []).forEach((l) => labeledIds.set(l.id, l.label));

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      if (changes.settings) {
        settings = { ...DEFAULTS, ...(changes.settings.newValue || {}) };
        settingsVersion++;
        schedule();
      }
      if (changes.labels && !changes.labels.newValue) {
        labeledIds.clear(); // labels were cleared from the popup
        settingsVersion++;
        schedule();
      }
    });

    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    run();
  }

  init();
})();
