function d2EnsureHeatmapContent(text) {
  const card = document.querySelector('#drug-dashboard .heatmap-card');
  if (!card) return;

  const chartContainer = card.querySelector('#d2-heatmap-chart');
  let insightBox = card.querySelector(':scope > .insight-box') || card.querySelector('.insight-box');

  // Use the existing heatmap insight box from dashboard2.html. If it is missing,
  // create the same structure as a fallback so the content under the heatmap is always visible.
  if (!insightBox) {
    insightBox = document.createElement('div');
    insightBox.className = 'insight-box heatmap-inline-insight';
    insightBox.innerHTML = '<span aria-hidden="true">▦</span><p id="d2HeatmapInsight"></p>';
  }

  insightBox.classList.add('heatmap-inline-insight');

  if (chartContainer && insightBox.previousElementSibling !== chartContainer) {
    chartContainer.insertAdjacentElement('afterend', insightBox);
  }

  const textTarget = insightBox.querySelector('p') || document.querySelector('#d2HeatmapInsight');
  if (textTarget) textTarget.textContent = text;

  insightBox.style.display = 'flex';
  insightBox.style.visibility = 'visible';
  insightBox.style.opacity = '1';

  d3.selectAll('#d2HeatmapInsight').text(text);
}

// ─────────────────────────────────────────────────────────────────────────────
// js/d2_heatmap.js
// ─────────────────────────────────────────────────────────────────────────────

