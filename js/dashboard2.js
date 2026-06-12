// ─────────────────────────────────────────────────────────────────────────────
// Dashboard 2 – Drug Testing & Enforcement Story
// Renders after dashboard2.html is injected into #content-container by script.js.
// ─────────────────────────────────────────────────────────────────────────────

const D2_JURISDICTION_ORDER = ["VIC", "NSW", "QLD", "WA", "SA", "ACT", "TAS", "NT"];
const D2_JURISDICTION_COLORS = {
  VIC: "#F15A24", NSW: "#2196F3", QLD: "#9C27B0",
  WA:  "#4CAF50", SA:  "#FF9800", ACT: "#00BCD4",
  TAS: "#E91E63", NT:  "#795548"
};

const D2_DURATION    = 420;
const D2_STAGGER     = 20;
const d2Ease         = d3.easeCubicOut;

const d2FormatNum    = d3.format(",");
const d2FormatM      = v => `${d3.format(".2~f")((v || 0) / 1_000_000)}M`;
const d2FormatK      = v => v >= 1000 ? `${d3.format(".1f")(v / 1000)}k` : String(v);
const d2FormatPct    = v => `${d3.format(".2f")(v)}%`;

let d2Tooltip = null;

function d2GetTooltip() {
  if (!d2Tooltip || d2Tooltip.empty()) {
    d2Tooltip = d3.select("#d2Tooltip");
  }
  return d2Tooltip;
}

function d2ShowTooltip(event, html) {
  d2GetTooltip().style("opacity", 1).html(html)
    .style("left", `${event.clientX + 14}px`).style("top",  `${event.clientY - 28}px`);
}

function d2HideTooltip() {
  d2GetTooltip().style("opacity", 0);
}

function d2GetFiltered(allData) {
  let startYear     = +d3.select("#d2StartYear").property("value");
  let endYear       = +d3.select("#d2EndYear").property("value");
  const jurisdiction = d3.select("#d2JurisdictionSelect").property("value");

  if (startYear > endYear) {
    [startYear, endYear] = [endYear, startYear];
    d3.select("#d2StartYear").property("value", startYear);
    d3.select("#d2EndYear").property("value", endYear);
  }

  return allData.filter(d => {
    const inYear = d.YEAR >= startYear && d.YEAR <= endYear;
    const inJuris = jurisdiction === "All" || d.JURISDICTION === jurisdiction;
    return inYear && inJuris;
  });
}

function d2UpdateKpis(data) {
  const totalTests    = d3.sum(data, d => d["Alcohol drug tests"]);
  const totalPositive = d3.sum(data, d => d["Positive drug tests"]);
  const rate          = totalTests > 0 ? (totalPositive / totalTests) * 100 : 0;

  const byJuris = Array.from(
    d3.rollup(data,
      vs => ({ tests: d3.sum(vs, d => d["Alcohol drug tests"]), positive: d3.sum(vs, d => d["Positive drug tests"]) }),
      d => d.JURISDICTION
    ),
    ([name, v]) => ({ name, rate: v.tests > 0 ? (v.positive / v.tests) * 100 : 0 })
  ).sort((a, b) => b.rate - a.rate);

  const topJuris = byJuris[0] ?? null;
  const s = d3.select("#d2StartYear").property("value");
  const e = d3.select("#d2EndYear").property("value");

  d3.select("#d2KpiTests").text(d2FormatM(totalTests));
  d3.select("#d2KpiTestsNote").text(`${s}–${e}`);
  d3.select("#d2KpiPositive").text(d2FormatK(totalPositive));
  d3.select("#d2KpiPositiveNote").text("Total confirmed positives");
  d3.select("#d2KpiRate").text(totalTests > 0 ? d2FormatPct(rate) : "--");
  d3.select("#d2KpiRateNote").text("Positive / all tests");
  d3.select("#d2KpiTopJurisdiction").text(topJuris ? topJuris.name : "--");
  d3.select("#d2KpiTopNote").text(topJuris ? `${d2FormatPct(topJuris.rate)} positivity` : "No data");
}

