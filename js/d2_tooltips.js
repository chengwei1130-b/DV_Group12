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

// 2. Info Button Tooltip (Custom logic to prevent left-shifting)
function d2ShowInfoTooltip(button, html) {
  const tooltip = d2GetTooltip();
  tooltip.classed("info-tooltip", true).style("display", "block").style("opacity", 1).html(html);

  const rect = button.getBoundingClientRect();
  const ttWidth = tooltip.node().offsetWidth;
  const ttHeight = tooltip.node().offsetHeight;

  // Start by trying to center the tooltip perfectly over the button
  let x = rect.left + window.scrollX + (rect.width / 2) - (ttWidth / 2);
  
  // Set position to be 8px above the button (moves it down closer to the button)
  let y = rect.top + window.scrollY - ttHeight - 16;

  // SMART EDGE FIX: If the button is on the far right, aligning to center pushes it off screen.
  // Instead of shoving it far left, we simply align the right edge of the tooltip to the right edge of the button!
  if (x + ttWidth > window.innerWidth + window.scrollX - 20) {
    x = rect.right + window.scrollX - ttWidth;
  }

  // Final safety checks
  if (x < 10) x = 10;
  if (y < window.scrollY + 10) y = rect.bottom + window.scrollY + 8; // Flip below if it hits top of monitor

  tooltip.style("left", `${x}px`).style("top", `${y}px`);
}

function d2HideTooltip() {
  d2GetTooltip().style("opacity", 0).style("display", "none");
}

function initD2InfoTooltips() {
  d3.selectAll("#drug-dashboard .info-dot")
    .attr("tabindex", 0)
    .on("mouseenter focus", function () {
      d2ShowInfoTooltip(this, d3.select(this).attr("data-info"));
    })
    .on("mouseleave blur", d2HideTooltip);
}