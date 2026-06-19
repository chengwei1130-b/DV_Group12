// ─────────────────────────────────────────────────────────────────────────────
// js/chart_expand.js - Chart Expand Modal
// Replaces the old hover-only "info" tooltip on each chart's circular button
// with a click-to-expand modal: left side shows an enlarged copy of the
// chart, right side shows the chart's title, description, explanation and
// key insight. Works for both Dashboard 1 and Dashboard 2 chart cards.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  if (window.openChartExpand) return; // already initialised (script only meant to load once)

  document.head.insertAdjacentHTML("beforeend", `<style id="chart-expand-css">
    body.chart-expand-no-scroll { overflow: hidden; }

    .chart-expand-overlay {
      position: fixed; inset: 0; z-index: 20000;
      background: rgba(17, 24, 39, 0.72);
      display: none; align-items: center; justify-content: center;
      padding: 14px;
    }
    .chart-expand-overlay.open { display: flex; }

    .chart-expand-chart-wrap {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .chart-expand-modal {
      position: relative;
      background: #fff;
      border-radius: 22px;
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
      width: 96vw;
      max-width: 1800px;
      height: 92vh;
      max-height: 92vh;
      display: grid;
      grid-template-columns: 70% 30%;
      overflow: hidden;
    }

    .chart-expand-close {
      position: absolute; top: 14px; right: 14px; z-index: 5;
      width: 38px; height: 38px; border-radius: 50%;
      border: 1px solid rgba(23, 32, 51, 0.18);
      background: #fff; color: #111827;
      font-size: 20px; line-height: 1; cursor: pointer;
      display: grid; place-items: center;
      transition: background .15s ease, color .15s ease, transform .15s ease;
    }
    .chart-expand-close:hover, .chart-expand-close:focus-visible {
      background: #fff3e0; color: #F1622B; transform: translateY(-1px); outline: none;
    }

    .chart-expand-left {
      padding: 36px;
      display: flex; align-items: center; justify-content: center;
      background: #FBFAF8;
      overflow: auto;
      height: 100%;
      box-sizing: border-box;
    }
    .chart-expand-left svg {
      width: 100%; height: 100%; max-height: 100%; display: block;
    }

    .chart-expand-right {
      padding: 36px 32px;
      overflow-y: auto;
      border-left: 1px solid rgba(23, 32, 51, 0.08);
      height: 100%;
      box-sizing: border-box;
    }
    .chart-expand-kicker {
      margin: 0 0 6px; font-size: 11px; font-weight: 800;
      letter-spacing: .08em; text-transform: uppercase; color: #F1622B;
    }
    .chart-expand-title { margin: 0 0 10px; font-size: 22px; line-height: 1.25; color: #111827; }
    .chart-expand-desc { margin: 0 0 24px; font-size: 14.5px; line-height: 1.6; color: #4B5563; }
    .chart-expand-section { margin-bottom: 22px; }
    .chart-expand-section h3 {
      margin: 0 0 8px; font-size: 12.5px; font-weight: 800;
      text-transform: uppercase; letter-spacing: .05em; color: #111827;
    }
    .chart-expand-section p { margin: 0; font-size: 14.5px; line-height: 1.6; color: #374151; }
    .chart-expand-insight {
      padding: 14px 16px; border-radius: 14px;
      background: #FFF7ED; border: 1px solid rgba(241, 98, 43, 0.25);
    }

    @media (max-width: 880px) {
      .chart-expand-modal { grid-template-columns: 1fr; grid-template-rows: 55% 45%; width: 94vw; height: 94vh; }
      .chart-expand-left { padding: 56px 16px 16px; }
      .chart-expand-right { border-left: none; border-top: 1px solid rgba(23, 32, 51, 0.08); }
    }
  </style>`);

  const overlay = document.createElement("div");
  overlay.id = "chartExpandOverlay";
  overlay.className = "chart-expand-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Expanded chart view");
  overlay.innerHTML = `
    <div class="chart-expand-modal">
      <button type="button" class="chart-expand-close" aria-label="Close expanded chart">×</button>
      <div class="chart-expand-left"><div class="chart-expand-chart-wrap"></div></div>
      <div class="chart-expand-right">
        <p class="chart-expand-kicker">Chart details</p>
        <h2 class="chart-expand-title"></h2>
        <p class="chart-expand-desc"></p>
        <div class="chart-expand-section">
          <h3>What this chart shows</h3>
          <p class="chart-expand-info"></p>
        </div>
        <div class="chart-expand-section chart-expand-insight">
          <h3>Key insight</h3>
          <p class="chart-expand-insight-text"></p>
        </div>
      </div>
    </div>`;
  document.documentElement.appendChild(overlay);

  const chartWrap = overlay.querySelector(".chart-expand-chart-wrap");
  const titleEl = overlay.querySelector(".chart-expand-title");
  const descEl = overlay.querySelector(".chart-expand-desc");
  const infoEl = overlay.querySelector(".chart-expand-info");
  const insightSection = overlay.querySelector(".chart-expand-insight");
  const insightEl = overlay.querySelector(".chart-expand-insight-text");
  const closeBtn = overlay.querySelector(".chart-expand-close");

  let lastFocused = null;

  function closeChartExpand() {
    overlay.classList.remove("open");
    chartWrap.innerHTML = "";
    document.body.classList.remove("chart-expand-no-scroll");
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  function openChartExpand(button) {
    const card = button.closest(".story-chart-card");
    if (!card) return;

    const heading = card.querySelector(".chart-heading h2");
    const desc = card.querySelector(".chart-heading p");
    const insight = card.querySelector(".insight-box p");
    const sourceChart = card.querySelector("svg");

    titleEl.textContent = heading ? heading.textContent.trim() : "Chart";
    descEl.textContent = desc ? desc.textContent.trim() : "";
    infoEl.textContent = button.getAttribute("data-info") || "";

    const insightText = insight ? insight.textContent.trim() : "";
    if (insightText && insightText !== "Loading insight...") {
      insightEl.textContent = insightText;
      insightSection.style.display = "";
    } else {
      insightSection.style.display = "none";
    }

    chartWrap.innerHTML = "";
    if (sourceChart) {
      const clone = sourceChart.cloneNode(true);
      clone.removeAttribute("width");
      clone.removeAttribute("height");
      clone.style.width = "100%";
      clone.style.height = "auto";
      clone.style.maxHeight = "72vh";
      clone.style.display = "block";
      chartWrap.appendChild(clone);
    }

    lastFocused = document.activeElement;
    overlay.classList.add("open");
    document.body.classList.add("chart-expand-no-scroll");
    closeBtn.focus();
  }

  overlay.addEventListener("click", e => {
    if (e.target === overlay) closeChartExpand();
  });
  closeBtn.addEventListener("click", closeChartExpand);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && overlay.classList.contains("open")) closeChartExpand();
  });

  // Turns every `.info-dot` button inside scopeSelector into an expand
  // trigger: swaps the "i" glyph for an expand icon and wires the click.
  // Safe to call repeatedly (e.g. every time a dashboard page re-renders).
  function initChartExpandButtons(scopeSelector) {
    document.querySelectorAll(`${scopeSelector} .info-dot`).forEach(btn => {
      if (!btn.dataset.expandBound) {
        btn.dataset.expandBound = "1";
        btn.addEventListener("click", () => openChartExpand(btn));
      }
      btn.classList.add("expand-dot");
      btn.textContent = "⤢";
      const baseLabel = (btn.getAttribute("aria-label") || "Chart").replace(/\s+information$/i, "");
      btn.setAttribute("aria-label", `Expand ${baseLabel}`);
      btn.title = "Click to view the expanded chart and details";
    });
  }

  window.openChartExpand = openChartExpand;
  window.closeChartExpand = closeChartExpand;
  window.initChartExpandButtons = initChartExpandButtons;
})();
