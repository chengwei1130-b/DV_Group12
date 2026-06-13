// ─────────────────────────────────────────────────────────────────────────────
// js/d1_lineChart.js
// ─────────────────────────────────────────────────────────────────────────────

function drawLineChart(data) {
  const svg        = d3.select("#lineChart");
  const margin     = { top: 34, right: 26, bottom: 56, left: 78 };
  const width      = 760 - margin.left - margin.right;
  const height     = 430 - margin.top - margin.bottom;
  const values     = yearlyTotals(data);
  const t          = svg.transition().duration(CHART_ANIMATION_DURATION).ease(chartEase);

  svg.attr("width", 760).attr("height", 430);

  let root = svg.select("g.line-chart-root");
  if (root.empty()) root = svg.append("g").attr("class", "line-chart-root").attr("transform", `translate(${margin.left},${margin.top})`);

  if (!values.length) {
    root.selectAll("*").remove();
    root.append("text").attr("x", width / 2).attr("y", height / 2).attr("text-anchor", "middle").text("No data");
    return;
  }

  const x = d3.scalePoint().domain(values.map(d => d.year)).range([0, width]).padding(0.5);
  const y = d3.scaleLinear().domain([0, d3.max(values, d => d.value) * 1.18]).nice().range([height, 0]);

  root.selectAll("g.grid").data([null]).join("g").attr("class", "grid").transition(t).call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat("")).call(g => g.select(".domain").remove());
  root.selectAll("g.x-axis").data([null]).join("g").attr("class", "axis x-axis").attr("transform", `translate(0,${height})`).transition(t).call(d3.axisBottom(x).tickFormat(d3.format("d")));
  root.selectAll("g.y-axis").data([null]).join("g").attr("class", "axis y-axis").transition(t).call(d3.axisLeft(y).ticks(5).tickFormat(d => `${d / 1_000_000}M`));
  root.selectAll("text.y-axis-label").data([null]).join("text").attr("class", "chart-title-label horizontal-axis-label y-axis-label").attr("x", 0).attr("y", -14).attr("text-anchor", "start").text("Fines");

  const line = d3.line().x(d => x(d.year)).y(d => y(d.value)).curve(d3.curveMonotoneX);
  root.selectAll("path.trend-line").data([values]).join("path").attr("class", "trend-line")
    .attr("fill", "none").attr("stroke", "#F15A24").attr("stroke-width", 3).transition(t).attr("d", line);

  // Bind tooltip directly to circles. Radius is slightly larger (9px) for easier hovering.
  const points = root.selectAll("circle.line-point").data(values, d => d.year);
  points.enter().append("circle").attr("class", "line-point").attr("r", 0)
    .attr("fill", "#F7931E").attr("stroke", "#ffffff").attr("stroke-width", 2).style("cursor", "pointer")
    .on("mouseenter", (event, d) => showTooltipPinned(event, `<strong>Year: ${d.year}</strong><br>Speeding fines: ${formatNumber(d.value)}<br>${formatMillions(d.value)}`))
    .on("mouseleave", hideTooltip)
    .merge(points).transition(t).delay((_, i) => i * CHART_STAGGER_DELAY)
    .attr("cx", d => x(d.year)).attr("cy", d => y(d.value)).attr("r", 9);
  points.exit().transition(t).attr("r", 0).style("opacity", 0).remove();

  const labels = root.selectAll("text.line-label").data(values, d => d.year);
  labels.enter().append("text").attr("class", "chart-title-label line-label").attr("text-anchor", "middle").style("opacity", 0)
    .merge(labels).text(d => formatMillions(d.value)).transition(t).delay((_, i) => i * CHART_STAGGER_DELAY)
    .attr("x", d => x(d.year)).attr("y", d => y(d.value) - 16).style("opacity", 1);
  labels.exit().transition(t).style("opacity", 0).remove();
}