// Speeding Enforcement Dashboard
// Loads data/final.csv using D3 and renders KPI cards, line chart, lollipop chart, and HTML heatmap.

const SPEEDING_DATA_FILE = "data/final.csv";
const JURISDICTION_ORDER = ["VIC", "NSW", "QLD", "WA", "SA", "ACT", "TAS", "NT"];

let speedingTooltip = null;

const formatNumber = d3.format(",");
const formatMillions = value => `${d3.format(".2~f")((value || 0) / 1000000)}M`;
const formatPercent = value => `${value >= 0 ? "+" : ""}${d3.format(".1f")(value)}%`;

function normaliseKey(key) {
  return String(key)
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getColumnValue(row, possibleNames, requiredWords = []) {
  const entries = Object.entries(row);

  for (const name of possibleNames) {
    const target = normaliseKey(name);
    for (const [key, value] of entries) {
      if (normaliseKey(key) === target) return value;
    }
  }

  if (requiredWords.length > 0) {
    for (const [key, value] of entries) {
      const cleanKey = normaliseKey(key);
      const matches = requiredWords.every(word => cleanKey.includes(normaliseKey(word)));
      if (matches) return value;
    }
  }

  return "";
}

function parseCsvNumber(value) {
  const parsed = +String(value)
    .replace(/,/g, "")
    .replace(/\s/g, "")
    .trim();

  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanDataRow(row) {
  return {
    YEAR: parseCsvNumber(getColumnValue(row, ["YEAR", "Year", "year"], ["year"])),
    JURISDICTION: String(getColumnValue(row, ["JURISDICTION", "Jurisdiction", "jurisdiction"], ["jurisdiction"])).trim(),
    "Speeding Fines": parseCsvNumber(
      getColumnValue(
        row,
        [
          "SpeedingFines",
          "Speeding Fines",
          "Speeding fines",
          "SPEEDING FINES",
          "speeding_fines",
          "Speeding_Fines",
          "Speeding fine records",
          "Speeding fine"
        ],
        ["speeding", "fines"]
      )
    ),
    "Alcohol drug tests": parseCsvNumber(
      getColumnValue(
        row,
        [
          "Alcohol_drug_tests",
          "Alcohol drug tests",
          "Alcohol Drug Tests",
          "ALCOHOL DRUG TESTS",
          "alcohol_drug_tests"
        ],
        ["alcohol", "drug", "tests"]
      )
    ),
    "Positive drug tests": parseCsvNumber(
      getColumnValue(
        row,
        [
          "Positive_drug_tests",
          "Positive drug tests",
          "Positive Drug Tests",
          "POSITIVE DRUG TESTS",
          "positive_drug_tests"
        ],
        ["positive", "drug", "tests"]
      )
    )
  };
}

function showTooltip(event, html) {
  if (!speedingTooltip || speedingTooltip.empty()) {
    speedingTooltip = d3.select("#speedingTooltip");
  }

  speedingTooltip
    .style("opacity", 1)
    .html(html)
    .style("left", `${event.clientX}px`)
    .style("top", `${event.clientY}px`);
}

function hideTooltip() {
  if (!speedingTooltip || speedingTooltip.empty()) {
    speedingTooltip = d3.select("#speedingTooltip");
  }

  speedingTooltip.style("opacity", 0);
}

function clearSvg(selector) {
  d3.select(selector).selectAll("*").remove();
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

  if (startYear > endYear) {
    [startYear, endYear] = [endYear, startYear];
    d3.select("#startYear").property("value", startYear);
    d3.select("#endYear").property("value", endYear);
  }

  return allData.filter(d => {
    const inYear = d.YEAR >= startYear && d.YEAR <= endYear;
    const inJurisdiction = jurisdiction === "All" || d.JURISDICTION === jurisdiction;
    return inYear && inJurisdiction;
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

  const change =
    peak && latest && peak.value !== 0
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
  clearSvg("#lineChart");

  const svg = d3.select("#lineChart");
  const margin = { top: 34, right: 26, bottom: 56, left: 78 };
  const outerWidth = 760;
  const outerHeight = 430;
  const width = outerWidth - margin.left - margin.right;
  const height = outerHeight - margin.top - margin.bottom;

  svg.attr("width", outerWidth).attr("height", outerHeight);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const values = yearlyTotals(data);

  if (!values.length) {
    g.append("text").attr("x", width / 2).attr("y", height / 2).attr("text-anchor", "middle").text("No data");
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

  g.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(""))
    .call(g => g.select(".domain").remove());

  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${d / 1000000}M`));

  g.append("text")
    .attr("class", "chart-title-label")
    .attr("x", -height / 2)
    .attr("y", -56)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Fines");

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.value))
    .curve(d3.curveMonotoneX);

  g.append("path")
    .datum(values)
    .attr("fill", "none")
    .attr("stroke", "#F15A24")
    .attr("stroke-width", 3)
    .attr("d", line);

  g.selectAll(".line-point")
    .data(values)
    .enter()
    .append("circle")
    .attr("class", "line-point")
    .attr("cx", d => x(d.year))
    .attr("cy", d => y(d.value))
    .attr("r", 7)
    .attr("fill", "#F7931E")
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 2)
    .on("mousemove", (event, d) => {
      showTooltip(event, `<strong>${d.year}</strong><br>Speeding fines: ${formatNumber(d.value)}<br>${formatMillions(d.value)}`);
    })
    .on("mouseleave", hideTooltip);

  g.selectAll(".line-label")
    .data(values)
    .enter()
    .append("text")
    .attr("class", "chart-title-label")
    .attr("x", d => x(d.year))
    .attr("y", d => y(d.value) - 16)
    .attr("text-anchor", "middle")
    .text(d => formatMillions(d.value));
}

function drawLollipopChart(data) {
  clearSvg("#lollipopChart");

  const svg = d3.select("#lollipopChart");
  const margin = { top: 34, right: 28, bottom: 82, left: 78 };
  const outerWidth = 760;
  const outerHeight = 430;
  const width = outerWidth - margin.left - margin.right;
  const height = outerHeight - margin.top - margin.bottom;

  svg.attr("width", outerWidth).attr("height", outerHeight);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const values = jurisdictionTotals(data);

  if (!values.length) {
    g.append("text").attr("x", width / 2).attr("y", height / 2).attr("text-anchor", "middle").text("No data");
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

  g.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(""))
    .call(g => g.select(".domain").remove());

  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-34)")
    .style("text-anchor", "end");

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${d / 1000000}M`));

  g.append("text")
    .attr("class", "chart-title-label")
    .attr("x", -height / 2)
    .attr("y", -56)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Fines");

  g.selectAll(".lollipop-line")
    .data(values)
    .enter()
    .append("line")
    .attr("x1", d => x(d.jurisdiction) + x.bandwidth() / 2)
    .attr("x2", d => x(d.jurisdiction) + x.bandwidth() / 2)
    .attr("y1", height)
    .attr("y2", d => y(d.value))
    .attr("stroke", "#202020")
    .attr("stroke-width", 2)
    .attr("opacity", 0.75);

  g.selectAll(".lollipop-dot")
    .data(values)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.jurisdiction) + x.bandwidth() / 2)
    .attr("cy", d => y(d.value))
    .attr("r", 7)
    .attr("fill", "#F7931E")
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 2)
    .on("mousemove", (event, d) => {
      showTooltip(event, `<strong>${d.jurisdiction}</strong><br>Speeding fines: ${formatNumber(d.value)}<br>${formatMillions(d.value)}`);
    })
    .on("mouseleave", hideTooltip);

  g.selectAll(".lollipop-label")
    .data(values)
    .enter()
    .append("text")
    .attr("class", "chart-title-label")
    .attr("x", d => x(d.jurisdiction) + x.bandwidth() / 2)
    .attr("y", d => y(d.value) - 14)
    .attr("text-anchor", "middle")
    .text(d => formatMillions(d.value));
}

