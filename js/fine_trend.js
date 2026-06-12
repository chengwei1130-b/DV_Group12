// Speeding Enforcement Story
// This file renders the Page 1 dashboard after fine_trend.html is injected into #content-container.
// The heatmap uses the same D3 SVG pattern as the original drug_outcome.js chart,
// but the implementation is kept here so the page has one self-contained renderer.

const SPEEDING_DATA_FILE = "data/final.csv";
const JURISDICTION_ORDER = ["VIC", "NSW", "QLD", "WA", "SA", "ACT", "TAS", "NT"];

const CHART_ANIMATION_DURATION = 420;
const CHART_STAGGER_DELAY = 18;
const chartEase = d3.easeCubicOut;

const formatNumber = d3.format(",");
const formatMillions = value => `${d3.format(".2~f")((value || 0) / 1000000)}M`;
const formatPercent = value => `${value >= 0 ? "+" : ""}${d3.format(".1f")(value)}%`;

let speedingTooltip = null;

function cleanDataRow(row) {
  return {
    YEAR: +row.YEAR,
    JURISDICTION: String(row.JURISDICTION).trim(),
    "Speeding Fines": +row.SpeedingFines || 0,
    "Alcohol drug tests": +row.Alcohol_drug_tests || 0,
    "Positive drug tests": +row.Positive_drug_tests || 0
  };
}

function getTooltip() {
  if (!speedingTooltip || speedingTooltip.empty()) {
    speedingTooltip = d3.select("#speedingTooltip");
  }
  return speedingTooltip;
}

function showTooltip(event, html) {
  getTooltip()
    .style("opacity", 1)
    .html(html)
    .style("left", `${event.clientX}px`)
    .style("top", `${event.clientY}px`);
}

function hideTooltip() {
  getTooltip().style("opacity", 0);
}

function sumBy(data, key, valueKey) {
  return Array.from(
    d3.rollup(
      data,
      values => d3.sum(values, d => d[valueKey]),
      d => d[key]
    ),
    ([name, value]) => ({ name, value })
  );
}

function getFilteredData(allData) {
  let startYear = +d3.select("#startYear").property("value");
  let endYear = +d3.select("#endYear").property("value");
  const jurisdiction = d3.select("#jurisdictionSelect").property("value");

  // Keep filters valid if users select the years in reverse order.
  if (startYear > endYear) {
    [startYear, endYear] = [endYear, startYear];
    d3.select("#startYear").property("value", startYear);
    d3.select("#endYear").property("value", endYear);
  }

  return allData.filter(d => {
    const inYearRange = d.YEAR >= startYear && d.YEAR <= endYear;
    const inJurisdiction = jurisdiction === "All" || d.JURISDICTION === jurisdiction;
    return inYearRange && inJurisdiction;
  });
}

function yearlyTotals(data) {
  return sumBy(data, "YEAR", "Speeding Fines")
    .map(d => ({ year: +d.name, value: d.value }))
    .sort((a, b) => a.year - b.year);
}

function jurisdictionTotals(data) {
  return sumBy(data, "JURISDICTION", "Speeding Fines")
    .map(d => ({ jurisdiction: d.name, value: d.value }))
    .sort((a, b) => b.value - a.value);
}

