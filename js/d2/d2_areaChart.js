// ─────────────────────────────────────────────────────────────────────────────
// js/d2_areaChart.js
// ─────────────────────────────────────────────────────────────────────────────

function d2DrawAreaChart(data) {
  const svg = d3.select("#d2AreaChart");
  const margin = { top: 34, right: 150, bottom: 56, left: 78 };
  const outerW = 760; const outerH = 430;
  const W = outerW - margin.left - margin.right; const H = outerH - margin.top - margin.bottom;
  const t = svg.transition().duration(D2_DURATION).ease(d2Ease);

  svg.attr("width", outerW).attr("height", outerH);

  let root = svg.select("g.d2-area-root");
  if (root.empty()) root = svg.append("g").attr("class", "d2-area-root").attr("transform", `translate(${margin.left},${margin.top})`);

  const jurisdiction = d3.select("#d2JurisdictionSelect").property("value");
  const jurisdictions = jurisdiction === "All" ? D2_JURISDICTION_ORDER.filter(j => data.some(d => d.JURISDICTION === j)) : [jurisdiction];
  const years = Array.from(new Set(data.map(d => d.YEAR))).sort((a, b) => a - b);

  if (!years.length || !jurisdictions.length) {
    root.selectAll("*").remove();
    root.append("text").attr("x", W / 2).attr("y", H / 2).attr("text-anchor", "middle").text("No data");
    // Keep the expanded-chart modal's data table in sync (see js/chart_expand.js).
    window.chartExpandTableData = window.chartExpandTableData || {};
    window.chartExpandTableData.d2AreaChart = { columns: ["Year", "Jurisdiction", "Positive Drug Tests"], rows: [], rowKeys: [] };
    return;
  }

  const lookup = new Map();
  data.forEach(d => lookup.set(`${d.YEAR}-${d.JURISDICTION}`, d["Positive drug tests"]));

  const stackData = years.map(year => {
    const entry = { year };
    jurisdictions.forEach(j => { entry[j] = lookup.get(`${year}-${j}`) ?? 0; });
    return entry;
  });

  const stack = d3.stack().keys(jurisdictions).order(d3.stackOrderNone).offset(d3.stackOffsetNone);
  const stacked = stack(stackData);

  const x = d3.scalePoint().domain(years).range([0, W]).padding(0.4);
  const maxY = d3.max(stacked[stacked.length - 1], d => d[1]) || 1;
  const y = d3.scaleLinear().domain([0, maxY * 1.12]).nice().range([H, 0]);

  root.selectAll("g.d2-area-grid").data([null]).join("g").attr("class", "grid d2-area-grid").transition(t).call(d3.axisLeft(y).ticks(5).tickSize(-W).tickFormat("")).call(g => g.select(".domain").remove());
  root.selectAll("g.d2-area-x").data([null]).join("g").attr("class", "axis x-axis d2-area-x").attr("transform", `translate(0,${H})`).transition(t).call(d3.axisBottom(x).tickFormat(d3.format("d")));
  root.selectAll("g.d2-area-y").data([null]).join("g").attr("class", "axis y-axis d2-area-y").transition(t).call(d3.axisLeft(y).ticks(5).tickFormat(d2FormatK));
  root.selectAll("text.d2-area-ylabel").data([null]).join("text").attr("class", "chart-title-label horizontal-axis-label d2-area-ylabel").attr("x", 0).attr("y", -14).attr("transform", null).attr("text-anchor", "start").text("Positive tests");

  const areaGen = d3.area().x(d => x(d.data.year)).y0(d => y(d[0])).y1(d => y(d[1])).curve(d3.curveMonotoneX);
  const lineGen = d3.line().x(d => x(d.data.year)).y(d => y(d[1])).curve(d3.curveMonotoneX);

  root.selectAll("path.d2-area").data(stacked, d => d.key).join(
    enter => enter.append("path").attr("class", "d2-area").attr("data-jurisdiction", d => d.key).attr("fill", d => D2_JURISDICTION_COLORS[d.key] || "#999").attr("fill-opacity", 0.35).attr("d", d => areaGen(d.map(p => ({ ...p, data: { ...p.data, year: p.data.year } })))),
    update => update.attr("data-jurisdiction", d => d.key).transition(t).attr("fill", d => D2_JURISDICTION_COLORS[d.key] || "#999").attr("d", areaGen),
    exit => exit.remove()
  );

  root.selectAll("path.d2-area-line").data(stacked, d => d.key).join(
    enter => enter.append("path").attr("class", "d2-area-line").attr("data-jurisdiction", d => d.key).attr("fill", "none").attr("stroke", d => D2_JURISDICTION_COLORS[d.key] || "#999").attr("stroke-width", 2).attr("d", lineGen),
    update => update.attr("data-jurisdiction", d => d.key).transition(t).attr("stroke", d => D2_JURISDICTION_COLORS[d.key] || "#999").attr("d", lineGen),
    exit => exit.remove()
  );

  // Generate specific hover circles directly on the lines rather than using full-height zones.
  // Tooltip HTML is also stamped on as a `data-tooltip` attribute so the
  // expanded chart modal (which clones this SVG, losing D3 event listeners)
  // can still show working tooltips on hover. See js/chart_expand.js.
  const pointData = [];
  stacked.forEach(series => {
    series.forEach(d => {
      pointData.push({ year: d.data.year, jurisdiction: series.key, val: d.data[series.key], yPos: d[1] });
    });
  });

  // Feed the expanded-chart modal's right-hand data table (see js/chart_expand.js).
  window.chartExpandTableData = window.chartExpandTableData || {};
  const sortedPointData = [...pointData].sort((a, b) => a.year - b.year || a.jurisdiction.localeCompare(b.jurisdiction));
  window.chartExpandTableData = window.chartExpandTableData || {};
  window.chartExpandTableData.d2AreaChart = {
    columns: ["Year", "Jurisdiction", "Positive Drug Tests"],
    rows: sortedPointData.map(d => [d.year, d.jurisdiction, d2FormatNum(d.val)]),
    rowKeys: sortedPointData.map(d => `point-${d.year}-${d.jurisdiction}`)
  };
  const areaPointTipHtml = d => {
    const color = D2_JURISDICTION_COLORS[d.jurisdiction] || '#999';
    return `<strong>${d.year}</strong><br><span style="color:${color}">${d.jurisdiction}: ${d2FormatNum(d.val)}</span><br>Cumulative: ${d2FormatNum(d.yPos)}`;
  };

  root.selectAll("circle.area-hover-point").data(pointData, d => `${d.year}-${d.jurisdiction}`).join(
      enter => enter.append("circle").attr("class", "area-hover-point").attr("r", 9)
        .attr("fill", d => D2_JURISDICTION_COLORS[d.jurisdiction] || '#999')
        .attr("stroke", "#ffffff").attr("stroke-width", 2).style("cursor", "pointer")
        .attr("cx", d => x(d.year)).attr("cy", d => y(d.yPos))
        .attr("data-tooltip", areaPointTipHtml)
        .attr("data-key", d => `point-${d.year}-${d.jurisdiction}`)
        .attr("data-jurisdiction", d => d.jurisdiction)
        .on("mouseenter", function(event, d) {
          d3.select(this).attr("r", 11).attr("stroke", "#111827").attr("stroke-width", 2); // Emphasize point on hover
          d2ShowTooltipPinned(event, areaPointTipHtml(d));
        })
        .on("mouseleave", function() {
          d3.select(this).attr("r", 9).attr("stroke", "#ffffff").attr("stroke-width", 2);
          d2HideTooltip();
        }),
      update => update.attr("data-tooltip", areaPointTipHtml).attr("fill", d => D2_JURISDICTION_COLORS[d.jurisdiction] || '#999')
        .attr("data-key", d => `point-${d.year}-${d.jurisdiction}`)
        .attr("data-jurisdiction", d => d.jurisdiction)
        .transition(t).attr("cx", d => x(d.year)).attr("cy", d => y(d.yPos)),
      exit => exit.remove()
    );

  const legendG = root.selectAll("g.d2-area-legend").data([null]).join("g").attr("class", "d2-area-legend").attr("transform", `translate(${W + 14},0)`);
  legendG.selectAll("*").remove();
  jurisdictions.forEach((j, i) => {
    const item = legendG.append("g").attr("transform", `translate(0,${i * 20})`);
    item.append("rect").attr("width", 12).attr("height", 12).attr("rx", 2).attr("fill", D2_JURISDICTION_COLORS[j] || "#999").attr("fill-opacity", 0.75);
    item.append("text").attr("x", 16).attr("y", 10).attr("font-size", 11).attr("fill", "#374151").text(j);
  });
}