function drawHeatmap(data, allData) {
  const container = d3.select("#heatmapChart");

  if (container.empty()) {
    console.error("Heatmap container not found. Check fine_trend.html has id='heatmapChart'.");
    return;
  }

  try {
    const startYear = +d3.select("#startYear").property("value");
    const endYear = +d3.select("#endYear").property("value");
    const selectedJurisdiction = d3.select("#jurisdictionSelect").property("value");

    const years = Array.from(new Set(allData.map(d => d.YEAR)))
      .filter(year => year >= Math.min(startYear, endYear) && year <= Math.max(startYear, endYear))
      .sort((a, b) => a - b);

    const jurisdictions = selectedJurisdiction === "All"
      ? JURISDICTION_ORDER.filter(j => allData.some(d => d.JURISDICTION === j))
      : [selectedJurisdiction];

    const rolledValues = d3.rollup(
      data,
      rows => d3.sum(rows, d => d["Speeding Fines"]),
      d => d.JURISDICTION,
      d => d.YEAR
    );

    const matrix = [];

    jurisdictions.forEach(jurisdiction => {
      years.forEach(year => {
        const hasValue = rolledValues.has(jurisdiction) && rolledValues.get(jurisdiction).has(year);

        matrix.push({
          jurisdiction,
          year,
          value: hasValue ? rolledValues.get(jurisdiction).get(year) : null
        });
      });
    });

    const numericValues = matrix.filter(d => d.value !== null).map(d => d.value);

    if (!numericValues.length) {
      container.html('<p class="heatmap-empty">No heatmap data available.</p>');
      d3.select("#heatmapInsight").text("No heatmap insight available for the selected filters.");
      return;
    }

    const maxValue = d3.max(numericValues) || 1;

    const color = d3.scaleLinear()
      .domain([0, maxValue])
      .range(["#FFF3D1", "#F15A24"]);

    container.selectAll("*").remove();

    const heatmapTable = container
      .append("div")
      .attr("class", "heatmap-table")
      .style("grid-template-columns", `92px repeat(${years.length}, minmax(86px, 1fr))`);

    heatmapTable.append("div")
      .attr("class", "heatmap-corner")
      .text("Jurisdiction");

    heatmapTable.selectAll(".heatmap-year")
      .data(years)
      .enter()
      .append("div")
      .attr("class", "heatmap-year")
      .text(d => d);

    jurisdictions.forEach(jurisdiction => {
      heatmapTable.append("div")
        .attr("class", "heatmap-jurisdiction")
        .text(jurisdiction);

      years.forEach(year => {
        const cell = matrix.find(d => d.jurisdiction === jurisdiction && d.year === year);
        const value = cell ? cell.value : null;
        const isMissing = value === null;

        heatmapTable.append("div")
          .attr("class", `heatmap-cell${isMissing ? " heatmap-missing" : ""}`)
          .style("background-color", isMissing ? "#EDE5CE" : color(value))
          .style("color", !isMissing && value > maxValue * 0.55 ? "#ffffff" : "#222222")
          .html(isMissing ? "N/A" : `<strong>${formatMillions(value)}</strong>`)
          .on("mousemove", event => {
            const valueText = isMissing ? "No record" : `${formatNumber(value)} (${formatMillions(value)})`;
            showTooltip(event, `<strong>${jurisdiction} — ${year}</strong><br>Speeding fines: ${valueText}`);
          })
          .on("mouseleave", hideTooltip);
      });
    });

    const legend = container.append("div").attr("class", "heatmap-legend");
    legend.append("span").text("Lower");
    legend.append("div").attr("class", "heatmap-legend-bar");
    legend.append("span").text("Higher");

    const maxCell = d3.greatest(matrix.filter(d => d.value !== null), d => d.value);

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

    console.log("Heatmap rendered:", matrix.length, "cells");
  } catch (error) {
    console.error("Heatmap failed to render, leaving fallback heatmap visible:", error);
  }
}

