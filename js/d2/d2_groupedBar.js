// ─────────────────────────────────────────────────────────────────────────────
// js/d2_groupedBar.js
// ─────────────────────────────────────────────────────────────────────────────

function d2DrawGroupedBar(data) {
  const svg = d3.select("#d2GroupedBar");
  const margin = { top: 34, right: 28, bottom: 82, left: 90 };
  const outerW = 760; const outerH = 430;
  const W = outerW - margin.left - margin.right; const H = outerH - margin.top - margin.bottom;
  const t = svg.transition().duration(D2_DURATION).ease(d2Ease);

  svg.attr("width", outerW).attr("height", outerH);

  let root = svg.select("g.d2-bar-root");
  if (root.empty()) root = svg.append("g").attr("class", "d2-bar-root").attr("transform", `translate(${margin.left},${margin.top})`);

  const agg = D2_JURISDICTION_ORDER.map(j => {
    const rows = data.filter(d => d.JURISDICTION === j);
    return rows.length ? { jurisdiction: j, fines: d3.sum(rows, d => d["Speeding Fines"]), tests: d3.sum(rows, d => d["Alcohol drug tests"]) } : null;
  }).filter(Boolean).sort((a, b) => b.fines - a.fines);

  // Feed the expanded-chart modal's right-hand data table (see js/chart_expand.js).
  window.chartExpandTableData = window.chartExpandTableData || {};
  window.chartExpandTableData.d2GroupedBar = {
      columns: ["Jurisdiction", "Speeding Fines", "Drug Tests"],
      rows: agg.map(d => [d.jurisdiction, d2FormatNum(d.fines), d2FormatNum(d.tests)]),
      rowKeys: agg.map(d => `bar-${d.jurisdiction}`)
    };

  if (!agg.length) {
    root.selectAll("*").remove();
    root.append("text").attr("x", W / 2).attr("y", H / 2).attr("text-anchor", "middle").text("No data");
    return;
  }

  const series = ["fines", "tests"];
  const seriesLabels = { fines: "Speeding fines", tests: "Drug tests" };
  const seriesColors = { fines: "#F15A24", tests: "#2196F3" };

  const x0 = d3.scaleBand().domain(agg.map(d => d.jurisdiction)).range([0, W]).paddingInner(0.28).paddingOuter(0.1);
  const x1 = d3.scaleBand().domain(series).range([0, x0.bandwidth()]).padding(0.08);

  const maxVal = d3.max(agg, d => Math.max(d.fines, d.tests));
  const y = d3.scaleLinear().domain([0, maxVal * 1.18]).nice().range([H, 0]);

  root.selectAll("g.d2-bar-grid").data([null]).join("g").attr("class", "grid d2-bar-grid").transition(t).call(d3.axisLeft(y).ticks(5).tickSize(-W).tickFormat("")).call(g => g.select(".domain").remove());

  const xAxis = root.selectAll("g.d2-bar-x").data([null]).join("g").attr("class", "axis x-axis d2-bar-x").attr("transform", `translate(0,${H})`);
  xAxis.transition(t).call(d3.axisBottom(x0));
  xAxis.selectAll("text").attr("transform", "rotate(-34)").style("text-anchor", "end");

  root.selectAll("g.d2-bar-y").data([null]).join("g").attr("class", "axis y-axis d2-bar-y").transition(t).call(d3.axisLeft(y).ticks(5).tickFormat(d => `${d / 1_000_000}M`));
  root.selectAll("text.d2-bar-ylabel").data([null]).join("text").attr("class", "chart-title-label horizontal-axis-label d2-bar-ylabel").attr("x", 0).attr("y", -14).attr("transform", null).attr("text-anchor", "start").text("Count");

  const groups = root.selectAll("g.d2-bar-group").data(agg, d => d.jurisdiction).join("g").attr("class", "d2-bar-group").attr("transform", d => `translate(${x0(d.jurisdiction)},0)`);

  // Bind tooltip directly to the individual bars. Tooltip HTML is also
  // stamped on as a `data-tooltip` attribute so the expanded chart modal
  // (which clones this SVG, losing D3 event listeners) can still show
  // working tooltips on hover. See js/chart_expand.js.
  groups.each(function (gd) {
    const g = d3.select(this);
    series.forEach((key, si) => {
      const bars = g.selectAll(`rect.d2-bar-${key}`).data([gd]);
      const barTipHtml = d => `<strong>${d.jurisdiction}</strong><br>${seriesLabels[key]}: ${d2FormatNum(d[key])}<br>(${d2FormatM(d[key])})`;
      bars.enter().append("rect").attr("class", `d2-bar-${key}`).attr("x", x1(key)).attr("width", x1.bandwidth()).attr("y", H).attr("height", 0)
        .attr("fill", seriesColors[key]).attr("rx", 4).style("cursor", "pointer")
        .on("mouseenter", function(event, d) {
          d3.select(this).attr("stroke", "#111827").attr("stroke-width", 1.5);
          d2ShowTooltipPinned(event, barTipHtml(d));
        })
        .on("mouseleave", function() {
          d3.select(this).attr("stroke", "none");
          d2HideTooltip();
        })
        .merge(bars).attr("data-tooltip", barTipHtml).attr("data-key", d => `bar-${d.jurisdiction}`).transition(t).delay(si * D2_STAGGER).attr("x", x1(key)).attr("width", x1.bandwidth()).attr("y", d => y(d[key])).attr("height", d => H - y(d[key]));
    });
  });

  const legendG = root.selectAll("g.d2-bar-legend").data([null]).join("g").attr("class", "d2-bar-legend").attr("transform", `translate(${W - 220},-24)`);
  legendG.selectAll("*").remove();
  series.forEach((key, i) => {
    const lItem = legendG.append("g").attr("transform", `translate(${i * 118},0)`);
    lItem.append("rect").attr("width", 14).attr("height", 14).attr("rx", 3).attr("fill", seriesColors[key]);
    lItem.append("text").attr("x", 18).attr("y", 11).attr("font-size", 11).attr("font-weight", 700).attr("fill", "#374151").text(seriesLabels[key]);
  });
}