// ─────────────────────────────────────────────────────────────────────────────
// js/d1_lollipopChart.js
// ─────────────────────────────────────────────────────────────────────────────

function drawLollipopChart(data) {
  const svg        = d3.select("#lollipopChart");
  const margin     = { top: 34, right: 28, bottom: 82, left: 78 };
  const width      = 760 - margin.left - margin.right;
  const height     = 430 - margin.top - margin.bottom;
  const values     = jurisdictionTotals(data);
  const t          = svg.transition().duration(CHART_ANIMATION_DURATION).ease(chartEase);

  // Feed the expanded-chart modal's right-hand data table (see js/chart_expand.js).
  window.chartExpandTableData = window.chartExpandTableData || {};
  window.chartExpandTableData.lollipopChart = {
      columns: ["Jurisdiction", "Speeding Fines"],
      rows: values.map(d => [d.jurisdiction, formatNumber(d.value)]),
      rowKeys: values.map(d => `point-${d.jurisdiction}`)
    };

  svg.attr("width", 760).attr("height", 430);

  let root = svg.select("g.lollipop-chart-root");
  if (root.empty()) root = svg.append("g").attr("class", "lollipop-chart-root").attr("transform", `translate(${margin.left},${margin.top})`);

  if (!values.length) {
    root.selectAll("*").remove();
    root.append("text").attr("x", width / 2).attr("y", height / 2).attr("text-anchor", "middle").text("No data");
    return;
  }

  const x = d3.scaleBand().domain(values.map(d => d.jurisdiction)).range([0, width]).padding(0.35);
  const y = d3.scaleLinear().domain([0, d3.max(values, d => d.value) * 1.18]).nice().range([height, 0]);

  root.selectAll("g.grid").data([null]).join("g").attr("class", "grid").transition(t).call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat("")).call(g => g.select(".domain").remove());
  root.selectAll("g.x-axis").data([null]).join("g").attr("class", "axis x-axis").attr("transform", `translate(0,${height})`).transition(t).call(d3.axisBottom(x)).selectAll("text").attr("transform", "rotate(-34)").style("text-anchor", "end");
  root.selectAll("g.y-axis").data([null]).join("g").attr("class", "axis y-axis").transition(t).call(d3.axisLeft(y).ticks(5).tickFormat(d => `${d / 1_000_000}M`));
  root.selectAll("text.y-axis-label").data([null]).join("text").attr("class", "chart-title-label horizontal-axis-label y-axis-label").attr("x", 0).attr("y", -14).attr("text-anchor", "start").text("Fines");

  const stems = root.selectAll("line.lollipop-line").data(values, d => d.jurisdiction);
  stems.enter().append("line").attr("class", "lollipop-line").attr("stroke", "#202020").attr("stroke-width", 2).attr("opacity", 0.75)
    .merge(stems).transition(t).delay((_, i) => i * CHART_STAGGER_DELAY)
    .attr("x1", d => x(d.jurisdiction) + x.bandwidth() / 2).attr("x2", d => x(d.jurisdiction) + x.bandwidth() / 2).attr("y1", height).attr("y2", d => y(d.value));
  stems.exit().transition(t).attr("y2", height).style("opacity", 0).remove();

  // Bind tooltip directly to circles. Tooltip HTML is also stamped on as a
  // `data-tooltip` attribute so the expanded chart modal (which clones this
  // SVG, losing D3 event listeners) can still show working tooltips on
  // hover. See js/chart_expand.js.
  const lollipopTipHtml = d => `<strong>${d.jurisdiction}</strong><br>Speeding fines: ${formatNumber(d.value)}<br>${formatMillions(d.value)}`;
  const dots = root.selectAll("circle.lollipop-dot").data(values, d => d.jurisdiction);
  dots.enter().append("circle").attr("class", "lollipop-dot").attr("r", 0)
    .attr("fill", "#F7931E").attr("stroke", "#ffffff").attr("stroke-width", 2).style("cursor", "pointer")
    .on("mouseenter", (event, d) => showTooltipPinned(event, lollipopTipHtml(d)))
    .on("mouseleave", hideTooltip)
    .merge(dots).attr("data-tooltip", lollipopTipHtml).attr("data-key", d => `point-${d.jurisdiction}`).transition(t).delay((_, i) => i * CHART_STAGGER_DELAY)
    .attr("cx", d => x(d.jurisdiction) + x.bandwidth() / 2).attr("cy", d => y(d.value)).attr("r", 9); // Radius 9 for easier click/hover
  dots.exit().transition(t).attr("r", 0).style("opacity", 0).remove();

  const labels = root.selectAll("text.lollipop-label").data(values, d => d.jurisdiction);
  labels.enter().append("text").attr("class", "chart-title-label lollipop-label").attr("text-anchor", "middle").style("opacity", 0)
    .merge(labels).text(d => formatMillions(d.value)).transition(t).delay((_, i) => i * CHART_STAGGER_DELAY)
    .attr("x", d => x(d.jurisdiction) + x.bandwidth() / 2).attr("y", d => y(d.value) - 14).style("opacity", 1);
  labels.exit().transition(t).style("opacity", 0).remove();
}