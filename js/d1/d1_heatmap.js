function ensureD1HeatmapContent(text) {
  const card = document.querySelector('#dashboard1 .heatmap-card');
  if (!card) return;

  const chartContainer = card.querySelector('#d1-heatmap-chart');
  let insightBox = card.querySelector(':scope > .insight-box') || card.querySelector('.insight-box');

  // Use the existing heatmap insight box from dashboard1.html. If it is missing,
  // create the same structure as a fallback so the content under the heatmap is always visible.
  if (!insightBox) {
    insightBox = document.createElement('div');
    insightBox.className = 'insight-box heatmap-inline-insight';
    insightBox.innerHTML = '<span aria-hidden="true">▦</span><p id="heatmapInsight"></p>';
  }

  insightBox.classList.add('heatmap-inline-insight');

  if (chartContainer && insightBox.previousElementSibling !== chartContainer) {
    chartContainer.insertAdjacentElement('afterend', insightBox);
  }

  const textTarget = insightBox.querySelector('p') || document.querySelector('#heatmapInsight');
  if (textTarget) textTarget.textContent = text;

  insightBox.style.display = 'flex';
  insightBox.style.visibility = 'visible';
  insightBox.style.opacity = '1';

  d3.selectAll('#heatmapInsight').text(text);
}

// ─────────────────────────────────────────────────────────────────────────────
// js/d1_heatmap.js
// ─────────────────────────────────────────────────────────────────────────────

