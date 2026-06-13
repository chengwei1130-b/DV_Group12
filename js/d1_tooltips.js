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

    let x = rect.left + window.scrollX + (rect.width / 2) - (ttWidth / 2);
    let y = rect.top + window.scrollY - ttHeight - GAP_Y;

    if (x < 10) x = 10;
    else if (x + ttWidth > document.documentElement.clientWidth - 10) x = document.documentElement.clientWidth - ttWidth - 10;
    if (y < window.scrollY + 10) y = rect.bottom + window.scrollY + GAP_Y;

    tooltip.style("left", `${x}px`).style("top", `${y}px`);
  }
}

// 2. Info Button Tooltip (Custom logic to prevent left-shifting)
function showInfoTooltip(button, html) {
  const tooltip = getTooltip();
  tooltip.classed("info-tooltip", true).style("display", "block").style("opacity", 1).html(html);

  const rect = button.getBoundingClientRect();
  const ttWidth = tooltip.node().offsetWidth;
  const ttHeight = tooltip.node().offsetHeight;

  // Start by trying to center the tooltip perfectly over the button
  let x = rect.left + window.scrollX + (rect.width / 2) - (ttWidth / 2);
  
  // Set position to be 8px above the button (moves it down closer to the button)
  let y = rect.top + window.scrollY - ttHeight - 8;

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

function hideTooltip() {
  getTooltip().style("opacity", 0).style("display", "none");
}

function initD1InfoTooltips() {
  d3.selectAll("#dashboard1 .info-dot")
    .attr("tabindex", 0)
    .on("mouseenter focus", function () {
      showInfoTooltip(this, d3.select(this).attr("data-info"));
    })
    .on("mouseleave blur", hideTooltip);
}