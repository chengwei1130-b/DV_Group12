// ─────────────────────────────────────────────────────────────────────────────
// js/d2_tooltips.js - Tooltip Engine (Dashboard 2)
// ─────────────────────────────────────────────────────────────────────────────

// Automatically inject CSS to fix positioning and prevent text from blocking hovers
if (!document.getElementById("d2-tooltip-css-fixes")) {
  document.head.insertAdjacentHTML("beforeend", `<style id="d2-tooltip-css-fixes">
    .d2-bar-legend text, .cell-label { pointer-events: none !important; }
    .global-chart-tooltip { 
      position: absolute !important; 
      z-index: 999999 !important; 
      pointer-events: none !important; 
      transform: none !important; /* CRITICAL FIX: Stops CSS from moving the tooltip */
      margin: 0 !important;
    }
  </style>`);
}

function d2GetTooltip() {
  let tooltip = d3.select("#globalChartTooltip");
  if (tooltip.empty()) {
    tooltip = d3.select("body").append("div")
      .attr("id", "globalChartTooltip")
      .attr("class", "global-chart-tooltip chart-tooltip");
  }
  return tooltip;
}

// 1. Chart Tooltip (Snaps to data points)
function d2ShowTooltipPinned(event, html, isInfo = false) {
  const tooltip = d2GetTooltip();
  tooltip.classed("info-tooltip", isInfo).style("display", "block").style("opacity", 1).html(html);

  const target = event.currentTarget;
  if (target) {
    const rect = target.getBoundingClientRect();
    const ttWidth = tooltip.node().offsetWidth;
    const ttHeight = tooltip.node().offsetHeight;

    const GAP_Y = 10; // Pixels ABOVE the data point

    let x = rect.left + window.scrollX + (rect.width / 2) - (ttWidth / 2);
    let y = rect.top + window.scrollY - ttHeight - GAP_Y;

    if (x < 10) x = 10;
    else if (x + ttWidth > document.documentElement.clientWidth - 10) x = document.documentElement.clientWidth - ttWidth - 10;
    if (y < window.scrollY + 10) y = rect.bottom + window.scrollY + GAP_Y;

    tooltip.style("left", `${x}px`).style("top", `${y}px`);
  }
}

function d2HideTooltip() {
  d2GetTooltip().style("opacity", 0).style("display", "none");
}

// 2. Info button now opens the expand modal (see js/chart_expand.js) instead
// of showing a hover tooltip: clicking it shows an enlarged chart on the
// left and the chart's details/explanation on the right.
function initD2InfoTooltips() {
  if (typeof initChartExpandButtons === "function") initChartExpandButtons("#drug-dashboard");
}