function drawHeatmap(data, allData) {
  const dash = d3.select("#dashboard1");
  if (dash.empty()) return;

  let container = dash.select("#d1-heatmap-chart");
  if (container.empty()) {
    const card = dash.select(".heatmap-card").node();
    if (card) {
      card.querySelectorAll("#drug-outcome-chart, #heatmapChart, svg").forEach(el => el.remove());
      const newDiv = document.createElement("div");
      newDiv.id = "d1-heatmap-chart";
      newDiv.className = "fine-trend-heatmap-svg";
      const insightBox = card.querySelector(".insight-box");
      if (insightBox) card.insertBefore(newDiv, insightBox);
      else card.appendChild(newDiv);
      container = d3.select(newDiv);
    } else return;
  }

  container.selectAll("*").interrupt().remove();
  
  const startYear = +d3.select("#startYear").property("value");
  const endYear = +d3.select("#endYear").property("value");
  const selectedJurisdiction = d3.select("#jurisdictionSelect").property("value");

  const years = Array.from(new Set(allData.map(d => d.YEAR)))
    .filter(yr => yr >= Math.min(startYear, endYear) && yr <= Math.max(startYear, endYear))
    .sort((a, b) => a - b);

  const jurisdictions = selectedJurisdiction === "All"
    ? JURISDICTION_ORDER.filter(j => allData.some(d => d.JURISDICTION === j))
    : [selectedJurisdiction];

  if (!years.length || !jurisdictions.length) {
    const message = "No heatmap data available for the selected filters.";
    container.append("p").attr("class", "heatmap-empty").text(message);
    ensureD1HeatmapContent(message);
    // Keep the expanded-chart modal's data table in sync (see js/chart_expand.js).
    window.chartExpandTableData = window.chartExpandTableData || {};
    window.chartExpandTableData["d1-heatmap-chart"] = { columns: ["Year", "Jurisdiction", "Speeding Fines"], rows: [], rowKeys: [] };
    return;
  }

  const dataMap = new Map();
  data.forEach(row => dataMap.set(`${row.YEAR}-${row.JURISDICTION}`, row["Speeding Fines"]));

  const margin = { top: 54, right: 180, bottom: 62, left: 92 };
  const totalWidth = 1160;
  const totalHeight = Math.max(360, 96 + jurisdictions.length * 42);
  const innerWidth = totalWidth - margin.left - margin.right;
  const innerHeight = totalHeight - margin.top - margin.bottom;
  const cellWidth = innerWidth / years.length;
  const cellHeight = innerHeight / jurisdictions.length;

  const maxValue = d3.max(allData, d => d["Speeding Fines"]) || 1;
  const colorScale = d3.scaleSequential(d3.interpolateOranges).domain([0, maxValue]);

  const svg = container.append("svg").attr("class", "drug-outcome-style-heatmap").attr("width", totalWidth).attr("height", totalHeight).attr("viewBox", `0 0 ${totalWidth} ${totalHeight}`).attr("preserveAspectRatio", "xMidYMid meet");
  const inner = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const cells = years.flatMap((year, xi) => jurisdictions.map((jurisdiction, yi) => {
      const key = `${year}-${jurisdiction}`;
      const value = dataMap.has(key) ? dataMap.get(key) : null;
      return { year, jurisdiction, value, xi, yi, active: value !== null };
  }));

  // Feed the expanded-chart modal's right-hand data table (see js/chart_expand.js).
  window.chartExpandTableData = window.chartExpandTableData || {};
  window.chartExpandTableData["d1-heatmap-chart"] = {
      columns: ["Year", "Jurisdiction", "Speeding Fines"],
      rows: cells.map(d => [d.year, d.jurisdiction, d.active ? formatNumber(d.value) : "No record"]),
      rowKeys: cells.map(d => `cell-${d.year}-${d.jurisdiction}`)
    };

  // Builds the tooltip HTML for a cell. Also stamped onto each cell as a
  // `data-tooltip` attribute (below) so the expanded chart modal — which
  // clones this SVG and can't carry over D3 event listeners — can still
  // show working tooltips on hover. See js/chart_expand.js.
  const heatmapCellTipHtml = d => {
    const displayValue = d.active ? `${formatNumber(d.value)} (${formatMillions(d.value)})` : "No record";
    return `<strong>${d.jurisdiction} — ${d.year}</strong><br>Speeding fines: ${displayValue}`;
  };

  inner.selectAll(".heatmap-cell").data(cells, d => `${d.year}-${d.jurisdiction}`).join(
      enter => enter.append("rect").attr("class", "heatmap-cell")
        .attr("x", d => d.xi * cellWidth).attr("y", d => d.yi * cellHeight)
        .attr("width", Math.max(0, cellWidth - 3)).attr("height", Math.max(0, cellHeight - 3))
        .attr("rx", 8).style("cursor", "pointer").attr("fill", "#E5E7EB").attr("opacity", 0)
        .attr("data-value", d => d.active ? d.value : null)
        .attr("data-tooltip", heatmapCellTipHtml)
        .attr("data-key", d => `cell-${d.year}-${d.jurisdiction}`)
        .call(e => e.transition().duration(CHART_ANIMATION_DURATION).ease(chartEase).attr("fill", d => d.active ? colorScale(d.value) : "#E5E7EB").attr("opacity", 1)),
      update => update.attr("data-value", d => d.active ? d.value : null)
        .attr("data-tooltip", heatmapCellTipHtml)
        .attr("data-key", d => `cell-${d.year}-${d.jurisdiction}`)
        .call(u => u.transition().duration(CHART_ANIMATION_DURATION).ease(chartEase).attr("fill", d => d.active ? colorScale(d.value) : "#E5E7EB").attr("opacity", 1)),
      exit => exit.call(e => e.transition().duration(CHART_ANIMATION_DURATION).attr("opacity", 0).remove())
    )
  .on("mouseenter", function(event, d) {
    d3.select(this).attr("stroke", "#111827").attr("stroke-width", 2);
    showTooltipPinned(event, heatmapCellTipHtml(d));
  })
  .on("mouseleave", function(event) { 
    d3.select(this).attr("stroke", "none"); 
    hideTooltip(); 
  });

  inner.selectAll(".cell-label").data(cells, d => `${d.year}-${d.jurisdiction}`).join(
    enter => enter.append("text").attr("class", "cell-label")
      .attr("x", d => d.xi * cellWidth + cellWidth / 2).attr("y", d => d.yi * cellHeight + cellHeight / 2 + 5)
      .attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", 800).attr("opacity", 0)
      .text(d => d.active ? formatMillions(d.value) : "N/A")
      .call(e => e.transition().duration(CHART_ANIMATION_DURATION).attr("opacity", 1)),
    update => update.call(u => u.transition().duration(CHART_ANIMATION_DURATION).attr("x", d => d.xi * cellWidth + cellWidth / 2).attr("y", d => d.yi * cellHeight + cellHeight / 2 + 5).attr("fill", d => (d.active && d.value > maxValue * 0.55) ? "#fff" : "#222").text(d => d.active ? formatMillions(d.value) : "N/A")),
    exit => exit.call(e => e.transition().duration(CHART_ANIMATION_DURATION).attr("opacity", 0).remove())
  ).attr("fill", d => (d.active && d.value > maxValue * 0.55) ? "#fff" : "#222");

  const xScale = d3.scalePoint().domain(years).range([cellWidth / 2, innerWidth - cellWidth / 2]);
  const yScale = d3.scalePoint().domain(jurisdictions).range([cellHeight / 2, innerHeight - cellHeight / 2]);

  inner.append("g").attr("class", "axis-x").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(xScale).tickFormat(d3.format("d"))).call(g => g.select(".domain").remove());
  inner.append("g").attr("class", "axis-y").call(d3.axisLeft(yScale)).call(g => g.select(".domain").remove());

  inner.append("text").attr("class", "chart-title-label").attr("x", innerWidth / 2).attr("y", innerHeight + 48).attr("text-anchor", "middle").text("Year");
  inner.append("text").attr("class", "chart-title-label horizontal-axis-label").attr("x", 0).attr("y", -22).attr("transform", null).attr("text-anchor", "start").text("Jurisdiction");

  const defs = svg.append("defs");
  const gradient = defs.append("linearGradient").attr("id", "speeding-heatmap-gradient").attr("x1", "0%").attr("x2", "100%");
  gradient.append("stop").attr("offset", "0%").attr("stop-color", colorScale(0));
  gradient.append("stop").attr("offset", "100%").attr("stop-color", colorScale(maxValue));

  const legend = inner.append("g").attr("class", "heatmap-svg-legend").attr("transform", `translate(${innerWidth + 28},22)`);
  legend.append("text").attr("x", 0).attr("y", -8).attr("font-size", 11).attr("font-weight", 800).attr("fill", "#374151").text("Fines");
  legend.append("rect").attr("width", 130).attr("height", 14).attr("rx", 7).attr("fill", "url(#speeding-heatmap-gradient)");
  legend.append("text").attr("x", 0).attr("y", 30).attr("font-size", 10).attr("fill", "#374151").text("Low");
  legend.append("text").attr("x", 130).attr("y", 30).attr("font-size", 10).attr("text-anchor", "end").attr("fill", "#374151").text("High");

  const maxCell = d3.greatest(cells.filter(d => d.active), d => d.value);
  const heatmapMessage = maxCell
    ? `${maxCell.jurisdiction} in ${maxCell.year} shows the highest fine total in the selected view, identifying the key year-jurisdiction hotspot behind the pattern.`
    : "No heatmap insight available for the selected filters.";

  ensureD1HeatmapContent(heatmapMessage);
}