function d2DrawGroupedBar(data) {
  const svg = d3.select("#d2GroupedBar");
  const margin = { top: 34, right: 28, bottom: 82, left: 90 };
  const outerW = 760; const outerH = 430;
  const W = outerW - margin.left - margin.right; const H = outerH - margin.top - margin.bottom;
  const t = svg.transition().duration(D2_DURATION).ease(d2Ease);

  svg.attr("width", outerW).attr("height", outerH);

  let root = svg.select("g.d2-bar-root");
  if (root.empty()) root = svg.append("g").attr("class", "d2-bar-root");
  root.attr("transform", `translate(${margin.left},${margin.top})`);

  const agg = D2_JURISDICTION_ORDER.map(j => {
    const rows = data.filter(d => d.JURISDICTION === j);
    return rows.length ? { jurisdiction: j, fines: d3.sum(rows, d => d["Speeding Fines"]), tests: d3.sum(rows, d => d["Alcohol drug tests"]) } : null;
  }).filter(Boolean).sort((a, b) => b.fines - a.fines);

  if (!agg.length) {
    root.selectAll("*").remove();
    root.append("text").attr("x", W / 2).attr("y", H / 2).attr("text-anchor", "middle").text("No data");
    return;
  }

  const series = ["fines", "tests"];
  const seriesLabels = { fines: "Speeding Fines", tests: "Drug Tests" };
  const seriesColors = { fines: "#F15A24", tests: "#2196F3" };

  const x0 = d3.scaleBand().domain(agg.map(d => d.jurisdiction)).range([0, W]).paddingInner(0.28).paddingOuter(0.1);
  const x1 = d3.scaleBand().domain(series).range([0, x0.bandwidth()]).padding(0.08);

  const maxVal = d3.max(agg, d => Math.max(d.fines, d.tests));
  const y = d3.scaleLinear().domain([0, maxVal * 1.18]).nice().range([H, 0]);

  root.selectAll("g.d2-bar-grid").data([null]).join("g").attr("class", "grid d2-bar-grid")
    .transition(t).call(d3.axisLeft(y).ticks(5).tickSize(-W).tickFormat("")).call(g => g.select(".domain").remove());

  const xAxis = root.selectAll("g.d2-bar-x").data([null]).join("g").attr("class", "axis x-axis d2-bar-x").attr("transform", `translate(0,${H})`);
  xAxis.transition(t).call(d3.axisBottom(x0));
  xAxis.selectAll("text").attr("transform", "rotate(-34)").style("text-anchor", "end");

  root.selectAll("g.d2-bar-y").data([null]).join("g").attr("class", "axis y-axis d2-bar-y")
    .transition(t).call(d3.axisLeft(y).ticks(5).tickFormat(d => `${d / 1_000_000}M`));

  root.selectAll("text.d2-bar-ylabel").data([null]).join("text").attr("class", "chart-title-label d2-bar-ylabel")
    .attr("x", -H / 2).attr("y", -68).attr("transform", "rotate(-90)").attr("text-anchor", "middle").text("Count");

  const groups = root.selectAll("g.d2-bar-group").data(agg, d => d.jurisdiction).join("g").attr("class", "d2-bar-group").attr("transform", d => `translate(${x0(d.jurisdiction)},0)`);

  groups.each(function (gd) {
    const g = d3.select(this);
    series.forEach((key, si) => {
      const bars = g.selectAll(`rect.d2-bar-${key}`).data([gd]);
      bars.enter().append("rect").attr("class", `d2-bar-${key}`).attr("x", x1(key)).attr("width", x1.bandwidth()).attr("y", H).attr("height", 0)
        .attr("fill", seriesColors[key]).attr("rx", 4)
        .on("mousemove", (event, d) => d2ShowTooltip(event, `<strong>${d.jurisdiction}</strong><br>${seriesLabels[key]}: ${d2FormatNum(d[key])}<br>(${d2FormatM(d[key])})`))
        .on("mouseleave", d2HideTooltip)
        .merge(bars).transition(t).delay(si * D2_STAGGER).attr("x", x1(key)).attr("width", x1.bandwidth()).attr("y", d => y(d[key])).attr("height", d => H - y(d[key]));
    });
  });

  root.selectAll("g.d2-bar-legend").data([null]).join("g").attr("class", "d2-bar-legend").attr("transform", `translate(${W - 160},-24)`)
    .call(lg => {
      lg.selectAll("*").remove();
      series.forEach((key, i) => {
        const lItem = lg.append("g").attr("transform", `translate(${i * 82},0)`);
        lItem.append("rect").attr("width", 14).attr("height", 14).attr("rx", 3).attr("fill", seriesColors[key]);
        lItem.append("text").attr("x", 18).attr("y", 11).attr("font-size", 11).attr("fill", "#374151").text(seriesLabels[key]);
      });
    });
}