function updateDashboard(allData) {
  const filtered = getFilteredData(allData);
  updateKpis(filtered);
  drawLineChart(filtered);
  drawLollipopChart(filtered);
  drawHeatmap(filtered, allData);
}

function initFilters(data) {
  d3.select("#startYear").selectAll("*").remove();
  d3.select("#endYear").selectAll("*").remove();
  d3.select("#jurisdictionSelect").selectAll("*").remove();

  const years = Array.from(new Set(data.map(d => d.YEAR))).sort((a, b) => a - b);
  const jurisdictions = JURISDICTION_ORDER.filter(j => data.some(d => d.JURISDICTION === j));

  d3.select("#startYear")
    .selectAll("option")
    .data(years)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d);

  d3.select("#endYear")
    .selectAll("option")
    .data(years)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d);

  d3.select("#startYear").property("value", d3.min(years));
  d3.select("#endYear").property("value", d3.max(years));

  d3.select("#jurisdictionSelect")
    .selectAll("option")
    .data(["All", ...jurisdictions])
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d === "All" ? "All jurisdictions" : d);
}

function initSpeedingOverview() {
  const page = d3.select(".speeding-dashboard-page");

  if (page.empty()) return;

  speedingTooltip = d3.select("#speedingTooltip");
  if (speedingTooltip.empty()) {
    page.append("div").attr("id", "speedingTooltip").attr("class", "chart-tooltip");
    speedingTooltip = d3.select("#speedingTooltip");
  }

  page.selectAll(".dashboard-load-error").remove();

  d3.csv(SPEEDING_DATA_FILE)
    .then(rawData => {
      const data = rawData
        .map(cleanDataRow)
        .filter(d => d.YEAR && d.JURISDICTION);

      console.log("Loaded speeding dashboard data:", data);
      console.log("Total speeding fines:", d3.sum(data, d => d["Speeding Fines"]));

      initFilters(data);
      updateDashboard(data);

      d3.selectAll("#startYear, #endYear, #jurisdictionSelect")
        .on("change", () => updateDashboard(data));

      d3.select("#resetFilters")
        .on("click", () => {
          const years = Array.from(new Set(data.map(d => d.YEAR))).sort((a, b) => a - b);
          d3.select("#startYear").property("value", d3.min(years));
          d3.select("#endYear").property("value", d3.max(years));
          d3.select("#jurisdictionSelect").property("value", "All");
          updateDashboard(data);
        });
    })
    .catch(error => {
      console.error("Dataset could not be loaded:", error);
      d3.select(".story-dashboard")
        .append("div")
        .attr("class", "story-chart-card dashboard-load-error")
        .style("margin-top", "24px")
        .html(`
          <h2>Dataset could not be loaded</h2>
          <p>Please make sure <strong>${SPEEDING_DATA_FILE}</strong> is inside the data folder and run the site through <strong>index.html</strong> using Live Server.</p>
        `);
    });
}

function renderFineTrendPage() {
  initSpeedingOverview();
}