function updateKpis(data) {
  const byYear = yearlyTotals(data);
  const byJurisdiction = jurisdictionTotals(data);

  const total = d3.sum(data, d => d["Speeding Fines"]);
  const peak = byYear.length ? d3.greatest(byYear, d => d.value) : null;
  const latest = byYear.length ? byYear[byYear.length - 1] : null;
  const topJurisdiction = byJurisdiction.length ? byJurisdiction[0] : null;

  const change = peak && latest && peak.value !== 0
    ? ((latest.value - peak.value) / peak.value) * 100
    : null;

  const selectedStart = d3.select("#startYear").property("value");
  const selectedEnd = d3.select("#endYear").property("value");

  d3.select("#kpiTotalFines").text(formatMillions(total));
  d3.select("#kpiTotalNote").text(`${selectedStart}–${selectedEnd}`);

  d3.select("#kpiPeakYear").text(peak ? peak.year : "--");
  d3.select("#kpiPeakNote").text(peak ? `${formatMillions(peak.value)} fines` : "No data");

  d3.select("#kpiTopJurisdiction").text(topJurisdiction ? topJurisdiction.jurisdiction : "--");
  d3.select("#kpiTopNote").text(topJurisdiction ? `${formatMillions(topJurisdiction.value)} fines` : "No data");

  d3.select("#kpiChange").text(change === null ? "--" : formatPercent(change));
  d3.select("#kpiChangeNote").text(peak && latest ? `${peak.year} to ${latest.year}` : "No data");

  d3.select("#lineInsight").text(
    peak && latest
      ? `Speeding fines peaked in ${peak.year} at ${formatMillions(peak.value)}, then reached ${formatMillions(latest.value)} in ${latest.year}.`
      : "No data available for the selected filters."
  );

  const topThree = byJurisdiction.slice(0, 3).map(d => d.jurisdiction).join(", ");
  d3.select("#jurisdictionInsight").text(
    topJurisdiction
      ? `${topThree} recorded the highest total speeding fines in the selected period.`
      : "No jurisdiction data available for the selected filters."
  );

  d3.select("#summaryOne").text(
    peak
      ? `Speeding fines peaked in ${peak.year} during the selected period.`
      : "No yearly peak could be calculated."
  );

  d3.select("#summaryTwo").text(
    topJurisdiction
      ? `${topJurisdiction.jurisdiction} recorded the highest total speeding fines.`
      : "No top jurisdiction could be calculated."
  );
}