function d2DrawAreaChart(data) {
  const svg = d3.select("#d2AreaChart");
  const margin = { top: 34, right: 150, bottom: 56, left: 78 };
  const outerW = 760; const outerH = 430;
  const W = outerW - margin.left - margin.right; const H = outerH - margin.top - margin.bottom;
  const t = svg.transition().duration(D2_DURATION).ease(d2Ease);

  svg.attr("width", outerW).attr("height", outerH);

  let root = svg.select("g.d2-area-root");
  if (root.empty()) root = svg.append("g").attr("class", "d2-area-root");
  root.attr("transform", `translate(${margin.left},${margin.top})`);

  const jurisdiction = d3.select("#d2JurisdictionSelect").property("value");
  const jurisdictions = jurisdiction === "All" ? D2_JURISDICTION_ORDER.filter(j => data.some(d => d.JURISDICTION === j)) : [jurisdiction];
  const years = Array.from(new Set(data.map(d => d.YEAR))).sort((a, b) => a - b);

  if (!years.length || !jurisdictions.length) {
    root.selectAll("*").remove();
    root.append("text").attr("x", W / 2).attr("y", H / 2).attr("text-anchor", "middle").text("No data");
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

  root.selectAll("g.d2-area-grid").data([null]).join("g").attr("class", "grid d2-area-grid")
    .transition(t).call(d3.axisLeft(y).ticks(5).tickSize(-W).tickFormat("")).call(g => g.select(".domain").remove());

  root.selectAll("g.d2-area-x").data([null]).join("g").attr("class", "axis x-axis d2-area-x").attr("transform", `translate(0,${H})`)
    .transition(t).call(d3.axisBottom(x).tickFormat(d3.format("d")));

  root.selectAll("g.d2-area-y").data([null]).join("g").attr("class", "axis y-axis d2-area-y")
    .transition(t).call(d3.axisLeft(y).ticks(5).tickFormat(d2FormatK));

  root.selectAll("text.d2-area-ylabel").data([null]).join("text").attr("class", "chart-title-label d2-area-ylabel")
    .attr("x", -H / 2).attr("y", -56).attr("transform", "rotate(-90)").attr("text-anchor", "middle").text("Positive tests");

  const areaGen = d3.area().x(d => x(d.data.year)).y0(d => y(d[0])).y1(d => y(d[1])).curve(d3.curveMonotoneX);
  const lineGen = d3.line().x(d => x(d.data.year)).y(d => y(d[1])).curve(d3.curveMonotoneX);

  root.selectAll("path.d2-area").data(stacked, d => d.key).join(
    enter => enter.append("path").attr("class", "d2-area").attr("fill", d => D2_JURISDICTION_COLORS[d.key] || "#999").attr("fill-opacity", 0.35).attr("d", d => areaGen(d.map(p => ({ ...p, data: { ...p.data, year: p.data.year } })))),
    update => update.transition(t).attr("fill", d => D2_JURISDICTION_COLORS[d.key] || "#999").attr("d", areaGen),
    exit => exit.remove()
  );

  root.selectAll("path.d2-area-line").data(stacked, d => d.key).join(
    enter => enter.append("path").attr("class", "d2-area-line").attr("fill", "none").attr("stroke", d => D2_JURISDICTION_COLORS[d.key] || "#999").attr("stroke-width", 2).attr("d", lineGen),
    update => update.transition(t).attr("stroke", d => D2_JURISDICTION_COLORS[d.key] || "#999").attr("d", lineGen),
    exit => exit.remove()
  );

  root.selectAll("rect.d2-area-hover").data(years).join("rect").attr("class", "d2-area-hover")
    .attr("x", yr => (x(yr) ?? 0) - x.step() / 2).attr("y", 0).attr("width", x.step()).attr("height", H).attr("fill", "transparent").style("cursor", "crosshair")
    .on("mousemove", (event, yr) => {
      const parts = jurisdictions.map(j => { const v = lookup.get(`${yr}-${j}`) ?? 0; return `<span style="color:${D2_JURISDICTION_COLORS[j] || '#999'}">${j}: ${d2FormatNum(v)}</span>`; }).join("<br>");
      d2ShowTooltip(event, `<strong>${yr}</strong><br>${parts}`);
    })
    .on("mouseleave", d2HideTooltip);

  const legendG = root.selectAll("g.d2-area-legend").data([null]).join("g").attr("class", "d2-area-legend").attr("transform", `translate(${W + 14},0)`);
  legendG.selectAll("*").remove();
  jurisdictions.forEach((j, i) => {
    const item = legendG.append("g").attr("transform", `translate(0,${i * 20})`);
    item.append("rect").attr("width", 12).attr("height", 12).attr("rx", 2).attr("fill", D2_JURISDICTION_COLORS[j] || "#999").attr("fill-opacity", 0.75);
    item.append("text").attr("x", 16).attr("y", 10).attr("font-size", 11).attr("fill", "#374151").text(j);
  });
}

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
    container.append("p").attr("class", "heatmap-empty").style("padding", "24px").style("text-align", "center").text("No data available.");
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

  // FIXED MARGIN: Extended right margin to 180 to perfectly fit the legend
  const margin = { top: 54, right: 180, bottom: 62, left: 92 };
  const totalWidth = 1160;
  const totalHeight = Math.max(360, 96 + jurisdictions.length * 42);
  const innerWidth = totalWidth - margin.left - margin.right;
  const innerHeight = totalHeight - margin.top - margin.bottom;

  const svg = container.append("svg")
    .attr("class", "drug-outcome-style-heatmap")
    .attr("width", totalWidth).attr("height", totalHeight)
    .attr("viewBox", `0 0 ${totalWidth} ${totalHeight}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

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

  inner.selectAll(".heatmap-cell").data(cells, d => `${d.year}-${d.jur}`).join(
    enter => enter.append("rect").attr("class", "heatmap-cell")
      .attr("x", d => d.xi * cellWidth).attr("y", d => d.yi * cellHeight)
      .attr("width", Math.max(0, cellWidth - 3)).attr("height", Math.max(0, cellHeight - 3))
      .attr("rx", 8).style("cursor", "pointer").attr("fill", "#E5E7EB").attr("opacity", 0)
      .call(e => e.transition().duration(600).ease(d3.easeCubicOut).attr("fill", d => d.active ? colorScale(d.val) : "#E5E7EB").attr("opacity", 1)),
    update => update.call(u => u.transition().duration(600).ease(d3.easeCubicOut).attr("fill", d => d.active ? colorScale(d.val) : "#E5E7EB")),
    exit => exit.call(e => e.transition().duration(600).attr("opacity", 0).remove())
  )
  .on("mouseover", (event, d) => {
    d3.select(event.currentTarget).attr("stroke", "#111827").attr("stroke-width", 2);
    // FIXED FORMATTING: Upgrade the hover state to show cleaner text formatting
    const displayValue = d.active ? `${d2FormatNum(d.val)} (${d2FormatK(d.val)})` : "No record";
    d2ShowTooltip(event, `<strong>${d.jur} — ${d.year}</strong><br>Positive tests: ${displayValue}`);
  })
  .on("mousemove", event => d2GetTooltip().style("left", `${event.clientX + 14}px`).style("top", `${event.clientY - 28}px`))
  .on("mouseout", event => { d3.select(event.currentTarget).attr("stroke", "none"); d2HideTooltip(); });

  inner.selectAll(".cell-label").data(cells, d => `${d.year}-${d.jur}`).join(
    enter => enter.append("text").attr("class", "cell-label")
      .attr("x", d => d.xi * cellWidth + cellWidth / 2).attr("y", d => d.yi * cellHeight + cellHeight / 2 + 5)
      .attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", 800).attr("opacity", 0)
      .attr("fill", d => (d.active && d.val > maxVal * 0.55) ? "#fff" : "#222")
      // FIXED FORMATTING: Use d2FormatK (e.g. 15.2k) instead of full strings
      .text(d => d.active && d.val > 0 ? d2FormatK(d.val) : "–") 
      .call(e => e.transition().duration(600).ease(d3.easeCubicOut).attr("opacity", 1)),
    update => update.call(u => u.transition().duration(600).ease(d3.easeCubicOut)
      .attr("x", d => d.xi * cellWidth + cellWidth / 2).attr("y", d => d.yi * cellHeight + cellHeight / 2 + 5)
      .attr("fill", d => (d.active && d.val > maxVal * 0.55) ? "#fff" : "#222")
      // FIXED FORMATTING: Apply to update block as well
      .text(d => d.active && d.val > 0 ? d2FormatK(d.val) : "–")),
    exit => exit.call(e => e.transition().duration(600).attr("opacity", 0).remove())
  );

  const xScale = d3.scalePoint().domain(years).range([cellWidth / 2, innerWidth - cellWidth / 2]);
  const yScale = d3.scalePoint().domain(jurisdictions).range([cellHeight / 2, innerHeight - cellHeight / 2]);

  inner.append("g").attr("class", "axis-x").attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format("d"))).call(g => g.select(".domain").remove());
  inner.append("g").attr("class", "axis-y").call(d3.axisLeft(yScale)).call(g => g.select(".domain").remove());

  inner.append("text").attr("x", innerWidth / 2).attr("y", innerHeight + 48).attr("text-anchor", "middle").attr("font-size", "13px").attr("font-weight", "800").attr("fill", "#111827").text("Year");
  inner.append("text").attr("transform", "rotate(-90)").attr("x", -innerHeight / 2).attr("y", -68).attr("text-anchor", "middle").attr("font-size", "13px").attr("font-weight", "800").attr("fill", "#111827").text("Jurisdiction");

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
  d3.select("#d2HeatmapInsight").text(maxCell ? `${maxCell.jur} in ${maxCell.year} had the highest positive drug test count (${d3.format(",")(maxCell.val)}).` : "No insight.");
}

function d2UpdateDashboard(allData) {
  const filtered = d2GetFiltered(allData);
  d2UpdateKpis(filtered);
  d2DrawGroupedBar(filtered);
  d2DrawAreaChart(filtered);
  d2DrawHeatmap(filtered, allData);
}

function d2InitFilters(allData) {
  const years = Array.from(new Set(allData.map(d => d.YEAR))).sort((a, b) => a - b);
  const jurisdictions = D2_JURISDICTION_ORDER.filter(j => allData.some(d => d.JURISDICTION === j));
  const startSel = d3.select("#d2StartYear"); const endSel = d3.select("#d2EndYear"); const jurisSel = d3.select("#d2JurisdictionSelect");

  startSel.selectAll("option").data(years).join("option").attr("value", d => d).text(d => d);
  endSel.selectAll("option").data(years).join("option").attr("value", d => d).text(d => d);
  jurisSel.selectAll("option").data(["All", ...jurisdictions]).join("option").attr("value", d => d).text(d => d === "All" ? "All jurisdictions" : d);

  startSel.property("value", years[0]); endSel.property("value", years[years.length - 1]); jurisSel.property("value", "All");

  startSel.on("change", () => d2UpdateDashboard(allData)); endSel.on("change", () => d2UpdateDashboard(allData)); jurisSel.on("change", () => d2UpdateDashboard(allData));

  d3.select("#d2ResetFilters").on("click", () => {
    startSel.property("value", years[0]); endSel.property("value", years[years.length - 1]); jurisSel.property("value", "All");
    d2UpdateDashboard(allData);
  });
}

function d2InitInfoTooltips() {
  d3.selectAll(".info-dot").on("mousemove", function (event) { d2ShowTooltip(event, d3.select(this).attr("data-info")); }).on("mouseleave", d2HideTooltip);
}

function initDrugDashboard() {
  const run = allData => {
    if (d3.select("#drug-dashboard").empty()) return;
    if (!allData || !allData.length) return;
    d2Tooltip = d3.select("#d2Tooltip");
    d2InitFilters(allData);
    d2InitInfoTooltips();
    d2UpdateDashboard(allData);
  };
  if (window.appData) run(window.appData); else window.appDataPromise.then(run).catch(err => console.error("Error:", err));
}

function renderDashboard2Page() {
  initDrugDashboard();
}