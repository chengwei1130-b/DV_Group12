(function () {
  const PALETTES = [
    { id: "default", label: "Default", description: "Original colors", preview: ["#F7931E", "#FFD84D", "#F3F4F6"], cssFilter: "", colors: null },
    { id: "deuteranopia", label: "Deuteranopia", description: "Red-green (green weak)", preview: ["#0072B2", "#E69F00", "#F0E442"], cssFilter: "", colors: { primary: "#0072B2", navBg: "#005B99", pageBg: "#EEF3FA", cardBg: "#DDEEFF", labelBg: "#0072B2", labelColor: "#fff", hoverBg: "#0072B2", hoverColor: "#fff", textDark: "#111", textMed: "#333", borderColor: "#0072B2", series: ["#0072B2", "#E69F00", "#F0E442", "#009E73", "#56B4E9", "#CC79A7", "#D55E00", "#4B4B4B"] } },
    { id: "protanopia", label: "Protanopia", description: "Red-green (red weak)", preview: ["#0077BB", "#EE7733", "#FFDD44"], cssFilter: "", colors: { primary: "#0077BB", navBg: "#005A8E", pageBg: "#EEF3FA", cardBg: "#DDEEFF", labelBg: "#0077BB", labelColor: "#fff", hoverBg: "#0077BB", hoverColor: "#fff", textDark: "#111", textMed: "#333", borderColor: "#0077BB", series: ["#0077BB", "#EE7733", "#FFDD44", "#33BBEE", "#009988", "#EE3377", "#AA4499", "#BBBBBB"] } },
    { id: "tritanopia", label: "Tritanopia", description: "Blue-yellow blind", preview: ["#EE3377", "#009988", "#FFAA00"], cssFilter: "", colors: { primary: "#EE3377", navBg: "#CC1155", pageBg: "#FFF0F4", cardBg: "#FFE0EA", labelBg: "#EE3377", labelColor: "#fff", hoverBg: "#EE3377", hoverColor: "#fff", textDark: "#111", textMed: "#333", borderColor: "#EE3377", series: ["#EE3377", "#009988", "#FFAA00", "#CC3311", "#33BBEE", "#AA3377", "#004488", "#777777"] } },
    { id: "achromatopsia", label: "Achromatopsia", description: "Full color blindness", preview: ["#222", "#777", "#CCC"], cssFilter: "grayscale(100%) contrast(1.1)", colors: null },
    { id: "highcontrast", label: "High Contrast", description: "Maximum visibility", preview: ["#FFFF00", "#000", "#00FFFF"], cssFilter: "", colors: { primary: "#FFFF00", navBg: "#000", pageBg: "#000", cardBg: "#111", labelBg: "#FFFF00", labelColor: "#000", hoverBg: "#FFFF00", hoverColor: "#000", textDark: "#FFF", textMed: "#DDD", borderColor: "#FFFF00", series: ["#FFFF00", "#00FFFF", "#FF88FF", "#FFF", "#FF8800", "#00FF88", "#88FFFF", "#FF4444"] } }
  ];

  let currentPaletteId = localStorage.getItem("a11y_palette") || "default";
  let currentZoom = parseFloat(localStorage.getItem("a11y_zoom") || "1.0");
  let magnifierOn = false;
  let panelOpen = false;

  document.head.insertAdjacentHTML("beforeend", `<style id="a11y-base">
    #a11y-fab{position:fixed;bottom:28px;right:28px;z-index:9500;display:flex;flex-direction:column;align-items:flex-end;gap:10px;font-family:Arial,sans-serif}
    #a11y-open{width:54px;height:54px;border-radius:50%;background:#F7931E;border:3px solid #fff;box-shadow:0 4px 20px rgba(0,0,0,.3);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:24px;transition:background .2s,transform .2s;color:#fff;line-height:1}
    #a11y-open:hover{background:#d97a0f;transform:scale(1.08)}
    #a11y-open.open{background:#222}
    #a11y-panel{display:none;flex-direction:column;gap:14px;background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.22);padding:16px 14px 12px;width:268px;border:2px solid #F7931E}
    #a11y-panel.show{display:flex;animation:a11y-pop .18s ease}
    @keyframes a11y-pop{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:none}}
    .a11y-h{font-size:12px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.08em;padding-bottom:8px;border-bottom:2px solid #FFD84D;margin:0}
    .a11y-lbl{font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:.07em;margin-bottom:5px}
    .a11y-zrow{display:flex;align-items:center;gap:8px}
    .a11y-zb{width:34px;height:34px;border-radius:8px;border:2px solid #F7931E;background:#FFF8F0;font-size:20px;font-weight:bold;color:#F7931E;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;flex-shrink:0}
    .a11y-zb:hover{background:#F7931E;color:#fff}
    #a11y-zpct{flex:1;text-align:center;font-size:13px;font-weight:700;color:#333}
    #a11y-zrst{font-size:11px;color:#F7931E;cursor:pointer;text-decoration:underline;background:none;border:none;padding:0;font-family:Arial}
    #a11y-zrst:hover{color:#b56600}
    #a11y-magbtn{display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:10px;border:2px solid #ddd;background:#fafafa;cursor:pointer;transition:border-color .15s,background .15s;width:100%;box-sizing:border-box}
    #a11y-magbtn:hover{border-color:#F7931E;background:#FFF8F0}
    #a11y-magbtn.on{border-color:#F7931E;background:#FFF3E0}
    #a11y-magbtn img{width:28px;height:28px;object-fit:contain;flex-shrink:0}
    #a11y-magbtn .ml{font-size:13px;font-weight:600;color:#333}
    #a11y-magbtn .mb{margin-left:auto;font-size:10px;padding:2px 7px;border-radius:20px;background:#eee;color:#888;font-weight:700}
    #a11y-magbtn.on .mb{background:#F7931E;color:#fff}
    #a11y-pals{display:flex;flex-direction:column;gap:5px}
    .a11y-pb{display:flex;align-items:center;gap:10px;padding:6px 10px;border-radius:9px;border:2px solid transparent;background:#fafafa;cursor:pointer;transition:border-color .15s,background .15s;width:100%;box-sizing:border-box;text-align:left}
    .a11y-pb:hover{border-color:#F7931E;background:#FFF8F0}
    .a11y-pb.sel{border-color:#F7931E;background:#FFF3E0}
    .a11y-sws{display:flex;gap:3px;flex-shrink:0}
    .a11y-sw{width:13px;height:13px;border-radius:50%;border:1px solid rgba(0,0,0,.12)}
    .a11y-pn{font-size:12px;font-weight:700;color:#222;display:block}
    .a11y-pd{font-size:10px;color:#888;display:block;margin-top:1px}

    #a11y-lens-wrapper {
      display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      pointer-events: none; z-index: 99998;
      clip-path: circle(95px at var(--x, -999px) var(--y, -999px));
      -webkit-clip-path: circle(95px at var(--x, -999px) var(--y, -999px));
    }
    
    #a11y-lens-scaler {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      transform-origin: var(--x, -999px) var(--y, -999px);
      transform: scale(2.8);
      background: #FFFDF5; 
    }
    
    #a11y-lens-ring {
      display: none; position: fixed; top: 0; left: 0;
      width: 190px; height: 190px; border-radius: 50%; border: 3px solid #F7931E;
      box-shadow: 0 6px 28px rgba(0,0,0,.45), inset 0 0 0 2px rgba(255,255,255,.3);
      pointer-events: none; z-index: 99999;
      transform: translate(calc(var(--x, -999px) - 95px), calc(var(--y, -999px) - 95px));
    }
    
    #a11y-lens-ring::after {
      content: ''; position: absolute; inset: 0; border-radius: 50%;
      background: radial-gradient(ellipse at 32% 30%,rgba(255,255,255,.28) 0%,rgba(255,255,255,.05) 45%,transparent 65%);
      pointer-events: none;
    }

    body.a11y-mag *:not(#a11y-fab):not(#a11y-fab *):not(.floating-actions):not(.floating-actions *):not(#a11y-lens-ring):not(#a11y-lens-wrapper):not(.info-dot):not(.filter-panel select):not(.filter-panel button) {
      pointer-events: none !important;
    }

    #a11y-fab, .floating-actions, .info-dot, .filter-panel select, .filter-panel button {
      pointer-events: auto !important;
    }

    body.a11y-mag #a11y-lens-wrapper.hide-lens,
    body.a11y-mag #a11y-lens-ring.hide-lens {
      display: none !important;
    }
    
    body.a11y-mag .chart-tooltip { opacity: 0 !important; display: none !important; }
  </style>`);

  const fab = document.createElement("div");
  fab.id = "a11y-fab";
  fab.innerHTML = `
    <div id="a11y-panel">
      <p class="a11y-h">♿ Accessibility</p>
      <div>
        <div class="a11y-lbl">Zoom</div>
        <div class="a11y-zrow">
          <button class="a11y-zb" id="a11y-zo" aria-label="Zoom out">−</button>
          <span id="a11y-zpct">100%</span>
          <button class="a11y-zb" id="a11y-zi" aria-label="Zoom in">+</button>
          <button id="a11y-zrst" aria-label="Reset zoom">Reset</button>
        </div>
      </div>
      <div>
        <div class="a11y-lbl">Magnifier</div>
        <button id="a11y-magbtn" aria-label="Toggle magnifying glass" aria-pressed="false">
          <img src="img/glass.png" alt="Magnifying glass">
          <span class="ml">Magnifying Glass</span>
          <span class="mb">OFF</span>
        </button>
      </div>
      <div>
        <div class="a11y-lbl">Color Vision Mode</div>
        <div id="a11y-pals"></div>
      </div>
    </div>
    <button id="a11y-open" aria-label="Accessibility options" aria-expanded="false">⚙</button>
  `;
  document.body.appendChild(fab);

  const lensWrapper = document.createElement("div");
  lensWrapper.id = "a11y-lens-wrapper";
  lensWrapper.innerHTML = `<div id="a11y-lens-scaler"></div>`;
  document.body.appendChild(lensWrapper);

  const lensRing = document.createElement("div");
  lensRing.id = "a11y-lens-ring";
  document.body.appendChild(lensRing);

  const scaler = document.getElementById("a11y-lens-scaler");
  const openBtn = document.getElementById("a11y-open");
  const panel = document.getElementById("a11y-panel");
  const magBtn = document.getElementById("a11y-magbtn");
  const palsCont = document.getElementById("a11y-pals");

  PALETTES.forEach(p => {
    const b = document.createElement("button");
    b.className = "a11y-pb" + (p.id === currentPaletteId ? " sel" : "");
    b.dataset.pid = p.id;
    b.setAttribute("aria-label", p.label + ": " + p.description);
    b.innerHTML = `
      <div class="a11y-sws">${p.preview.map(c => `<div class="a11y-sw" style="background:${c}"></div>`).join("")}</div>
      <div style="flex:1;min-width:0"><span class="a11y-pn">${p.label}</span><span class="a11y-pd">${p.description}</span></div>`;
    b.addEventListener("click", () => applyPalette(p.id));
    palsCont.appendChild(b);
  });

  openBtn.addEventListener("click", () => {
    panelOpen = !panelOpen;
    panel.classList.toggle("show", panelOpen);
    openBtn.classList.toggle("open", panelOpen);
    openBtn.innerHTML = panelOpen ? "✕" : "⚙";
  });

  document.addEventListener("click", e => {
    if (panelOpen && !fab.contains(e.target)) {
      panelOpen = false;
      panel.classList.remove("show");
      openBtn.classList.remove("open");
      openBtn.innerHTML = "⚙";
    }
  });

  function setZoom(z) {
    currentZoom = +Math.max(0.6, Math.min(2.0, z)).toFixed(1);
    document.body.style.zoom = currentZoom;
    document.getElementById("a11y-zpct").textContent = Math.round(currentZoom * 100) + "%";
    localStorage.setItem("a11y_zoom", currentZoom);
  }

  document.getElementById("a11y-zi").addEventListener("click", () => setZoom(currentZoom + 0.1));
  document.getElementById("a11y-zo").addEventListener("click", () => setZoom(currentZoom - 0.1));
  document.getElementById("a11y-zrst").addEventListener("click", () => setZoom(1.0));

  function hideChartTooltips() {
    document.querySelectorAll(".chart-tooltip").forEach(el => { el.style.opacity = "0"; el.style.display = "none"; });
  }

  function enableChartTooltipsAgain() {
    document.querySelectorAll(".chart-tooltip").forEach(el => { el.style.display = ""; el.style.opacity = "0"; });
  }

  // =========================================================================
  // SMART SYNC FOR D3 FILTERS (Ensures clone reflects the active filter state)
  // =========================================================================
  const LHALF = 190 / 2, MAG = 2.8;
  let magClone = null;
  let syncTimeout = null;

  // The observer watches for SVG/chart updates. When it sees an update, 
  // it waits 500ms for the animation to finish, then refreshes the magnifier clone!
  const domObserver = new MutationObserver(() => {
    if (!magnifierOn) return;
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(refreshMagClone, 500); 
  });

  function refreshMagClone() {
    if (!magnifierOn) return;
    
    const newClone = document.body.cloneNode(true);
    
    // Copy the selected values of all dropdowns so the lens shows the selected filter
    const originalSelects = document.body.querySelectorAll("select");
    const clonedSelects = newClone.querySelectorAll("select");
    originalSelects.forEach((select, i) => {
      if(clonedSelects[i]) clonedSelects[i].value = select.value;
    });

    // Strip out interactive UI from the clone so it doesn't loop or steal clicks
    newClone.querySelectorAll("#a11y-fab, #a11y-lens-wrapper, #a11y-lens-ring, .floating-actions, .global-chart-tooltip").forEach(el => el.remove());
    newClone.querySelectorAll("*").forEach(el => el.removeAttribute("id"));

    // Set position to overlay exactly over the real page
    newClone.style.position = "absolute";
    newClone.style.top = -window.scrollY + "px";
    newClone.style.left = -window.scrollX + "px";
    newClone.style.width = document.documentElement.scrollWidth + "px";
    newClone.style.height = document.documentElement.scrollHeight + "px";
    newClone.style.margin = "0";
    newClone.style.pointerEvents = "none";
    
    scaler.innerHTML = "";
    scaler.appendChild(newClone);
    magClone = newClone;
  }

  function handleMagMove(e) {
    if (!magnifierOn) return;
    const x = e.clientX;
    const y = e.clientY;

    lensWrapper.style.setProperty("--x", `${x}px`);
    lensWrapper.style.setProperty("--y", `${y}px`);
    lensRing.style.setProperty("--x", `${x}px`);
    lensRing.style.setProperty("--y", `${y}px`);
  }

  function handleMagScroll() {
    if (!magnifierOn || !magClone) return;
    magClone.style.top = -window.scrollY + "px";
    magClone.style.left = -window.scrollX + "px";
  }

  function startMag() {
    lensWrapper.style.display = "block";
    lensRing.style.display = "block";
    document.body.classList.add("a11y-mag");
    hideChartTooltips();

    const currentBg = getComputedStyle(document.body).backgroundColor;
    scaler.style.backgroundColor = (currentBg === "rgba(0, 0, 0, 0)" || currentBg === "transparent") ? "#FFFDF5" : currentBg;

    refreshMagClone();

    document.addEventListener("mousemove", handleMagMove, { passive: true });
    window.addEventListener("scroll", handleMagScroll, { passive: true });
    
    // Connect observer to watch the dashboard for filter updates
    const container = document.getElementById('content-container') || document.body;
    domObserver.observe(container, { childList: true, subtree: true, attributes: true });
  }

  function stopMag() {
    lensWrapper.style.display = "none";
    lensRing.style.display = "none";
    scaler.innerHTML = "";
    magClone = null;
    document.body.classList.remove("a11y-mag");
    
    hideChartTooltips();
    setTimeout(enableChartTooltipsAgain, 80);
    
    document.removeEventListener("mousemove", handleMagMove);
    window.removeEventListener("scroll", handleMagScroll);
    
    // Disconnect observer to save performance
    domObserver.disconnect();
    clearTimeout(syncTimeout);
  }

  magBtn.addEventListener("click", () => {
    magnifierOn = !magnifierOn;
    magBtn.classList.toggle("on", magnifierOn);
    magBtn.querySelector(".mb").textContent = magnifierOn ? "ON" : "OFF";
    if (magnifierOn) startMag(); else stopMag();
  });

  function setupHoverHiding() {
    const targets = document.querySelectorAll('#a11y-fab, .floating-actions, .info-dot, .filter-panel select, .filter-panel button');
    
    targets.forEach(el => {
      if (el.dataset.hoverBound) return;
      el.dataset.hoverBound = "true";

      el.addEventListener('mouseenter', () => {
        if(magnifierOn) {
          document.getElementById('a11y-lens-wrapper').classList.add('hide-lens');
          document.getElementById('a11y-lens-ring').classList.add('hide-lens');
        }
      });

      el.addEventListener('mouseleave', () => {
        if(magnifierOn) {
          document.getElementById('a11y-lens-wrapper').classList.remove('hide-lens');
          document.getElementById('a11y-lens-ring').classList.remove('hide-lens');
        }
      });
    });
  }

  setupHoverHiding();

  const contentObserver = new MutationObserver(setupHoverHiding);
  window.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById('content-container') || document.body;
    contentObserver.observe(container, { childList: true, subtree: true });
  });

  function applyPalette(id) {
    const pal = PALETTES.find(p => p.id === id);
    if (!pal) return;
    currentPaletteId = id;
    localStorage.setItem("a11y_palette", id);

    document.querySelectorAll(".a11y-pb").forEach(b => b.classList.toggle("sel", b.dataset.pid === id));
    const old = document.getElementById("a11y-pcss");
    if (old) old.remove();
    document.documentElement.style.filter = "";

    if (id === "default") { resetD3Colors(); return; }
    if (pal.cssFilter) document.documentElement.style.filter = pal.cssFilter;

    const c = pal.colors;
    if (!c) return;

    const isHC = id === "highcontrast";
    const css = document.createElement("style");
    css.id = "a11y-pcss";
    css.textContent = `
      body{background-color:${c.pageBg}!important}
      nav{background-color:${c.navBg}!important}
      nav a{color:${isHC ? "#FFFF00" : "#fff"}!important}
      nav a:hover,nav a.active{background-color:${c.hoverBg}!important;color:${c.hoverColor}!important}
      h1,h2,h3,h4,h5,h6{color:${c.textDark}!important}
      p,span,label,li,td,th{color:${c.textMed}!important}
      .home-description{border-color:${c.primary}!important;background:${c.cardBg}!important}
      .dashboard-link{background:${c.cardBg}!important;color:${c.textDark}!important}
      .dashboard-link:hover{background:${c.hoverBg}!important;color:${c.hoverColor}!important}
      .story-card-large{background:${c.cardBg}!important;color:${c.textMed}!important}
      .story-label{background:${c.labelBg}!important;color:${c.labelColor}!important}
      .question-structure{border-color:${c.primary}!important;background:${isHC ? "#000" : "#f9f9f9"}!important}
      svg{background-color:${isHC ? "#000" : "#F3F4F6"}!important}
      .tick text,.axis text,svg text{fill:${c.textDark}!important}
    `;
    document.head.appendChild(css);
    recolorD3(c);
  }

  const origAttrs = new WeakMap();
  function saveOrig(el, attrs) { if (!origAttrs.has(el)) { const saved = {}; attrs.forEach(a => saved[a] = el.getAttribute(a)); origAttrs.set(el, saved); } }
  function restoreOrig(el, attrs) { const saved = origAttrs.get(el); if (!saved) return; attrs.forEach(a => { if (saved[a] === null) el.removeAttribute(a); else el.setAttribute(a, saved[a]); }); }

  function recolorD3(c) {
    const s = c.series;
    document.querySelectorAll("line.stem").forEach(el => { saveOrig(el, ["stroke"]); el.setAttribute("stroke", s[0]); });
    document.querySelectorAll("circle.lollipop-head, circle.lollipop-dot, circle.line-point, circle.area-hover-point").forEach(el => { saveOrig(el, ["fill"]); el.setAttribute("fill", s[0]); });
    document.querySelectorAll("rect.d2-bar-fines").forEach(el => { saveOrig(el, ["fill"]); el.setAttribute("fill", s[0]); });
    document.querySelectorAll("rect.d2-bar-tests").forEach(el => { saveOrig(el, ["fill"]); el.setAttribute("fill", s[1]); });
    document.querySelectorAll("path.trend-line, path.d2-area-line").forEach(el => { saveOrig(el, ["stroke"]); el.setAttribute("stroke", s[0]); });
    document.querySelectorAll("path.d2-area").forEach(el => { saveOrig(el, ["fill"]); el.setAttribute("fill", s[0]); });
    document.querySelectorAll("rect.heatmap-cell").forEach(el => {
      const f = el.getAttribute("fill");
      if (f && f !== "#E5E7EB" && f !== "none" && !f.startsWith("url")) { saveOrig(el, ["fill"]); el.setAttribute("fill", s[0] + "CC"); }
    });
  }

  function resetD3Colors() {
    const selectors = [
      ["line.stem", ["stroke"]], ["circle.lollipop-head", ["fill"]], ["circle.lollipop-dot", ["fill"]], ["circle.line-point", ["fill"]], ["circle.area-hover-point", ["fill"]],
      ["rect.d2-bar-fines", ["fill"]], ["rect.d2-bar-tests", ["fill"]], ["path.trend-line", ["stroke"]], ["path.d2-area-line", ["stroke"]], ["path.d2-area", ["fill"]], ["rect.heatmap-cell", ["fill"]]
    ];
    selectors.forEach(([sel, attrs]) => document.querySelectorAll(sel).forEach(el => restoreOrig(el, attrs)));
  }

  new MutationObserver(() => {
    if (currentPaletteId === "default") return;
    clearTimeout(window._a11yT);
    window._a11yT = setTimeout(() => { const pal = PALETTES.find(p => p.id === currentPaletteId); if (pal && pal.colors) recolorD3(pal.colors); }, 950);
  }).observe(document.getElementById("content-container") || document.body, { childList: true, subtree: true });

  setZoom(currentZoom);
  if (currentPaletteId !== "default") applyPalette(currentPaletteId);
})();