function d2DrawHeatmap(data, allData) {
  const dash = d3.select("#drug-dashboard");
  if (dash.empty()) return;

  let container = dash.select("#d2-heatmap-chart");

  if (container.empty()) {
    const card = dash.select(".heatmap-card").node();
    if (card) {
      card.querySelectorAll("#drug-outcome-chart, #d2HeatmapContainer, svg").forEach(el => el.remove());
      const newDiv = document.createElement("div");
      newDiv.id = "d2-heatmap-chart";
      newDiv.className = "drug-outcome-content";
      const insightBox = card.querySelector(".insight-box");
      if (insightBox) card.insertBefore(newDiv, insightBox);
      else card.appendChild(newDiv);
      container = d3.select(newDiv);
    } else return;
  }

  container.selectAll("*").interrupt().remove();

  if (!data || data.length === 0) {
    const message = "No heatmap data available for the selected filters.";
    container.append("p").attr("class", "heatmap-empty").style("padding", "24px").style("text-align", "center").text(message);
    d2EnsureHeatmapContent(message);
    // Keep the expanded-chart modal's data table in sync (see js/chart_expand.js).
    window.chartExpandTableData = window.chartExpandTableData || {};
    window.chartExpandTableData["d2-heatmap-chart"] = { columns: ["Year", "Jurisdiction", "Positive Drug Tests"], rows: [], rowKeys: [] };
    return;
  }

  const startYear = +d3.select("#d2StartYear").property("value");
  const endYear = +d3.select("#d2EndYear").property("value");
  const selectedJurisdiction = d3.select("#d2JurisdictionSelect").property("value");

  const years = Array.from(new Set(allData.map(d => d.YEAR)))
    .filter(yr => yr >= Math.min(startYear, endYear) && yr <= Math.max(startYear, endYear)).sort((a, b) => a - b);

  const jurisdictions = selectedJurisdiction === "All"
    ? D2_JURISDICTION_ORDER.filter(j => allData.some(d => d.JURISDICTION === j))
    : [selectedJurisdiction];

  const dataMap = new Map();
  data.forEach(d => { dataMap.set(`${d.YEAR}-${d.JURISDICTION}`, d["Positive drug tests"]); });

  const margin = { top: 54, right: 180, bottom: 62, left: 92 };
  const totalWidth = 1160;
  const totalHeight = Math.max(360, 96 + jurisdictions.length * 42);
  const innerWidth = totalWidth - margin.left - margin.right;
  const innerHeight = totalHeight - margin.top - margin.bottom;

  const svg = container.append("svg").attr("class", "drug-outcome-style-heatmap").attr("width", totalWidth).attr("height", totalHeight).attr("viewBox", `0 0 ${totalWidth} ${totalHeight}`).attr("preserveAspectRatio", "xMidYMid meet");
  const inner = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const maxVal = d3.max(allData, d => d["Positive drug tests"]) || 1;
  const cellWidth = innerWidth / years.length;
  const cellHeight = innerHeight / jurisdictions.length;
  const colorScale = d3.scaleSequential().domain([0, maxVal]).interpolator(d3.interpolateOranges);

  const cells = [];
  years.forEach((year, xi) => {
    jurisdictions.forEach((jur, yi) => {
      const val = dataMap.get(`${year}-${jur}`) || 0;
      cells.push({ year, jur, val, xi, yi, active: dataMap.has(`${year}-${jur}`) });
    });
  });

  // Feed the expanded-chart modal's right-hand data table (see js/chart_expand.js).
  window.chartExpandTableData = window.chartExpandTableData || {};
  window.chartExpandTableData["d2-heatmap-chart"] = {
      columns: ["Year", "Jurisdiction", "Positive Drug Tests"],
      rows: cells.map(d => [d.year, d.jur, d.active ? d2FormatNum(d.val) : "No record"]),
      rowKeys: cells.map(d => `cell-${d.year}-${d.jur}`)
    };

  // Tooltip HTML is also stamped on as a `data-tooltip` attribute so the
  // expanded chart modal (which clones this SVG, losing D3 event listeners)
  // can still show working tooltips on hover. See js/chart_expand.js.
  const d2HeatmapCellTipHtml = d => {
    const displayValue = d.active ? `${d2FormatNum(d.val)} (${d2FormatK(d.val)})` : "No record";
    return `<strong>${d.jur} — ${d.year}</strong><br>Positive tests: ${displayValue}`;
  };

  inner.selectAll(".heatmap-cell").data(cells, d => `${d.year}-${d.jur}`).join(
      enter => enter.append("rect").attr("class", "heatmap-cell")
        .attr("x", d => d.xi * cellWidth).attr("y", d => d.yi * cellHeight).attr("width", Math.max(0, cellWidth - 3)).attr("height", Math.max(0, cellHeight - 3))
        .attr("rx", 8).style("cursor", "pointer").attr("fill", "#E5E7EB").attr("opacity", 0)
        .attr("data-value", d => d.active ? d.val : null)
        .attr("data-tooltip", d2HeatmapCellTipHtml)
        .attr("data-key", d => `cell-${d.year}-${d.jur}`)
        .call(e => e.transition().duration(600).ease(d3.easeCubicOut).attr("fill", d => d.active ? colorScale(d.val) : "#E5E7EB").attr("opacity", 1)),
      update => update.attr("data-value", d => d.active ? d.val : null)
        .attr("data-tooltip", d2HeatmapCellTipHtml)
        .attr("data-key", d => `cell-${d.year}-${d.jur}`)
        .call(u => u.transition().duration(600).ease(d3.easeCubicOut).attr("fill", d => d.active ? colorScale(d.val) : "#E5E7EB")),
      exit => exit.call(e => e.transition().duration(600).attr("opacity", 0).remove())
    )
  .on("mouseenter", function(event, d) {
    d3.select(this).attr("stroke", "#111827").attr("stroke-width", 2);
    d2ShowTooltipPinned(event, d2HeatmapCellTipHtml(d));
  })
  .on("mouseleave", function() { 
    d3.select(this).attr("stroke", "none"); 
    d2HideTooltip(); 
  });

  inner.selectAll(".cell-label").data(cells, d => `${d.year}-${d.jur}`).join(
    enter => enter.append("text").attr("class", "cell-label")
      .attr("x", d => d.xi * cellWidth + cellWidth / 2).attr("y", d => d.yi * cellHeight + cellHeight / 2 + 5)
      .attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", 800).attr("opacity", 0)
      .attr("fill", d => (d.active && d.val > maxVal * 0.55) ? "#fff" : "#222")
      .text(d => d.active && d.val > 0 ? d2FormatK(d.val) : "–") 
      .call(e => e.transition().duration(600).ease(d3.easeCubicOut).attr("opacity", 1)),
    update => update.call(u => u.transition().duration(600).ease(d3.easeCubicOut)
      .attr("x", d => d.xi * cellWidth + cellWidth / 2).attr("y", d => d.yi * cellHeight + cellHeight / 2 + 5)
      .attr("fill", d => (d.active && d.val > maxVal * 0.55) ? "#fff" : "#222")
      .text(d => d.active && d.val > 0 ? d2FormatK(d.val) : "–")),
    exit => exit.call(e => e.transition().duration(600).attr("opacity", 0).remove())
  );

  const xScale = d3.scalePoint().domain(years).range([cellWidth / 2, innerWidth - cellWidth / 2]);
  const yScale = d3.scalePoint().domain(jurisdictions).range([cellHeight / 2, innerHeight - cellHeight / 2]);

  inner.append("g").attr("class", "axis-x").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(xScale).tickFormat(d3.format("d"))).call(g => g.select(".domain").remove());
  inner.append("g").attr("class", "axis-y").call(d3.axisLeft(yScale)).call(g => g.select(".domain").remove());

  inner.append("text").attr("x", innerWidth / 2).attr("y", innerHeight + 48).attr("text-anchor", "middle").attr("font-size", "13px").attr("font-weight", "800").attr("fill", "#111827").text("Year");
  inner.append("text").attr("class", "chart-title-label horizontal-axis-label").attr("x", 0).attr("y", -22).attr("transform", null).attr("text-anchor", "start").attr("font-size", "13px").attr("font-weight", "800").attr("fill", "#111827").text("Jurisdiction");

  const defs = svg.append("defs");
  const linearGrad = defs.append("linearGradient").attr("id", "d2-heatmap-gradient").attr("x1", "0%").attr("x2", "100%");
  linearGrad.append("stop").attr("offset", "0%").attr("stop-color", colorScale(0));
  linearGrad.append("stop").attr("offset", "100%").attr("stop-color", colorScale(maxVal));

  const legend = inner.append("g").attr("class", "heatmap-svg-legend").attr("transform", `translate(${innerWidth + 28},22)`);
  legend.append("text").attr("x", 0).attr("y", -8).attr("font-size", 11).attr("font-weight", 800).attr("fill", "#374151").text("Positive Tests");
  legend.append("rect").attr("width", 130).attr("height", 14).attr("rx", 7).attr("fill", "url(#d2-heatmap-gradient)");
  legend.append("text").attr("x", 0).attr("y", 30).attr("font-size", 10).attr("fill", "#374151").text("Low");
  legend.append("text").attr("x", 130).attr("y", 30).attr("font-size", 10).attr("text-anchor", "end").attr("fill", "#374151").text("High");

  const maxCell = d3.greatest(cells.filter(d => d.active), d => d.val);
  const heatmapMessage = maxCell
    ? `${maxCell.jur} in ${maxCell.year} had the highest positive drug test count (${d3.format(",")(maxCell.val)}), marking the clearest year-jurisdiction hotspot in the selected view.`
    : "No heatmap insight available for the selected filters.";

  d2EnsureHeatmapContent(heatmapMessage);
}