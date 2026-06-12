(function () {
  if (!window.html2canvas) {
    const h2c = document.createElement("script");
    h2c.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    document.head.appendChild(h2c);
  }

  const PALETTES = [
    {
      id: "default",
      label: "Default",
      description: "Original colors",
      preview: ["#F7931E", "#FFD84D", "#F3F4F6"],
      cssFilter: "",
      colors: null
    },
    {
      id: "deuteranopia",
      label: "Deuteranopia",
      description: "Red-green (green weak)",
      preview: ["#0072B2", "#E69F00", "#F0E442"],
      cssFilter: "",
      colors: {
        primary: "#0072B2",
        navBg: "#005B99",
        pageBg: "#EEF3FA",
        cardBg: "#DDEEFF",
        labelBg: "#0072B2",
        labelColor: "#fff",
        hoverBg: "#0072B2",
        hoverColor: "#fff",
        textDark: "#111",
        textMed: "#333",
        borderColor: "#0072B2",
        series: ["#0072B2", "#E69F00", "#F0E442", "#009E73", "#56B4E9", "#CC79A7", "#D55E00", "#4B4B4B"]
      }
    },
    {
      id: "protanopia",
      label: "Protanopia",
      description: "Red-green (red weak)",
      preview: ["#0077BB", "#EE7733", "#FFDD44"],
      cssFilter: "",
      colors: {
        primary: "#0077BB",
        navBg: "#005A8E",
        pageBg: "#EEF3FA",
        cardBg: "#DDEEFF",
        labelBg: "#0077BB",
        labelColor: "#fff",
        hoverBg: "#0077BB",
        hoverColor: "#fff",
        textDark: "#111",
        textMed: "#333",
        borderColor: "#0077BB",
        series: ["#0077BB", "#EE7733", "#FFDD44", "#33BBEE", "#009988", "#EE3377", "#AA4499", "#BBBBBB"]
      }
    },
    {
      id: "tritanopia",
      label: "Tritanopia",
      description: "Blue-yellow blind",
      preview: ["#EE3377", "#009988", "#FFAA00"],
      cssFilter: "",
      colors: {
        primary: "#EE3377",
        navBg: "#CC1155",
        pageBg: "#FFF0F4",
        cardBg: "#FFE0EA",
        labelBg: "#EE3377",
        labelColor: "#fff",
        hoverBg: "#EE3377",
        hoverColor: "#fff",
        textDark: "#111",
        textMed: "#333",
        borderColor: "#EE3377",
        series: ["#EE3377", "#009988", "#FFAA00", "#CC3311", "#33BBEE", "#AA3377", "#004488", "#777777"]
      }
    },
    {
      id: "achromatopsia",
      label: "Achromatopsia",
      description: "Full color blindness",
      preview: ["#222", "#777", "#CCC"],
      cssFilter: "grayscale(100%) contrast(1.1)",
      colors: null
    },
    {
      id: "highcontrast",
      label: "High Contrast",
      description: "Maximum visibility",
      preview: ["#FFFF00", "#000", "#00FFFF"],
      cssFilter: "",
      colors: {
        primary: "#FFFF00",
        navBg: "#000",
        pageBg: "#000",
        cardBg: "#111",
        labelBg: "#FFFF00",
        labelColor: "#000",
        hoverBg: "#FFFF00",
        hoverColor: "#000",
        textDark: "#FFF",
        textMed: "#DDD",
        borderColor: "#FFFF00",
        series: ["#FFFF00", "#00FFFF", "#FF88FF", "#FFF", "#FF8800", "#00FF88", "#88FFFF", "#FF4444"]
      }
    }
  ];

  let currentPaletteId = localStorage.getItem("a11y_palette") || "default";
  let currentZoom = parseFloat(localStorage.getItem("a11y_zoom") || "1.0");
  let magnifierOn = false;
  let panelOpen = false;
  let magHandler = null;

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
    #a11y-lens{position:fixed;width:190px;height:190px;border-radius:50%;border:3px solid #F7931E;box-shadow:0 6px 28px rgba(0,0,0,.45),inset 0 0 0 2px rgba(255,255,255,.3);pointer-events:none;z-index:99999;overflow:hidden;display:none;background:#fff}
    #a11y-lens::after{content:'';position:absolute;inset:0;border-radius:50%;z-index:10;background:radial-gradient(ellipse at 32% 30%,rgba(255,255,255,.28) 0%,rgba(255,255,255,.05) 45%,transparent 65%);pointer-events:none}
    .a11y-mag svg,.a11y-mag svg *{pointer-events:none!important}
    #a11y-lens-inner{position:absolute;top:0;left:0;transform-origin:top left;pointer-events:none}
    body.a11y-mag #a11y-fab,body.a11y-mag #a11y-fab *{cursor:pointer!important}
    body.a11y-mag *:not(#a11y-fab):not(#a11y-fab *):not(#a11y-lens):not(#a11y-lens *){pointer-events:none!important}
    body.a11y-mag .chart-tooltip{opacity:0!important;display:none!important;pointer-events:none!important}
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

  const lens = document.createElement("div");
  lens.id = "a11y-lens";
  lens.innerHTML = `<div id="a11y-lens-inner"></div>`;
  document.body.appendChild(lens);

  const lensInner = document.getElementById("a11y-lens-inner");
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
      <div style="flex:1;min-width:0">
        <span class="a11y-pn">${p.label}</span>
        <span class="a11y-pd">${p.description}</span>
      </div>`;
    b.addEventListener("click", () => applyPalette(p.id));
    palsCont.appendChild(b);
  });

  openBtn.addEventListener("click", () => {
    panelOpen = !panelOpen;
    panel.classList.toggle("show", panelOpen);
    openBtn.classList.toggle("open", panelOpen);
    openBtn.innerHTML = panelOpen ? "✕" : "⚙";
    openBtn.setAttribute("aria-expanded", panelOpen);
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

    if (magnifierOn) {
      scheduleMagnifierCapture(120);
    }
  }

  document.getElementById("a11y-zi").addEventListener("click", () => setZoom(currentZoom + 0.1));
  document.getElementById("a11y-zo").addEventListener("click", () => setZoom(currentZoom - 0.1));
  document.getElementById("a11y-zrst").addEventListener("click", () => setZoom(1.0));

  const LSIZE = 190;
  const LHALF = LSIZE / 2;
  const MAG = 2.8;

  let magCanvas = null;
  let lastCapture = 0;
  let capturing = false;

  // Performance patch: move the lens with requestAnimationFrame and avoid
  // expensive html2canvas captures on every mousemove.
  let magFrame = null;
  let magRecaptureTimer = null;
  let magPeriodicRefresh = null;
  let magZoneCaptureTimer = null;
  let magScrollHandler = null;
  let magCurrentZone = "";
  let magMouseX = 0;
  let magMouseY = 0;
  let magOverFab = false;
  let lastMouseMove = 0;
  let lastCaptureRequest = 0;

  function hideChartTooltips() {
    document.querySelectorAll(".chart-tooltip").forEach(el => {
      el.style.opacity = "0";
      el.style.display = "none";
    });
  }

  function enableChartTooltipsAgain() {
    document.querySelectorAll(".chart-tooltip").forEach(el => {
      el.style.display = "";
      el.style.opacity = "0";
    });
  }

  function getMagnifierZone(x, y) {
    const zones = document.querySelectorAll(
      ".story-chart-card, .chart-grid, .filter-panel, .kpi-grid, .story-summary, .data-note, .home-showcase-grid, .about-us-content, .mission-panel"
    );

    for (let i = 0; i < zones.length; i++) {
      const rect = zones[i].getBoundingClientRect();

      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        const heading = zones[i].querySelector("h1, h2, h3");
        return zones[i].id || (heading ? heading.textContent.trim() : zones[i].className + "-" + i);
      }
    }

    // Fallback zone changes when the viewport scrolls to a new screen area.
    return "viewport-" + Math.round(window.scrollY / Math.max(1, window.innerHeight / 2));
  }

  function scheduleZoneCapture(delay = 110) {
    if (!magnifierOn || !magCanvas) return;

    clearTimeout(magZoneCaptureTimer);
    magZoneCaptureTimer = setTimeout(() => {
      if (magnifierOn && magCanvas && !capturing) {
        scheduleMagnifierCapture(0, true);
      }
    }, delay);
  }

  function scheduleScrollCapture() {
    if (!magnifierOn || !magCanvas) return;

    clearTimeout(magRecaptureTimer);
    magRecaptureTimer = setTimeout(() => {
      if (magnifierOn && magCanvas && !capturing) {
        magCurrentZone = getMagnifierZone(magMouseX, magMouseY);
        scheduleMagnifierCapture(0, true);
      }
    }, 160);
  }


  async function captureToCanvas(canvas) {
    if (capturing) return;

    capturing = true;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    try {
      if (window.html2canvas) {
        const c = await window.html2canvas(document.body, {
          x: window.scrollX,
          y: window.scrollY,
          width: vw,
          height: vh,
          scale: 1,
          useCORS: true,
          logging: false,
          ignoreElements: el => el.id === "a11y-lens" || el.id === "a11y-fab"
        });

        canvas.width = vw;
        canvas.height = vh;
        canvas.getContext("2d").drawImage(c, 0, 0);
      } else {
        canvas.width = vw;
        canvas.height = vh;

        const ctx = canvas.getContext("2d");
        ctx.fillStyle = getComputedStyle(document.body).backgroundColor || "#fff";
        ctx.fillRect(0, 0, vw, vh);

        const svgs = document.querySelectorAll("svg");

        for (const svg of svgs) {
          const r = svg.getBoundingClientRect();

          if (r.width < 1 || r.bottom < 0 || r.top > vh) continue;

          try {
            const clone = svg.cloneNode(true);
            clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
            clone.setAttribute("width", r.width);
            clone.setAttribute("height", r.height);

            const xml = new XMLSerializer().serializeToString(clone);
            const blob = new Blob([xml], { type: "image/svg+xml" });
            const url = URL.createObjectURL(blob);

            await new Promise(res => {
              const img = new Image();

              img.onload = () => {
                ctx.drawImage(img, Math.round(r.left), Math.round(r.top), r.width, r.height);
                URL.revokeObjectURL(url);
                res();
              };

              img.onerror = () => {
                URL.revokeObjectURL(url);
                res();
              };

              img.src = url;
            });
          } catch (e) {}
        }
      }
    } catch (e) {}

    capturing = false;
    lastCapture = Date.now();

    // Keep the lens aligned with the fresh screenshot immediately after recapture.
    requestMagnifierPositionUpdate();
  }

  function scheduleMagnifierCapture(delay = 180, force = false) {
    if (!magnifierOn || !magCanvas) return;

    // Event listeners pass an Event object as the first argument.
    // Convert that case back into a safe numeric delay.
    if (typeof delay !== "number") delay = 180;

    const now = Date.now();

    // html2canvas is expensive, so refresh the cached screenshot at a controlled pace.
    // This keeps the lens accurate without re-capturing on every mouse movement.
    if (!force && (capturing || now - lastCapture < 1200 || now - lastCaptureRequest < 360)) return;

    if (capturing) return;

    lastCaptureRequest = now;
    clearTimeout(magRecaptureTimer);

    magRecaptureTimer = setTimeout(() => {
      if (magnifierOn && magCanvas) captureToCanvas(magCanvas);
    }, delay);
  }

  function renderMagnifierPosition() {
    magFrame = null;

    if (!magnifierOn || !magCanvas) return;

    if (magOverFab) {
      lens.style.display = "none";
      return;
    }

    lens.style.display = "block";

    // transform is smoother than constantly changing left/top during mousemove.
    lens.style.transform = "translate(" + (magMouseX - LHALF) + "px," + (magMouseY - LHALF) + "px)";

    const tx = LHALF - magMouseX * MAG;
    const ty = LHALF - magMouseY * MAG;
    magCanvas.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + MAG + ")";
  }

  function requestMagnifierPositionUpdate() {
    if (!magFrame) {
      magFrame = requestAnimationFrame(renderMagnifierPosition);
    }
  }

  function startMag() {
    lens.style.display = "block";
    lens.style.left = "0";
    lens.style.top = "0";
    lens.style.transform = "translate(-9999px,-9999px)";
    document.body.classList.add("a11y-mag");
    hideChartTooltips();

    magCanvas = document.createElement("canvas");

    Object.assign(magCanvas.style, {
      position: "absolute",
      top: "0",
      left: "0",
      transformOrigin: "0 0",
      pointerEvents: "none",
      willChange: "transform"
    });

    lensInner.innerHTML = "";
    lensInner.appendChild(magCanvas);

    // Capture once when the magnifier is enabled.
    // Later refreshes are throttled so the lens stays accurate without heavy lag.
    magCurrentZone = getMagnifierZone(magMouseX, magMouseY);
    captureToCanvas(magCanvas);

    magPeriodicRefresh = setInterval(() => {
      const mouseIsIdle = Date.now() - lastMouseMove > 900;
      const captureIsOld = Date.now() - lastCapture > 1800;

      // Refresh only while idle. This avoids visible stutter while hovering charts.
      if (magnifierOn && magCanvas && mouseIsIdle && captureIsOld && !capturing) {
        scheduleMagnifierCapture(0, true);
      }
    }, 900);

    magHandler = function(e) {
      magMouseX = e.clientX;
      magMouseY = e.clientY;
      magOverFab = fab.contains(e.target);
      lastMouseMove = Date.now();

      requestMagnifierPositionUpdate();

      const nextZone = getMagnifierZone(magMouseX, magMouseY);

      // If the cursor enters a different chart/card area, refresh once.
      // This fixes stale lens content, such as still seeing the line chart on the heatmap.
      if (nextZone !== magCurrentZone) {
        magCurrentZone = nextZone;

        if (Date.now() - lastCapture > 360) {
          scheduleZoneCapture(110);
        }
      }

      // Do not run html2canvas continuously while the mouse is actively moving.
      // Movement stays smooth; the screenshot refresh happens after the cursor pauses.
      clearTimeout(magRecaptureTimer);
      magRecaptureTimer = setTimeout(() => {
        if (magnifierOn && magCanvas && Date.now() - lastMouseMove >= 420) {
          scheduleMagnifierCapture(0, true);
        }
      }, 520);
    };

    magScrollHandler = scheduleScrollCapture;

    document.addEventListener("mousemove", magHandler, { passive: true });
    window.addEventListener("scroll", magScrollHandler, { passive: true });
    window.addEventListener("resize", magScrollHandler);
  }

  function stopMag() {
    lens.style.display = "none";
    lens.style.transform = "translate(-9999px,-9999px)";
    lensInner.innerHTML = "";
    magCanvas = null;
    document.body.classList.remove("a11y-mag");

    hideChartTooltips();

    setTimeout(() => {
      enableChartTooltipsAgain();
    }, 80);

    clearTimeout(magRecaptureTimer);
    magRecaptureTimer = null;

    clearTimeout(magZoneCaptureTimer);
    magZoneCaptureTimer = null;

    clearInterval(magPeriodicRefresh);
    magPeriodicRefresh = null;

    magCurrentZone = "";

    if (magFrame) {
      cancelAnimationFrame(magFrame);
      magFrame = null;
    }

    if (magHandler) {
      document.removeEventListener("mousemove", magHandler);

      if (magScrollHandler) {
        window.removeEventListener("scroll", magScrollHandler);
        window.removeEventListener("resize", magScrollHandler);
        magScrollHandler = null;
      }

      magHandler = null;
    }
  }

  magBtn.addEventListener("click", () => {
    magnifierOn = !magnifierOn;

    magBtn.classList.toggle("on", magnifierOn);
    magBtn.querySelector(".mb").textContent = magnifierOn ? "ON" : "OFF";
    magBtn.setAttribute("aria-pressed", magnifierOn);

    if (magnifierOn) {
      startMag();
    } else {
      stopMag();
    }
  });

  function applyPalette(id) {
    const pal = PALETTES.find(p => p.id === id);

    if (!pal) return;

    currentPaletteId = id;
    localStorage.setItem("a11y_palette", id);

    document.querySelectorAll(".a11y-pb").forEach(b => {
      b.classList.toggle("sel", b.dataset.pid === id);
    });

    const old = document.getElementById("a11y-pcss");

    if (old) old.remove();

    document.documentElement.style.filter = "";

    if (id === "default") {
      resetD3Colors();
      return;
    }

    if (pal.cssFilter) {
      document.documentElement.style.filter = pal.cssFilter;
    }

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

  function saveOrig(el, attrs) {
    if (!origAttrs.has(el)) {
      const saved = {};

      attrs.forEach(a => {
        saved[a] = el.getAttribute(a);
      });

      origAttrs.set(el, saved);
    }
  }

  function restoreOrig(el, attrs) {
    const saved = origAttrs.get(el);

    if (!saved) return;

    attrs.forEach(a => {
      if (saved[a] === null) {
        el.removeAttribute(a);
      } else {
        el.setAttribute(a, saved[a]);
      }
    });
  }

  function recolorD3(c) {
    const s = c.series;

    document.querySelectorAll("line.stem").forEach(el => {
      saveOrig(el, ["stroke"]);
      el.setAttribute("stroke", s[0]);
    });

    document.querySelectorAll("circle.lollipop-head").forEach(el => {
      saveOrig(el, ["fill"]);
      el.setAttribute("fill", s[0]);
    });

    document.querySelectorAll("rect.bar").forEach((el, i) => {
      saveOrig(el, ["fill"]);
      el.setAttribute("fill", s[i % s.length]);
    });

    document.querySelectorAll("path.line").forEach(el => {
      saveOrig(el, ["stroke"]);
      el.setAttribute("stroke", s[0]);
    });

    document.querySelectorAll("path.area").forEach(el => {
      saveOrig(el, ["fill", "fill-opacity"]);
      el.setAttribute("fill", s[0]);
      el.setAttribute("fill-opacity", "0.15");
    });

    document.querySelectorAll("circle.dot").forEach(el => {
      saveOrig(el, ["fill"]);
      el.setAttribute("fill", s[0]);
    });

    document.querySelectorAll("path.slice").forEach((el, i) => {
      saveOrig(el, ["fill"]);
      el.setAttribute("fill", s[i % s.length]);
    });

    document.querySelectorAll("rect.heatmap-cell").forEach(el => {
      const f = el.getAttribute("fill");

      if (f && f !== "#E5E7EB" && f !== "none" && !f.startsWith("url")) {
        saveOrig(el, ["fill"]);
        el.setAttribute("fill", s[0] + "CC");
      }
    });

    document.querySelectorAll("g.legend rect, g rect[fill]").forEach((el, i) => {
      const f = el.getAttribute("fill");

      if (f && f !== "#F3F4F6" && !f.startsWith("url") && f !== "none" && !f.startsWith("#E5")) {
        saveOrig(el, ["fill"]);
        el.setAttribute("fill", s[i % s.length]);
      }
    });
  }

  function resetD3Colors() {
    const selectors = [
      ["line.stem", ["stroke"]],
      ["circle.lollipop-head", ["fill"]],
      ["rect.bar", ["fill"]],
      ["path.line", ["stroke"]],
      ["path.area", ["fill", "fill-opacity"]],
      ["circle.dot", ["fill"]],
      ["path.slice", ["fill"]],
      ["rect.heatmap-cell", ["fill"]],
      ["g.legend rect, g rect[fill]", ["fill"]]
    ];

    selectors.forEach(([sel, attrs]) => {
      document.querySelectorAll(sel).forEach(el => restoreOrig(el, attrs));
    });
  }

  new MutationObserver(() => {
    if (currentPaletteId === "default") return;

    clearTimeout(window._a11yT);

    window._a11yT = setTimeout(() => {
      const pal = PALETTES.find(p => p.id === currentPaletteId);

      if (pal && pal.colors) {
        recolorD3(pal.colors);
      }
    }, 950);
  }).observe(document.getElementById("content-container") || document.body, {
    childList: true,
    subtree: true
  });

  setZoom(currentZoom);

  if (currentPaletteId !== "default") {
    applyPalette(currentPaletteId);
  }
})();