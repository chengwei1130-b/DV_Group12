// ─────────────────────────────────────────────────────────────────────────────
// js/d1_tooltips.js - Tooltip Engine (Dashboard 1)
// ─────────────────────────────────────────────────────────────────────────────

// Automatically inject CSS to fix positioning and prevent text from blocking hovers
if (!document.getElementById("d1-tooltip-css-fixes")) {
  document.head.insertAdjacentHTML("beforeend", `<style id="d1-tooltip-css-fixes">
    .cell-label, .line-label, .lollipop-label { pointer-events: none !important; }
    .global-chart-tooltip { 
      position: absolute !important; 
      z-index: 999999 !important; 
      pointer-events: none !important; 
      transform: none !important; /* CRITICAL FIX: Stops CSS from moving the tooltip */
      margin: 0 !important;
    }
  </style>`);
}

function getTooltip() {
  let tooltip = d3.select("#globalChartTooltip");
  if (tooltip.empty()) {
    tooltip = d3.select("body").append("div")
      .attr("id", "globalChartTooltip")
      .attr("class", "global-chart-tooltip chart-tooltip");
  }
  return tooltip;
}

// 1. Chart Tooltip (Snaps to data points)
function showTooltipPinned(event, html, isInfo = false) {
  const tooltip = getTooltip();
  tooltip.classed("info-tooltip", isInfo).style("display", "block").style("opacity", 1).html(html);

  const target = event.currentTarget;
  if (target) {
    const rect = target.getBoundingClientRect();
    const ttWidth = tooltip.node().offsetWidth;
    const ttHeight = tooltip.node().offsetHeight;


    const GAP_Y = 10; // Pixels ABOVE the data point
    // getBoundingClientRect() returns viewport pixels, but the tooltip lives
    // inside document.body which has CSS zoom applied by the accessibility
    // widget. position:absolute coordinates inside a zoomed element are in
    // the element's OWN (unzoomed) coordinate space, so we must divide by
    // the current zoom to map viewport px → body-local px.
    const zoom = parseFloat(document.body.style.zoom) || 1;

    let x = (rect.left + window.scrollX + (rect.width / 2) - (ttWidth / 2)) / zoom;
    let y = (rect.top + window.scrollY - ttHeight - GAP_Y) / zoom;

    if (x < 10 / zoom) x = 10 / zoom;
    else if (x + ttWidth > (document.documentElement.clientWidth - 10) / zoom) x = (document.documentElement.clientWidth - ttWidth - 10) / zoom;
    if (y < (window.scrollY + 10) / zoom) y = (rect.bottom + window.scrollY + GAP_Y) / zoom;


    tooltip.style("left", `${x}px`).style("top", `${y}px`);
  }
}

function hideTooltip() {
  getTooltip().style("opacity", 0).style("display", "none");
}

// 2. Info button now opens the expand modal (see js/chart_expand.js) instead
// of showing a hover tooltip: clicking it shows an enlarged chart on the
// left and the chart's details/explanation on the right.
function initD1InfoTooltips() {
  if (typeof initChartExpandButtons === "function") initChartExpandButtons("#dashboard1");
}