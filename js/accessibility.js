(function () {
  const PALETTES = [
    // ── Default ─────────────────────────────────────────────────────────────
    { id: "default", label: "Default", description: "Original colors", preview: ["#F7931E", "#FFD84D", "#F3F4F6"], cssFilter: "", colors: null },

    // ── Deuteranopia (red-green, green-weak) ────────────────────────────────
    // Uses Blues + Oranges + Yellow. Avoids greens. High luminance contrast.
    { id: "deuteranopia", label: "Deuteranopia", description: "Red-green (green weak)",
      preview: ["#005AB5", "#DCB732", "#78C0DF"], cssFilter: "",
      colors: {
        primary: "#005AB5", navBg: "#003F80", pageBg: "#EEF4FB", cardBg: "#D9ECFF",
        labelBg: "#005AB5", labelColor: "#fff", hoverBg: "#003F80", hoverColor: "#fff",
        textDark: "#111", textMed: "#333", borderColor: "#005AB5",
        // Blues → Orange → Yellow → Burnt Orange — all distinguishable without green receptors
        series: ["#005AB5", "#78C0DF", "#ECE4B5", "#DCB732", "#CC6600", "#A8D8EA", "#7B3F00", "#444444"],
        // Heatmap: single-hue blue sequential (safe for deuteranopia)
        heatmapLow: "#D9ECFF", heatmapHigh: "#003F80"
      }
    },

    // ── Protanopia (red-green, red-weak) ────────────────────────────────────
    // Similar confusion lines to deuteranopia. Same blue-orange strategy,
    // slightly shifted so deep blues and burnt orange lead.
    { id: "protanopia", label: "Protanopia", description: "Red-green (red weak)",
      preview: ["#005AB5", "#CC6600", "#ECE4B5"], cssFilter: "",
      colors: {
        primary: "#004FA3", navBg: "#003570", pageBg: "#EEF4FB", cardBg: "#D9ECFF",
        labelBg: "#004FA3", labelColor: "#fff", hoverBg: "#003570", hoverColor: "#fff",
        textDark: "#111", textMed: "#333", borderColor: "#004FA3",
        series: ["#004FA3", "#CC6600", "#78C0DF", "#DCB732", "#ECE4B5", "#7B3F00", "#A8D8EA", "#555555"],
        heatmapLow: "#D9ECFF", heatmapHigh: "#003570"
      }
    },

    // ── Tritanopia (blue-yellow blind) ──────────────────────────────────────
    // Avoids blues and yellows. Relies on Reds, Cyans, and distinct Grays.
    { id: "tritanopia", label: "Tritanopia", description: "Blue-yellow blind",
      preview: ["#900000", "#00E5FF", "#008080"], cssFilter: "",
      colors: {
        primary: "#900000", navBg: "#600000", pageBg: "#FFF5F5", cardBg: "#FFE5E5",
        labelBg: "#900000", labelColor: "#fff", hoverBg: "#600000", hoverColor: "#fff",
        textDark: "#111", textMed: "#333", borderColor: "#900000",
        // Dark Red → Bright Red → Cyan → Teal → Pink — no blues/yellows
        series: ["#900000", "#FF3333", "#00E5FF", "#008080", "#FFB6C1", "#CC0044", "#005F5F", "#777777"],
        // Heatmap: red sequential (no blue/yellow confusion)
        heatmapLow: "#FFE5E5", heatmapHigh: "#900000"
      }
    },

    // ── Achromatopsia (full color blindness) ────────────────────────────────
    // Strictly sequential grayscale with ≥20% luminance jumps between each step.
    { id: "achromatopsia", label: "Achromatopsia", description: "Full color blindness",
      preview: ["#111111", "#777777", "#CCCCCC"], cssFilter: "",
      colors: {
        primary: "#111111", navBg: "#222222", pageBg: "#F5F5F5", cardBg: "#E8E8E8",
        labelBg: "#333333", labelColor: "#fff", hoverBg: "#111111", hoverColor: "#fff",
        textDark: "#000", textMed: "#333", borderColor: "#555555",
        // 5-step grayscale with ~20% luminance gap, padded to 8 by cycling
        series: ["#111111", "#444444", "#777777", "#AAAAAA", "#DDDDDD", "#222222", "#666666", "#999999"],
        heatmapLow: "#DDDDDD", heatmapHigh: "#111111"
      }
    },

    // ── High Contrast ────────────────────────────────────────────────────────
    { id: "highcontrast", label: "High Contrast", description: "Maximum visibility",
      preview: ["#FFFF00", "#000", "#00FFFF"], cssFilter: "",
      colors: {
        primary: "#FFFF00", navBg: "#000", pageBg: "#000", cardBg: "#111",
        labelBg: "#FFFF00", labelColor: "#000", hoverBg: "#FFFF00", hoverColor: "#000",
        textDark: "#FFF", textMed: "#DDD", borderColor: "#FFFF00",
        series: ["#FFFF00", "#00FFFF", "#FF88FF", "#FFFFFF", "#FF8800", "#00FF88", "#88FFFF", "#FF4444"],
        heatmapLow: "#333300", heatmapHigh: "#FFFF00"
      }
    }
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

    body.a11y-mag *:not(#a11y-fab):not(#a11y-fab *):not(#a11y-lens-ring):not(#a11y-lens-wrapper):not(.info-dot):not(.filter-panel select):not(.filter-panel button) {
      pointer-events: none !important;
    }

    #a11y-fab, .info-dot, .filter-panel select, .filter-panel button {
      pointer-events: auto !important;
    }

    #a11y-lens-wrapper.hide-lens,
    #a11y-lens-ring.hide-lens {
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
  document.documentElement.appendChild(fab);

  // NOTE: the button intentionally has NO custom scaling/repositioning logic.
  // It uses plain position:fixed (bottom:28px; right:28px) so it stays
  // anchored to the bottom-right corner of the viewport exactly like any
  // normal fixed element — including when the user zooms with the browser's
  // native zoom (Ctrl/Cmd +/-). A previous "keep constant physical size"
  // hack here (using devicePixelRatio to counter-scale the button) was what
  // caused the button to drift away from its corner when zooming; removed.

  // Attach lens elements to <html>, NOT <body>, so they never inherit body{zoom}
  const lensWrapper = document.createElement("div");
  lensWrapper.id = "a11y-lens-wrapper";
  lensWrapper.innerHTML = `<div id="a11y-lens-scaler"></div>`;
  document.documentElement.appendChild(lensWrapper);

  const lensRing = document.createElement("div");
  lensRing.id = "a11y-lens-ring";
  document.documentElement.appendChild(lensRing);

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
    // Rebuild the magnifier clone whenever zoom changes so it matches the new page size
    if (magnifierOn) refreshMagClone();
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
    
    // Copy dropdown selections so the lens shows the current filter state
    const originalSelects = document.body.querySelectorAll("select");
    const clonedSelects = newClone.querySelectorAll("select");
    originalSelects.forEach((sel, i) => {
      if (clonedSelects[i]) clonedSelects[i].value = sel.value;
    });

    // --- BUG 1 FIX: PRESERVE BUTTON CSS BEFORE STRIPPING IDs ---
    const originalButtons = document.body.querySelectorAll("button");
    const clonedButtons = newClone.querySelectorAll("button");
    originalButtons.forEach((btn, i) => {
      if (clonedButtons[i]) {
        const computed = window.getComputedStyle(btn);
        // Force the clone to retain the exact background, color, and borders
        clonedButtons[i].style.backgroundColor = computed.backgroundColor;
        clonedButtons[i].style.color = computed.color;
        clonedButtons[i].style.border = computed.border;
        clonedButtons[i].style.borderRadius = computed.borderRadius;
        clonedButtons[i].style.padding = computed.padding;
        clonedButtons[i].style.font = computed.font;
      }
    });
    // -----------------------------------------------------------

    // Remove UI elements that must not appear inside the lens
    newClone.querySelectorAll("#a11y-fab, #a11y-lens-wrapper, #a11y-lens-ring, .global-chart-tooltip").forEach(el => el.remove());
    newClone.querySelectorAll("*").forEach(el => el.removeAttribute("id"));

    newClone.style.zoom = currentZoom;
    newClone.style.position = "absolute";
    
    newClone.style.top  = -(window.scrollY / currentZoom) + "px";
    newClone.style.left = -(window.scrollX / currentZoom) + "px";
    
    newClone.style.width  = (document.documentElement.scrollWidth / currentZoom) + "px";
    newClone.style.height = (document.documentElement.scrollHeight / currentZoom) + "px";
    
    newClone.style.margin = "0";
    newClone.style.pointerEvents = "none";
    
    scaler.innerHTML = "";
    scaler.appendChild(newClone);
    magClone = newClone;
  }

  // Elements the lens should hide over: the accessibility panel + its open
  // button, the magnifier toggle, filter controls, and the integrated
  // Back to Home link. Checked by bounding-rect on every mousemove (see
  // handleMagMove) rather than mouseenter/mouseleave, since the lens ring
  // sits above these elements (z-index 99999) and can make enter/leave
  // hit-testing unreliable.
  const HOVER_HIDE_SELECTOR =
    '#a11y-open, #a11y-panel, #a11y-magbtn, .filter-panel button, .filter-panel select, .nav-home-link';

  function handleMagMove(e) {
    if (!magnifierOn) return;
    // clientX/Y are in physical viewport pixels — correct to use directly
    // because the lens elements live on <html> and are not subject to body zoom
    const x = e.clientX;
    const y = e.clientY;

    const overHideTarget = Array.from(document.querySelectorAll(HOVER_HIDE_SELECTOR)).some(el => {
      const r = el.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });
    lensWrapper.classList.toggle("hide-lens", overHideTarget);
    lensRing.classList.toggle("hide-lens", overHideTarget);

    lensWrapper.style.setProperty("--x", `${x}px`);
    lensWrapper.style.setProperty("--y", `${y}px`);
    lensRing.style.setProperty("--x", `${x}px`);
    lensRing.style.setProperty("--y", `${y}px`);
  }

  function handleMagScroll() {
    if (!magnifierOn || !magClone) return;
    // FIX: Must also divide the scroll distances by currentZoom
    magClone.style.top  = -(window.scrollY / currentZoom) + "px";
    magClone.style.left = -(window.scrollX / currentZoom) + "px";
  }
  
  // --- BUG 2 FIX: Native Browser Zoom / Resize Handler ---
  function handleMagResize() {
    if (magnifierOn) refreshMagClone();
  }

function startMag() {
    lensWrapper.style.display = "block";
    lensRing.style.display = "block";
    lensWrapper.classList.remove("hide-lens");
    lensRing.classList.remove("hide-lens");
    document.body.classList.add("a11y-mag");
    hideChartTooltips();

    const currentBg = getComputedStyle(document.body).backgroundColor;
    scaler.style.backgroundColor = (currentBg === "rgba(0, 0, 0, 0)" || currentBg === "transparent") ? "#FFFDF5" : currentBg;

    refreshMagClone();

    document.addEventListener("mousemove", handleMagMove, { passive: true });
    window.addEventListener("scroll", handleMagScroll, { passive: true });
    
    // Add the native zoom/resize listener
    window.addEventListener("resize", handleMagResize, { passive: true });
    
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
    
    // Remove the native zoom/resize listener
    window.removeEventListener("resize", handleMagResize);
    
    domObserver.disconnect();
    clearTimeout(syncTimeout);
  }

  magBtn.addEventListener("click", () => {
    magnifierOn = !magnifierOn;
    magBtn.classList.toggle("on", magnifierOn);
    magBtn.querySelector(".mb").textContent = magnifierOn ? "ON" : "OFF";
    if (magnifierOn) startMag(); else stopMag();
  });

  // Hover-hiding for the lens is now handled directly inside handleMagMove
  // via HOVER_HIDE_SELECTOR + getBoundingClientRect checks (see above), so
  // no per-element mouseenter/mouseleave bindings or mutation observer are
  // needed here.

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
      /* ── Page background ── */
      body{background-color:${c.pageBg}!important;background-image:none!important}

      /* ── Navigation / header ── */
      nav,.site-header{background:${c.navBg}!important;background-image:none!important}
      nav a,.nav-links a{color:${isHC ? "#FFFF00" : "#fff"}!important}
      nav a:hover,nav a.active,.nav-links a:hover,.nav-links a.active{background-color:${c.hoverBg}!important;color:${c.hoverColor}!important}

      /* ── Headings & text ── */
      h1,h2,h3,h4,h5,h6{color:${c.textDark}!important}
      p,span,label,li,td,th{color:${c.textMed}!important}

      /* ── Cards & panels (the main surfaces untouched before) ── */
      .feature-panel,.premium-link-card,.about-us-member,.mission-panel,
      .filter-panel,.kpi-card,.story-chart-card,.story-summary,.data-note{
        background:${c.cardBg}!important;
        border-color:${c.borderColor}!important;
      }

      /* ── KPI card accent border-top ── */
      .kpi-card{border-top-color:${c.primary}!important}

      /* ── KPI icon chip ── */
      .kpi-icon{background:${isHC ? "#222" : c.cardBg}!important;color:${c.primary}!important;border-color:${c.borderColor}!important}

      /* ── Insight boxes ── */
      .insight-box{background:${isHC ? "#111" : c.cardBg}!important;color:${c.primary}!important}
      .insight-box p{color:${c.primary}!important}

      /* ── Section kicker / subtitle ── */
      .section-kicker{color:${c.primary}!important}
      .heading-rule{background:${c.primary}!important}
      .section-subtitle,.story-lede{color:${c.textMed}!important}

      /* ── Filter panel labels & selects ── */
      .filter-panel label,.filter-panel span{color:${c.textDark}!important}
      .filter-panel select{background:${isHC ? "#000" : "#fff"}!important;color:${c.textDark}!important;border-color:${c.borderColor}!important}

      /* ── Homepage cards ── */
      .home-description{border-color:${c.primary}!important;background:${c.cardBg}!important}
      .dashboard-link{background:${c.cardBg}!important;color:${c.textDark}!important}
      .dashboard-link:hover{background:${c.hoverBg}!important;color:${c.hoverColor}!important}
      .story-card-large{background:${c.cardBg}!important;color:${c.textMed}!important}
      .story-label{background:${c.labelBg}!important;color:${c.labelColor}!important}
      .question-structure{border-color:${c.primary}!important;background:${isHC ? "#000" : "#f9f9f9"}!important}

      /* ── Summary / data-note specifics ── */
      .summary-icon,.mission-icon{background:${isHC ? "#222" : c.cardBg}!important}
      .story-summary ol,.story-summary li{color:${c.textMed}!important}

      /* ── Heatmap fallback summary blocks (direct-appended by JS) ── */
      .direct-visible-summary-block{
        background:${c.cardBg}!important;
        border-color:${c.borderColor}!important;
      }
      .direct-summary-header h2{color:${c.textDark}!important}
      .direct-summary-header p{color:${c.textMed}!important}
      .direct-summary-icon{background:${isHC ? "#222" : c.cardBg}!important}
      .direct-visible-summary-block ol,.direct-visible-summary-block li{color:${c.textMed}!important}
      .direct-visible-footer{
        background:${isHC ? "#111" : c.cardBg}!important;
        border-color:${c.borderColor}!important;
      }
      .direct-visible-footer p{color:${c.textMed}!important}

      /* ── Visible heatmap summary fallback blocks ── */
      .visible-heatmap-summary,.visible-heatmap-note{
        background:${c.cardBg}!important;
        border-color:${c.borderColor}!important;
      }
      .visible-heatmap-summary h2,.visible-heatmap-summary p,
      .visible-heatmap-summary ol,.visible-heatmap-summary li{color:${c.textMed}!important}
      .embedded-summary-footer{
        background:${isHC ? "#111" : c.cardBg}!important;
        border-color:${c.borderColor}!important;
      }
      .embedded-summary-footer p{color:${c.textMed}!important}

      /* ── Bottom site footer ── */
      .bottom-site-footer{
        background:${c.navBg}!important;
        background-image:none!important;
      }
      .bottom-site-footer *{color:${isHC ? "#FFFF00" : "#fff"}!important}

      /* ── Link card button ── */
      .link-card-button{background:${c.primary}!important;color:${isHC ? "#000" : "#fff"}!important}
      .link-card-icon{background:${isHC ? "#222" : c.cardBg}!important;color:${c.primary}!important}
      .premium-link-card h3,.premium-link-card p{color:${c.textDark}!important}

      /* ── Charts / SVG ── */
      svg{background-color:${isHC ? "#000" : "transparent"}!important}
      .tick text,.axis text,svg text{fill:${c.textDark}!important}
      .axis line,.axis path{stroke:${c.borderColor}!important}
      .grid line{stroke:${c.borderColor}!important}
      .chart-title-label{fill:${c.textDark}!important}
    `;
    document.head.appendChild(css);
    recolorD3(c);
  }

  const origAttrs = new WeakMap();
  function saveOrig(el, attrs) { if (!origAttrs.has(el)) { const saved = {}; attrs.forEach(a => saved[a] = el.getAttribute(a)); origAttrs.set(el, saved); } }
  function restoreOrig(el, attrs) { const saved = origAttrs.get(el); if (!saved) return; attrs.forEach(a => { if (saved[a] === null) el.removeAttribute(a); else el.setAttribute(a, saved[a]); }); }

  // Maps the 8 D2 jurisdictions (in their render order) to series palette slots.
  // D2_JURISDICTION_ORDER = ["VIC","NSW","QLD","WA","SA","ACT","TAS","NT"]
  const JURISDICTION_ORDER = ["VIC", "NSW", "QLD", "WA", "SA", "ACT", "TAS", "NT"];

  function recolorD3(c) {
    const s = c.series;

    // ── D1: single-series charts (line, lollipop) — use s[0] ──────────────
    document.querySelectorAll("line.stem").forEach(el => {
      saveOrig(el, ["stroke"]); el.setAttribute("stroke", s[0]);
    });
    document.querySelectorAll("circle.lollipop-head, circle.lollipop-dot, circle.line-point").forEach(el => {
      saveOrig(el, ["fill"]); el.setAttribute("fill", s[0]);
    });
    document.querySelectorAll("path.trend-line").forEach(el => {
      saveOrig(el, ["stroke"]); el.setAttribute("stroke", s[0]);
    });

    // ── D2: grouped bar — fines = s[0], tests = s[1] ──────────────────────
    document.querySelectorAll("rect.d2-bar-fines").forEach(el => {
      saveOrig(el, ["fill"]); el.setAttribute("fill", s[0]);
    });
    document.querySelectorAll("rect.d2-bar-tests").forEach(el => {
      saveOrig(el, ["fill"]); el.setAttribute("fill", s[1]);
    });

    // ── D2: area chart — each path/line carries data-jurisdiction ──────────
    document.querySelectorAll("path.d2-area").forEach(el => {
      saveOrig(el, ["fill"]);
      const jur = el.getAttribute("data-jurisdiction");
      const idx = jur ? JURISDICTION_ORDER.indexOf(jur) : -1;
      el.setAttribute("fill", s[idx >= 0 ? idx % s.length : 0]);
    });
    document.querySelectorAll("path.d2-area-line").forEach(el => {
      saveOrig(el, ["stroke"]);
      const jur = el.getAttribute("data-jurisdiction");
      const idx = jur ? JURISDICTION_ORDER.indexOf(jur) : -1;
      el.setAttribute("stroke", s[idx >= 0 ? idx % s.length : 0]);
    });

    // ── D2: hover points ───────────────────────────────────────────────────
    document.querySelectorAll("circle.area-hover-point").forEach(el => {
      saveOrig(el, ["fill"]);
      const jur = el.getAttribute("data-jurisdiction");
      const idx = jur ? JURISDICTION_ORDER.indexOf(jur) : -1;
      el.setAttribute("data-a11y-color", s[idx >= 0 ? idx % s.length : 0]);
    });

    // ── Chart legends ─────────────────────────────────────────────────────
    // Grouped bar legend: fines swatch = s[0], tests swatch = s[1]
    document.querySelectorAll("g.d2-bar-legend").forEach(legendG => {
      const items = legendG.querySelectorAll("g");
      const keys = ["fines", "tests"];
      items.forEach((item, i) => {
        const rect = item.querySelector("rect");
        const txt  = item.querySelector("text");
        if (rect) { saveOrig(rect, ["fill"]); rect.setAttribute("fill", s[i] || s[0]); }
        if (txt)  { saveOrig(txt,  ["fill"]); txt.setAttribute("fill", c.textDark); }
      });
    });

    // Area chart legend: each item maps to a jurisdiction by index
    document.querySelectorAll("g.d2-area-legend").forEach(legendG => {
      legendG.querySelectorAll("g").forEach((item, i) => {
        const rect = item.querySelector("rect");
        const txt  = item.querySelector("text");
        if (rect) { saveOrig(rect, ["fill"]); rect.setAttribute("fill", s[i % s.length]); }
        if (txt)  { saveOrig(txt,  ["fill"]); txt.setAttribute("fill", c.textDark); }
      });
    });
    // This matches best-practice: one-hue scale avoids hue confusion entirely.
    const lowColor  = c.heatmapLow  || s[s.length - 1];
    const highColor = c.heatmapHigh || s[0];

    // Build a D3 interpolator between the two palette endpoints
    const interpolateHeatmap = d3.interpolateRgb(lowColor, highColor);

    const activeCells = Array.from(document.querySelectorAll("rect.heatmap-cell")).filter(el => {
      const f = el.getAttribute("fill");
      return f && f !== "#E5E7EB" && f !== "none" && !f.startsWith("url");
    });
    if (activeCells.length) {
      const vals = activeCells.map((el, i) => parseFloat(el.getAttribute("data-value") || i));
      const minV = Math.min(...vals);
      const maxV = Math.max(...vals);
      const range = maxV - minV || 1;
      activeCells.forEach((el, i) => {
        saveOrig(el, ["fill"]);
        const v = parseFloat(el.getAttribute("data-value") || i);
        el.setAttribute("fill", interpolateHeatmap((v - minV) / range));
      });
    }

    // ── Heatmap legend gradient stops ─────────────────────────────────────
    // Update every SVG linearGradient that backs a heatmap legend bar.
    [
      { gradId: "speeding-heatmap-gradient" },
      { gradId: "d2-heatmap-gradient" }
    ].forEach(({ gradId }) => {
      const grad = document.getElementById(gradId);
      if (!grad) return;
      const stops = grad.querySelectorAll("stop");
      if (stops[0]) stops[0].setAttribute("stop-color", lowColor);
      if (stops[1]) stops[1].setAttribute("stop-color", highColor);
    });
  }

  function resetD3Colors() {
    const selectors = [
      ["line.stem", ["stroke"]], ["circle.lollipop-head", ["fill"]], ["circle.lollipop-dot", ["fill"]], ["circle.line-point", ["fill"]], ["circle.area-hover-point", ["fill"]],
      ["rect.d2-bar-fines", ["fill"]], ["rect.d2-bar-tests", ["fill"]], ["path.trend-line", ["stroke"]], ["path.d2-area-line", ["stroke"]], ["path.d2-area", ["fill"]], ["rect.heatmap-cell", ["fill"]]
    ];
    selectors.forEach(([sel, attrs]) => document.querySelectorAll(sel).forEach(el => restoreOrig(el, attrs)));

    // Restore legend swatch and label colours
    document.querySelectorAll("g.d2-bar-legend g rect, g.d2-area-legend g rect").forEach(el => restoreOrig(el, ["fill"]));
    document.querySelectorAll("g.d2-bar-legend g text, g.d2-area-legend g text").forEach(el => restoreOrig(el, ["fill"]));

    // Restore heatmap legend gradient stops to original orange scale
    const origLow  = d3.interpolateOranges(0);
    const origHigh = d3.interpolateOranges(1);
    [
      { gradId: "speeding-heatmap-gradient" },
      { gradId: "d2-heatmap-gradient" }
    ].forEach(({ gradId }) => {
      const grad = document.getElementById(gradId);
      if (!grad) return;
      const stops = grad.querySelectorAll("stop");
      if (stops[0]) stops[0].setAttribute("stop-color", origLow);
      if (stops[1]) stops[1].setAttribute("stop-color", origHigh);
    });
  }

  new MutationObserver(() => {
    if (currentPaletteId === "default") return;
    clearTimeout(window._a11yT);
    window._a11yT = setTimeout(() => { const pal = PALETTES.find(p => p.id === currentPaletteId); if (pal && pal.colors) recolorD3(pal.colors); }, 950);
  }).observe(document.getElementById("content-container") || document.body, { childList: true, subtree: true });

  setZoom(currentZoom);
  if (currentPaletteId !== "default") applyPalette(currentPaletteId);
})();