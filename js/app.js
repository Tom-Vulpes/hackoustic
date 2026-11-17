/* Hackoustic site — static, data-driven. All content lives in /data/*.json */
(function () {
  "use strict";

  // Change this if the repo is renamed or moved.
  var REPO = "tom-vulpes/hackoustic";
  var TABS = ["home", "learn", "workshops", "artists", "practitioners", "resources", "events", "news", "about"];
  var DATA = {};

  /* ---------- helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function safeUrl(u) {
    u = String(u || "").trim();
    return /^(https?:\/\/|mailto:)/i.test(u) ? u : "";
  }
  function safeImg(u) {
    u = String(u || "").trim();
    return /^(https?:\/\/|images\/)/i.test(u) ? u : "";
  }
  function domainOf(u) {
    try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return ""; }
  }
  function formUrl(template) {
    return "https://github.com/" + REPO + "/issues/new?template=" + template;
  }
  function loadJson(name) {
    return fetch("data/" + name + ".json", { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(name + ": HTTP " + r.status);
      return r.json();
    });
  }

  /* ---------- routing ---------- */
  function route() {
    var h = (location.hash || "#home").slice(1);
    if (TABS.indexOf(h) < 0) h = "home";
    TABS.forEach(function (t) {
      $("panel-" + t).classList.toggle("active", t === h);
    });
    document.querySelectorAll(".tabs .tab-btn").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-tab") === h);
    });
    window.scrollTo(0, 0);
  }

  /* ---------- modal ---------- */
  function openModal(html) {
    $("modal-body").innerHTML = html;
    $("modal-backdrop").classList.add("open");
  }
  function closeModal() { $("modal-backdrop").classList.remove("open"); }

  /* ---------- people cards (artists + practitioners share this) ---------- */
  function personCard(p, kind) {
    var img = safeImg(p.image);
    var thumb = img
      ? '<img class="thumb" src="' + esc(img) + '" alt="" loading="lazy">'
      : '<div class="thumb-fallback">' + esc((p.name || "?").charAt(0)) + "</div>";
    var tags = (p.tags || []).slice(0, 3).map(function (t) { return '<span class="chip">' + esc(t) + "</span>"; }).join("");
    return '<button class="card" data-kind="' + kind + '" data-id="' + esc(p.id) + '">' + thumb +
      '<div class="body"><h3>' + esc(p.name) + "</h3>" +
      '<div class="tags">' + tags + "</div>" +
      '<p class="bio">' + esc(p.bio) + '</p><span class="cta">View profile →</span></div></button>';
  }
  function personModal(p) {
    var img = safeImg(p.image);
    var links = (p.links || []).map(function (l) {
      var u = safeUrl(l.url);
      return u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">↗ ' + esc(l.label || domainOf(u)) + "</a>" : "";
    }).join("");
    var sub = p.event || p.location || "";
    return (img ? '<img class="modal-img" src="' + esc(img) + '" alt="">' : "") +
      '<div class="modal-inner"><h2>' + esc(p.name) + "</h2>" +
      (sub ? '<div class="event-line">' + esc(sub) + "</div>" : "") +
      '<div class="tags">' + (p.tags || []).map(function (t) { return '<span class="chip">' + esc(t) + "</span>"; }).join("") + "</div>" +
      '<div class="bio-full">' + esc(p.bio) + "</div>" +
      '<div class="links">' + (links || '<span class="no-link">No public link on file yet.</span>') + "</div></div>";
  }

  function wireDirectory(cfg) {
    var state = { q: "", tag: null };
    var items = DATA[cfg.data] || [];
    var allTags = {};
    items.forEach(function (p) { (p.tags || []).forEach(function (t) { allTags[t] = (allTags[t] || 0) + 1; }); });
    var tagNames = Object.keys(allTags).sort();

    function render() {
      var q = state.q.toLowerCase();
      var list = items.filter(function (p) {
        if (state.tag && (p.tags || []).indexOf(state.tag) < 0) return false;
        if (!q) return true;
        return (p.name + " " + p.bio + " " + (p.location || "") + " " + (p.tags || []).join(" ")).toLowerCase().indexOf(q) >= 0;
      });
      $(cfg.grid).innerHTML = list.length
        ? list.map(function (p) { return personCard(p, cfg.data); }).join("")
        : '<div class="empty">No matches.</div>';

      $(cfg.tagbar).innerHTML = tagNames.map(function (t) {
        return '<button class="tag-pill' + (state.tag === t ? " active" : "") + '" data-tag="' + esc(t) + '">' + esc(t) + " (" + allTags[t] + ")</button>";
      }).join("");

      var line = $(cfg.active);
      if (state.tag) {
        line.style.display = "flex";
        line.innerHTML = 'Filtering: <span class="chip">' + esc(state.tag) + '</span> <button type="button" data-clear="1">clear</button>';
      } else { line.style.display = "none"; line.innerHTML = ""; }
    }
    $(cfg.search).addEventListener("input", function (e) { state.q = e.target.value; render(); });
    $(cfg.tagbar).addEventListener("click", function (e) {
      var b = e.target.closest("[data-tag]");
      if (!b) return;
      state.tag = state.tag === b.dataset.tag ? null : b.dataset.tag;
      render();
    });
    $(cfg.active).addEventListener("click", function (e) {
      if (e.target.closest("[data-clear]")) { state.tag = null; render(); }
    });
    $(cfg.grid).addEventListener("click", function (e) {
      var c = e.target.closest(".card");
      if (!c) return;
      var p = items.filter(function (x) { return x.id === c.dataset.id; })[0];
      if (p) openModal(personModal(p));
    });
    render();
  }

  /* ---------- workshops ---------- */
  function todayIso() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function fmtDate(iso) {
    var d = new Date(iso + "T12:00:00");
    return isNaN(d) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  function renderWorkshops() {
    var today = todayIso();
    var all = (DATA.workshops || []).filter(function (w) { return !w.date || w.date >= today; });
    var regions = {};
    all.forEach(function (w) { if (w.region) regions[w.region] = 1; });
    var sel = $("ws-region");
    sel.innerHTML = '<option value="">All regions</option>' +
      Object.keys(regions).sort().map(function (r) { return '<option>' + esc(r) + "</option>"; }).join("");

    function draw() {
      var q = $("ws-search").value.toLowerCase(), reg = sel.value;
      var list = all.filter(function (w) {
        if (reg && w.region !== reg) return false;
        return !q || (w.title + " " + w.provider + " " + w.location + " " + w.desc).toLowerCase().indexOf(q) >= 0;
      });
      // dated first (soonest), then ongoing alphabetically
      list.sort(function (a, b) {
        if (a.date && b.date) return a.date < b.date ? -1 : 1;
        if (a.date) return -1;
        if (b.date) return 1;
        return a.provider.localeCompare(b.provider);
      });
      $("ws-list").innerHTML = list.length ? list.map(function (w) {
        var u = safeUrl(w.url);
        var title = u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(w.title) + " ↗</a>" : esc(w.title);
        return '<div class="ws-item"><div class="ws-when">' + (w.date ? esc(fmtDate(w.date)) : "Ongoing") +
          "<small>" + esc(w.format || "") + "</small></div><div>" +
          '<h3 class="ws-title">' + title + "</h3>" +
          '<div class="ws-meta">' + esc(w.provider) + (w.location ? " · " + esc(w.location) : "") + "</div>" +
          '<p class="tl-desc">' + esc(w.desc) + "</p></div></div>";
      }).join("") : '<div class="empty">No workshops match.</div>';
    }
    $("ws-search").addEventListener("input", draw);
    sel.addEventListener("change", draw);
    draw();
  }

  /* ---------- resources ---------- */
  var CAT_ORDER = ["Communities & courses", "Instrument building & kits", "Software & tools", "Tutorials & learning", "Accessibility & inclusive design", "Reading"];
  function resCard(r) {
    var u = safeUrl(r.url);
    return '<a class="res-card" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer"><div class="res-title">' +
      esc(r.title) + '<span class="arrow">↗</span></div><p class="res-desc">' + esc(r.desc) +
      '</p><span class="res-domain">' + esc(domainOf(u)) + "</span></a>";
  }
  function renderResources() {
    var groups = {};
    (DATA.resources || []).forEach(function (r) { (groups[r.category || "Other"] = groups[r.category || "Other"] || []).push(r); });
    var cats = Object.keys(groups).sort(function (a, b) {
      var ia = CAT_ORDER.indexOf(a), ib = CAT_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    $("resources-list").innerHTML = cats.map(function (c) {
      return '<div class="res-category"><h2>' + esc(c) + '</h2><div class="res-grid">' + groups[c].map(resCard).join("") + "</div></div>";
    }).join("");
  }

  /* ---------- events + news ---------- */
  function renderEvents() {
    var items = (DATA.events || []).slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    function draw() {
      var q = $("event-search").value.toLowerCase();
      var list = items.filter(function (e) { return !q || (e.title + " " + (e.venue || "") + " " + (e.desc || "")).toLowerCase().indexOf(q) >= 0; });
      $("event-list").innerHTML = list.length ? list.map(function (e) {
        var u = safeUrl(e.sourceUrl);
        return '<div class="tl-item"><div class="tl-date">' + esc(e.date) + "</div><div>" +
          '<h3 class="tl-title">' + esc(e.title) + "</h3>" +
          (e.venue ? '<div class="tl-venue">' + esc(e.venue) + "</div>" : "") +
          (e.desc ? '<p class="tl-desc">' + esc(e.desc) + "</p>" : "") +
          (u ? '<a class="tl-link" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">Source ↗</a>' : "") +
          "</div></div>";
      }).join("") : '<div class="empty">No events match.</div>';
    }
    $("event-search").addEventListener("input", draw);
    draw();
  }
  function renderNews() {
    var items = (DATA.news || []).slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    $("news-grid").innerHTML = items.map(function (n) {
      var u = safeUrl(n.link);
      return '<div class="news-card"><div class="tl-date">' + esc(n.date) + "</div><h3>" + esc(n.title) + "</h3><p>" + esc(n.body) + "</p>" +
        (u ? '<a class="tl-link" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">Read more ↗</a>' : "") + "</div>";
    }).join("");
  }

  /* ---------- learn flowchart ---------- */
  function renderLearn() {
    var tree = DATA.learn;
    var root = $("flow");
    var path = [tree.start]; // node ids visited

    function resById(id) { return (DATA.resources || []).filter(function (r) { return r.id === id; })[0]; }

    function draw() {
      var id = path[path.length - 1], node = tree.nodes[id];
      var trail = path.slice(0, -1).map(function (pid) {
        var n = tree.nodes[pid];
        return '<span class="step">' + esc(n.question) + "</span>";
      });
      // show chosen answers instead of questions where possible
      var answers = [];
      for (var i = 0; i < path.length - 1; i++) {
        var opts = tree.nodes[path[i]].options || [];
        var chosen = opts.filter(function (o) { return o.next === path[i + 1]; })[0];
        answers.push('<span class="step">' + esc(chosen ? chosen.label : path[i]) + "</span>");
      }
      var html = answers.length ? '<div class="trail">' + answers.join('<span class="sep">→</span>') + "</div>" : "";

      if (node.options) {
        html += '<div class="flow-q"><h2>' + esc(node.question) + "</h2>" +
          (node.hint ? '<p class="hint">' + esc(node.hint) + "</p>" : "") +
          '<div class="flow-opts">' + node.options.map(function (o) {
            return '<button class="flow-opt" data-next="' + esc(o.next) + '"><span>' + esc(o.label) + '</span><span class="arrow">→</span></button>';
          }).join("") + "</div>" +
          (path.length > 1 ? '<div class="flow-nav"><button class="ghost" data-act="back">← Back</button><button class="ghost" data-act="restart">Start over</button></div>' : "") +
          "</div>";
      } else {
        var r = node.result;
        var cards = (r.resources || []).map(resById).filter(Boolean).map(resCard).join("");
        var tabLabels = { workshops: "Find a workshop", practitioners: "Meet practitioners", artists: "See who we've worked with", resources: "All resources" };
        html += '<div class="flow-q flow-result"><p class="eyebrow">Your starting point</p><h2>' + esc(r.title) + "</h2>" +
          '<p class="blurb">' + esc(r.blurb) + "</p>" +
          '<div class="res-grid">' + cards + "</div>" +
          '<div class="flow-more">' + (r.tabs || []).map(function (t) { return '<a href="#' + esc(t) + '">→ ' + esc(tabLabels[t] || t) + "</a>"; }).join("") + "</div>" +
          '<div class="flow-nav"><button class="ghost" data-act="back">← Back</button><button class="ghost" data-act="restart">Start over</button></div></div>';
      }
      root.innerHTML = html;
    }
    root.addEventListener("click", function (e) {
      var o = e.target.closest("[data-next]");
      if (o) { path.push(o.dataset.next); draw(); return; }
      var a = e.target.closest("[data-act]");
      if (!a) return;
      if (a.dataset.act === "back" && path.length > 1) path.pop();
      if (a.dataset.act === "restart") path = [tree.start];
      draw();
    });
    draw();
  }

  /* ---------- home + submit links ---------- */
  function renderHome() {
    $("stat-artists").textContent = (DATA.artists || []).length;
    $("stat-practitioners").textContent = (DATA.practitioners || []).length;
    $("stat-workshops").textContent = (DATA.workshops || []).length;
    $("stat-resources").textContent = (DATA.resources || []).length;
    $("submit-workshop").innerHTML = '<a class="btn" href="' + formUrl("workshop.yml") + '" target="_blank" rel="noopener">+ Suggest a workshop</a>';
    $("submit-practitioner").innerHTML = '<a class="btn" href="' + formUrl("practitioner.yml") + '" target="_blank" rel="noopener">+ Suggest a practitioner</a>';
    $("submit-resource").innerHTML = '<a class="btn" href="' + formUrl("resource.yml") + '" target="_blank" rel="noopener">+ Suggest a resource</a>';
  }

  /* ---------- boot ---------- */
  function boot() {
    window.addEventListener("hashchange", route);
    $("modal-close").addEventListener("click", closeModal);
    $("modal-backdrop").addEventListener("click", function (e) { if (e.target === $("modal-backdrop")) closeModal(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });
    route();

    var names = ["artists", "practitioners", "workshops", "events", "news", "resources", "learn"];
    Promise.all(names.map(loadJson)).then(function (res) {
      names.forEach(function (n, i) { DATA[n] = res[i]; });
      renderHome();
      wireDirectory({ data: "artists", grid: "artist-grid", tagbar: "artist-tagbar", active: "artist-active", search: "artist-search" });
      wireDirectory({ data: "practitioners", grid: "prac-grid", tagbar: "prac-tagbar", active: "prac-active", search: "prac-search" });
      renderWorkshops(); renderResources(); renderEvents(); renderNews(); renderLearn();
    }).catch(function (err) {
      var msg = '<div class="empty">Couldn\'t load site data (' + esc(err.message) + '). If you opened this file directly from disk, serve the folder over http instead (e.g. <code>python3 -m http.server</code>) — browsers block loading JSON from file://.</div>';
      $("panel-home").insertAdjacentHTML("afterbegin", msg);
    });
  }
  boot();
})();