function drawLineChart(data) {
  const svg = d3.select("#lineChart");
  const margin = { top: 34, right: 26, bottom: 56, left: 78 };
  const outerWidth = 760;
  const outerHeight = 430;
  const width = outerWidth - margin.left - margin.right;
  const height = outerHeight - margin.top - margin.bottom;
  const values = yearlyTotals(data);
  const transition = svg.transition().duration(CHART_ANIMATION_DURATION).ease(chartEase);

  svg.attr("width", outerWidth).attr("height", outerHeight);

  let root = svg.select("g.line-chart-root");
  if (root.empty()) {
    root = svg.append("g").attr("class", "line-chart-root");
  }
  root.attr("transform", `translate(${margin.left},${margin.top})`);

  if (!values.length) {
    root.selectAll("*").remove();
    root.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .text("No data");
    return;
  }

  const x = d3.scalePoint()
    .domain(values.map(d => d.year))
    .range([0, width])
    .padding(0.5);

  const y = d3.scaleLinear()
    .domain([0, d3.max(values, d => d.value) * 1.18])
    .nice()
    .range([height, 0]);

  root.selectAll("g.grid")
    .data([null])
    .join("g")
    .attr("class", "grid")
    .transition(transition)
    .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(""))
    .call(g => g.select(".domain").remove());

  root.selectAll("g.x-axis")
    .data([null])
    .join("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0,${height})`)
    .transition(transition)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  root.selectAll("g.y-axis")
    .data([null])
    .join("g")
    .attr("class", "axis y-axis")
    .transition(transition)
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${d / 1000000}M`));

  root.selectAll("text.y-axis-label")
    .data([null])
    .join("text")
    .attr("class", "chart-title-label y-axis-label")
    .attr("x", -height / 2)
    .attr("y", -56)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Fines");

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.value))
    .curve(d3.curveMonotoneX);

  root.selectAll("path.trend-line")
    .data([values])
    .join("path")
    .attr("class", "trend-line")
    .attr("fill", "none")
    .attr("stroke", "#F15A24")
    .attr("stroke-width", 3)
    .transition(transition)
    .attr("d", line);

  const points = root.selectAll("circle.line-point")
    .data(values, d => d.year);

  points.enter()
    .append("circle")
    .attr("class", "line-point")
    .attr("r", 0)
    .attr("fill", "#F7931E")
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 2)
    .on("mousemove", (event, d) => {
      showTooltip(event, `<strong>${d.year}</strong><br>Speeding fines: ${formatNumber(d.value)}<br>${formatMillions(d.value)}`);
    })
    .on("mouseleave", hideTooltip)
    .merge(points)
    .transition(transition)
    .delay((d, i) => i * CHART_STAGGER_DELAY)
    .attr("cx", d => x(d.year))
    .attr("cy", d => y(d.value))
    .attr("r", 7);

  points.exit()
    .transition(transition)
    .attr("r", 0)
    .style("opacity", 0)
    .remove();

  const labels = root.selectAll("text.line-label")
    .data(values, d => d.year);

  labels.enter()
    .append("text")
    .attr("class", "chart-title-label line-label")
    .attr("text-anchor", "middle")
    .style("opacity", 0)
    .merge(labels)
    .text(d => formatMillions(d.value))
    .transition(transition)
    .delay((d, i) => i * CHART_STAGGER_DELAY)
    .attr("x", d => x(d.year))
    .attr("y", d => y(d.value) - 16)
    .style("opacity", 1);

  labels.exit()
    .transition(transition)
    .style("opacity", 0)
    .remove();
}

function drawLollipopChart(data) {
  const svg = d3.select("#lollipopChart");
  const margin = { top: 34, right: 28, bottom: 82, left: 78 };
  const outerWidth = 760;
  const outerHeight = 430;
  const width = outerWidth - margin.left - margin.right;
  const height = outerHeight - margin.top - margin.bottom;
  const values = jurisdictionTotals(data);
  const transition = svg.transition().duration(CHART_ANIMATION_DURATION).ease(chartEase);

  svg.attr("width", outerWidth).attr("height", outerHeight);

  let root = svg.select("g.lollipop-chart-root");
  if (root.empty()) {
    root = svg.append("g").attr("class", "lollipop-chart-root");
  }
  root.attr("transform", `translate(${margin.left},${margin.top})`);

  if (!values.length) {
    root.selectAll("*").remove();
    root.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .text("No data");
    return;
  }

  const x = d3.scaleBand()
    .domain(values.map(d => d.jurisdiction))
    .range([0, width])
    .padding(0.35);

  const y = d3.scaleLinear()
    .domain([0, d3.max(values, d => d.value) * 1.18])
    .nice()
    .range([height, 0]);

  root.selectAll("g.grid")
    .data([null])
    .join("g")
    .attr("class", "grid")
    .transition(transition)
    .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(""))
    .call(g => g.select(".domain").remove());

  const xAxis = root.selectAll("g.x-axis")
    .data([null])
    .join("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0,${height})`);

  xAxis.transition(transition).call(d3.axisBottom(x));
  xAxis.selectAll("text")
    .attr("transform", "rotate(-34)")
    .style("text-anchor", "end");

  root.selectAll("g.y-axis")
    .data([null])
    .join("g")
    .attr("class", "axis y-axis")
    .transition(transition)
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${d / 1000000}M`));

  root.selectAll("text.y-axis-label")
    .data([null])
    .join("text")
    .attr("class", "chart-title-label y-axis-label")
    .attr("x", -height / 2)
    .attr("y", -56)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Fines");

  const stems = root.selectAll("line.lollipop-line")
    .data(values, d => d.jurisdiction);

  stems.enter()
    .append("line")
    .attr("class", "lollipop-line")
    .attr("stroke", "#202020")
    .attr("stroke-width", 2)
    .attr("opacity", 0.75)
    .merge(stems)
    .transition(transition)
    .delay((d, i) => i * CHART_STAGGER_DELAY)
    .attr("x1", d => x(d.jurisdiction) + x.bandwidth() / 2)
    .attr("x2", d => x(d.jurisdiction) + x.bandwidth() / 2)
    .attr("y1", height)
    .attr("y2", d => y(d.value));

  stems.exit()
    .transition(transition)
    .attr("y2", height)
    .style("opacity", 0)
    .remove();

  const dots = root.selectAll("circle.lollipop-dot")
    .data(values, d => d.jurisdiction);

  dots.enter()
    .append("circle")
    .attr("class", "lollipop-dot")
    .attr("r", 0)
    .attr("fill", "#F7931E")
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 2)
    .on("mousemove", (event, d) => {
      showTooltip(event, `<strong>${d.jurisdiction}</strong><br>Speeding fines: ${formatNumber(d.value)}<br>${formatMillions(d.value)}`);
    })
    .on("mouseleave", hideTooltip)
    .merge(dots)
    .transition(transition)
    .delay((d, i) => i * CHART_STAGGER_DELAY)
    .attr("cx", d => x(d.jurisdiction) + x.bandwidth() / 2)
    .attr("cy", d => y(d.value))
    .attr("r", 7)
    .style("opacity", 1);

  dots.exit()
    .transition(transition)
    .attr("r", 0)
    .style("opacity", 0)
    .remove();

  const labels = root.selectAll("text.lollipop-label")
    .data(values, d => d.jurisdiction);

  labels.enter()
    .append("text")
    .attr("class", "chart-title-label lollipop-label")
    .attr("text-anchor", "middle")
    .style("opacity", 0)
    .merge(labels)
    .text(d => formatMillions(d.value))
    .transition(transition)
    .delay((d, i) => i * CHART_STAGGER_DELAY)
    .attr("x", d => x(d.jurisdiction) + x.bandwidth() / 2)
    .attr("y", d => y(d.value) - 14)
    .style("opacity", 1);

  labels.exit()
    .transition(transition)
    .style("opacity", 0)
    .remove();
}

function drawHeatmap(data, allData) {
  // Heatmap logic is kept directly in this page renderer.
  // The placeholder ID remains #drug-outcome-chart because it follows the original drug outcome heatmap structure.
  const container = d3.select("#drug-outcome-chart");
  container.selectAll("*").interrupt().remove();

  if (container.empty()) {
    console.error("Heatmap container not found. Expected #drug-outcome-chart in fine_trend.html.");
    return;
  }

  const startYear = +d3.select("#startYear").property("value");
  const endYear = +d3.select("#endYear").property("value");
  const selectedJurisdiction = d3.select("#jurisdictionSelect").property("value");

  const years = Array.from(new Set(allData.map(d => d.YEAR)))
    .filter(year => year >= Math.min(startYear, endYear) && year <= Math.max(startYear, endYear))
    .sort((a, b) => a - b);

  const jurisdictions = selectedJurisdiction === "All"
    ? JURISDICTION_ORDER.filter(jurisdiction => allData.some(d => d.JURISDICTION === jurisdiction))
    : [selectedJurisdiction];

  if (!years.length || !jurisdictions.length) {
    container.append("p")
      .attr("class", "heatmap-empty")
      .text("No heatmap data available for the selected filters.");
    d3.select("#heatmapInsight").text("No heatmap insight available for the selected filters.");
    return;
  }

  // Build the same lookup-map approach used by the original drug_outcome.js heatmap.
  const dataMap = new Map();
  data.forEach(row => {
    dataMap.set(`${row.YEAR}-${row.JURISDICTION}`, row["Speeding Fines"]);
  });

  const margin = { top: 54, right: 86, bottom: 62, left: 92 };
  const width = 1160;
  const height = Math.max(360, 96 + jurisdictions.length * 42);
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const cellWidth = innerWidth / years.length;
  const cellHeight = innerHeight / jurisdictions.length;

  const maxValue = d3.max(allData, d => d["Speeding Fines"]) || 1;
  const colorScale = d3.scaleSequential()
    .domain([0, maxValue])
    .interpolator(d3.interpolateOranges);

  const svg = container.append("svg")
    .attr("class", "drug-outcome-style-heatmap")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const inner = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const cells = [];
  years.forEach((year, xi) => {
    jurisdictions.forEach((jurisdiction, yi) => {
      const key = `${year}-${jurisdiction}`;
      const value = dataMap.has(key) ? dataMap.get(key) : null;
      cells.push({ year, jurisdiction, value, xi, yi, active: value !== null });
    });
  });

  const tooltip = getTooltip();

  // Cells are rendered with D3 enter/update/exit, matching the original heatmap technique.
  inner.selectAll(".heatmap-cell")
    .data(cells, d => `${d.year}-${d.jurisdiction}`)
    .join(
      enter => enter.append("rect")
        .attr("class", "heatmap-cell")
        .attr("x", d => d.xi * cellWidth)
        .attr("y", d => d.yi * cellHeight)
        .attr("width", Math.max(0, cellWidth - 3))
        .attr("height", Math.max(0, cellHeight - 3))
        .attr("rx", 8)
        .attr("fill", "#E5E7EB")
        .attr("opacity", 0)
        .style("cursor", "pointer")
        .call(enter => enter.transition()
          .duration(CHART_ANIMATION_DURATION)
          .ease(chartEase)
          .attr("fill", d => d.active ? colorScale(d.value) : "#E5E7EB")
          .attr("opacity", 1)),
      update => update.call(update => update.transition()
        .duration(CHART_ANIMATION_DURATION)
        .ease(chartEase)
        .attr("fill", d => d.active ? colorScale(d.value) : "#E5E7EB")
        .attr("opacity", 1)),
      exit => exit.call(exit => exit.transition()
        .duration(CHART_ANIMATION_DURATION)
        .ease(chartEase)
        .attr("opacity", 0)
        .remove())
    )
    .on("mouseover", (event, d) => {
      d3.select(event.currentTarget)
        .attr("stroke", "#111827")
        .attr("stroke-width", 2);

      const displayValue = d.active
        ? `${formatNumber(d.value)} (${formatMillions(d.value)})`
        : "No record";

      tooltip
        .style("opacity", 1)
        .style("left", `${event.clientX}px`)
        .style("top", `${event.clientY}px`)
        .html(`<strong>${d.jurisdiction} — ${d.year}</strong><br>Speeding fines: ${displayValue}`);
    })
    .on("mousemove", event => {
      tooltip
        .style("left", `${event.clientX}px`)
        .style("top", `${event.clientY}px`);
    })
    .on("mouseout", event => {
      d3.select(event.currentTarget).attr("stroke", "none");
      tooltip.style("opacity", 0);
    });

  inner.selectAll(".cell-label")
    .data(cells, d => `${d.year}-${d.jurisdiction}`)
    .join(
      enter => enter.append("text")
        .attr("class", "cell-label")
        .attr("x", d => d.xi * cellWidth + cellWidth / 2 - 1)
        .attr("y", d => d.yi * cellHeight + cellHeight / 2 + 5)
        .attr("text-anchor", "middle")
        .attr("font-size", 12)
        .attr("font-weight", 800)
        .attr("opacity", 0)
        .text(d => d.active ? formatMillions(d.value) : "N/A")
        .call(enter => enter.transition()
          .duration(CHART_ANIMATION_DURATION)
          .ease(chartEase)
          .attr("opacity", 1)),
      update => update.call(update => update.transition()
        .duration(CHART_ANIMATION_DURATION)
        .ease(chartEase)
        .attr("x", d => d.xi * cellWidth + cellWidth / 2 - 1)
        .attr("y", d => d.yi * cellHeight + cellHeight / 2 + 5)
        .attr("fill", d => d.active && d.value > maxValue * 0.55 ? "#fff" : "#222")
        .text(d => d.active ? formatMillions(d.value) : "N/A")),
      exit => exit.call(exit => exit.transition()
        .duration(CHART_ANIMATION_DURATION)
        .attr("opacity", 0)
        .remove())
    )
    .attr("fill", d => d.active && d.value > maxValue * 0.55 ? "#fff" : "#222");

  const xScale = d3.scalePoint()
    .domain(years)
    .range([cellWidth / 2, innerWidth - cellWidth / 2]);

  const yScale = d3.scalePoint()
    .domain(jurisdictions)
    .range([cellHeight / 2, innerHeight - cellHeight / 2]);

  inner.append("g")
    .attr("class", "axis axis-x")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format("d")))
    .call(g => g.select(".domain").remove());

  inner.append("g")
    .attr("class", "axis axis-y")
    .call(d3.axisLeft(yScale))
    .call(g => g.select(".domain").remove());

  inner.append("text")
    .attr("class", "chart-title-label")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 48)
    .attr("text-anchor", "middle")
    .text("Year");

  inner.append("text")
    .attr("class", "chart-title-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -68)
    .attr("text-anchor", "middle")
    .text("Jurisdiction");

  const defs = svg.append("defs");
  const gradient = defs.append("linearGradient")
    .attr("id", "speeding-heatmap-gradient")
    .attr("x1", "0%")
    .attr("x2", "100%");

  gradient.append("stop").attr("offset", "0%").attr("stop-color", colorScale(0));
  gradient.append("stop").attr("offset", "100%").attr("stop-color", colorScale(maxValue));

  const legend = inner.append("g")
    .attr("class", "heatmap-svg-legend")
    .attr("transform", `translate(${innerWidth + 28},22)`);

  legend.append("text")
    .attr("x", 0)
    .attr("y", -8)
    .attr("font-size", 11)
    .attr("font-weight", 800)
    .attr("fill", "#374151")
    .text("Fines");

  legend.append("rect")
    .attr("width", 130)
    .attr("height", 14)
    .attr("rx", 7)
    .attr("fill", "url(#speeding-heatmap-gradient)");

  legend.append("text")
    .attr("x", 0)
    .attr("y", 30)
    .attr("font-size", 10)
    .attr("fill", "#374151")
    .text("Low");

  legend.append("text")
    .attr("x", 130)
    .attr("y", 30)
    .attr("font-size", 10)
    .attr("text-anchor", "end")
    .attr("fill", "#374151")
    .text("High");

  const maxCell = d3.greatest(cells.filter(d => d.active), d => d.value);

  d3.select("#heatmapInsight").text(
    maxCell
      ? `${maxCell.jurisdiction} in ${maxCell.year} shows the highest year-by-jurisdiction speeding fine total in the selected view.`
      : "No heatmap insight available for the selected filters."
  );

  d3.select("#summaryThree").text(
    maxCell
      ? `The heatmap highlights ${maxCell.jurisdiction} in ${maxCell.year} as the strongest selected concentration.`
      : "The heatmap shows how the pattern varies across both year and jurisdiction."
  );
}

function updateDashboard(allData) {
  const filtered = getFilteredData(allData);

  updateKpis(filtered);
  drawLineChart(filtered);
  drawLollipopChart(filtered);
  drawHeatmap(filtered, allData);
}

function initFilters(allData) {
  const years = Array.from(new Set(allData.map(d => d.YEAR))).sort((a, b) => a - b);
  const jurisdictions = JURISDICTION_ORDER.filter(jurisdiction => allData.some(d => d.JURISDICTION === jurisdiction));

  const startSelect = d3.select("#startYear");
  const endSelect = d3.select("#endYear");
  const jurisdictionSelect = d3.select("#jurisdictionSelect");

  startSelect.selectAll("option")
    .data(years)
    .join("option")
    .attr("value", d => d)
    .text(d => d);

  endSelect.selectAll("option")
    .data(years)
    .join("option")
    .attr("value", d => d)
    .text(d => d);

  jurisdictionSelect.selectAll("option")
    .data(["All", ...jurisdictions])
    .join("option")
    .attr("value", d => d)
    .text(d => d === "All" ? "All jurisdictions" : d);

  startSelect.property("value", years[0]);
  endSelect.property("value", years[years.length - 1]);
  jurisdictionSelect.property("value", "All");

  startSelect.on("change", () => updateDashboard(allData));
  endSelect.on("change", () => updateDashboard(allData));
  jurisdictionSelect.on("change", () => updateDashboard(allData));

  d3.select("#resetFilters").on("click", () => {
    startSelect.property("value", years[0]);
    endSelect.property("value", years[years.length - 1]);
    jurisdictionSelect.property("value", "All");
    updateDashboard(allData);
  });
}

function initInfoTooltips() {
  d3.selectAll(".info-dot")
    .on("mousemove", function (event) {
      showTooltip(event, d3.select(this).attr("data-info"));
    })
    .on("mouseleave", hideTooltip);
}

function initSpeedingOverview() {
  const dataPromise = window.appDataPromise || d3.csv(SPEEDING_DATA_FILE);

  dataPromise.then(rawData => {
    const allData = rawData
      .map(row => row["Speeding Fines"] !== undefined ? row : cleanDataRow(row))
      .filter(d => d.YEAR && d.JURISDICTION);

    if (!allData.length) {
      d3.select("#fine-trend").append("p").text("No dashboard data available.");
      return;
    }

    speedingTooltip = d3.select("#speedingTooltip");

    initFilters(allData);
    initInfoTooltips();
    updateDashboard(allData);
  });
}

// Called by js/script.js after fine_trend.html is injected into #content-container.
function renderFineTrendPage() {
  initSpeedingOverview();
}
