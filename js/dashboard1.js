// ─────────────────────────────────────────────────────────────────────────────
// js/dashboard1.js - Core Dashboard Logic & Shared Constants
// ─────────────────────────────────────────────────────────────────────────────

const JURISDICTION_ORDER = ["VIC", "NSW", "QLD", "WA", "SA", "ACT", "TAS", "NT"];
const CHART_ANIMATION_DURATION = 420;
const CHART_STAGGER_DELAY = 18;
const chartEase = d3.easeCubicOut;

const formatNumber    = d3.format(",");
const formatMillions  = value => `${d3.format(".2~f")((value || 0) / 1_000_000)}M`;
const formatPercent   = value => `${value >= 0 ? "+" : ""}${d3.format(".1f")(value)}%`;

// ─────────────────────────────────────────────────────────────────────────────
// Shared KPI delta helper (used by both dashboard1.js and dashboard2.js)
// Builds a colored "+/-" badge comparing a filtered KPI value against the
// equivalent value computed from the single YEAR IMMEDIATELY BEFORE the
// selected start year (same jurisdiction filter). Returns "" when there is no
// meaningful difference (e.g. filters are at their default state).
// ─────────────────────────────────────────────────────────────────────────────
function formatKpiDelta(current, base, opts = {}) {
  const { isPercentagePoints = false, label = "vs previous year", decimals = 1 } = opts;
  if (current === null || current === undefined || base === null || base === undefined) return "";

  const diff = current - base;
  const threshold = isPercentagePoints ? 0.05 : 0.5;
  if (Math.abs(diff) < threshold) return "";

  const direction = diff > 0 ? "up" : "down";
  const arrow = diff > 0 ? "▲" : "▼";
  const sign = diff > 0 ? "+" : "−";
  const absDiff = Math.abs(diff);

  const diffText = isPercentagePoints
    ? `${sign}${d3.format("." + decimals + "f")(absDiff)}pp`
    : `${sign}${formatNumber(Math.round(absDiff))}`;

  let pctText = "";
  if (!isPercentagePoints && base) {
    const pct = Math.abs((diff / base) * 100);
    pctText = ` (${sign}${d3.format(".1f")(pct)}%)`;
  }

  return `<span class="kpi-delta kpi-delta-${direction}"><span class="kpi-delta-arrow" aria-hidden="true">${arrow}</span>${diffText}${pctText} <span class="kpi-delta-label">${label}</span></span>`;
}

// Dashboard 1-only display fallback so unchanged KPI comparisons do not leave
// the bottom line blank. This does not alter any KPI calculations.
function d1FormatKpiDelta(current, base, opts = {}) {
  const deltaHtml = formatKpiDelta(current, base, opts);
  if (deltaHtml) return deltaHtml;

  if (current === null || current === undefined || base === null || base === undefined) return "";

  const { label = "vs previous year" } = opts;
  return `<span class="kpi-delta kpi-delta-neutral"><span class="kpi-delta-arrow" aria-hidden="true">•</span>No change <span class="kpi-delta-label">${label}</span></span>`;
}

// HELPER FUNCTIONS (Kept global so chart files can use them)
function sumBy(data, groupKey, valueKey) {
  return Array.from(
    d3.rollup(data, values => d3.sum(values, d => d[valueKey]), d => d[groupKey]),
    ([name, value]) => ({ name, value })
  );
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

function getFilteredData(allData) {
  let startYear = +d3.select("#startYear").property("value");
  let endYear   = +d3.select("#endYear").property("value");
  const jurisdiction = d3.select("#jurisdictionSelect").property("value");

  if (startYear > endYear) {
    [startYear, endYear] = [endYear, startYear];
    d3.select("#startYear").property("value", startYear);
    d3.select("#endYear").property("value", endYear);
  }

  return allData.filter(d => {
    const inYearRange    = d.YEAR >= startYear && d.YEAR <= endYear;
    const inJurisdiction = jurisdiction === "All" || d.JURISDICTION === jurisdiction;
    return inYearRange && inJurisdiction;
  });
}

// Recomputed on every filter change: KPI totals computed from the single year
// immediately BEFORE the selected start year (same jurisdiction filter).
// Used as the comparison point for the delta badges in each KPI card.
let d1Baseline = null;

function getD1PreviousYearData(allData) {
  let startYear = +d3.select("#startYear").property("value");
  const jurisdiction = d3.select("#jurisdictionSelect").property("value");
  const prevYear = startYear - 1;

  return allData.filter(d => {
    const inPrevYear     = d.YEAR === prevYear;
    const inJurisdiction = jurisdiction === "All" || d.JURISDICTION === jurisdiction;
    return inPrevYear && inJurisdiction;
  });
}

// Removes Story Summary / Note sections only. This is DOM cleanup only and
// deliberately avoids touching the heatmap card, chart container, data, filters,
// D3 scales, or chart calculations.
function removeD1StorySummaryOnly() {
  document.querySelectorAll(
    "#dashboard1 .story-summary, #dashboard1 .data-note, #dashboard1 .visible-heatmap-summary, #dashboard1 .visible-heatmap-note, #dashboard1 .direct-visible-summary-block"
  ).forEach(element => element.remove());
}

// Safety guard: if the heatmap card is ever missing after SPA injection, recreate
// only the original static container structure so the existing drawHeatmap()
// function can render into it. If the card already exists, this only ensures it
// remains visible. No chart/data logic is changed.
function ensureD1HeatmapCardPresent() {
  const dashboard = document.querySelector("#dashboard1 .story-dashboard");
  if (!dashboard) return;

  let card = dashboard.querySelector(".heatmap-card");
  if (!card) {
    card = document.createElement("section");
    card.className = "story-chart-card heatmap-card";
    card.innerHTML = `
      <div class="chart-heading">
        <div>
          <h2>3. Year-by-jurisdiction pattern</h2>
          <p>Where and when were speeding fine records most concentrated?</p>
        </div>
        <button class="info-dot heatmap-info-dot" id="d1HeatmapInfo" type="button" aria-label="Heatmap information" data-info="Heatmap combines the time trend and jurisdiction comparison in one view." title="Heatmap combines the time trend and jurisdiction comparison in one view.">⤢</button>
      </div>
      <div id="d1-heatmap-chart" class="fine-trend-heatmap-svg" role="img" aria-label="Year by jurisdiction speeding fines heatmap"></div>
      <div class="insight-box">
        <span aria-hidden="true">▦</span>
        <p id="heatmapInsight">Loading insight...</p>
      </div>
    `;
    dashboard.appendChild(card);
  }

  card.hidden = false;
  card.style.display = "block";
  card.style.visibility = "visible";
  card.style.opacity = "1";
}



// UI-only guard for the three insight boxes. Removing the Story Summary should
// not remove the small insight cards under each chart, so this restores/replaces
// only those DOM elements if the injected page layout drops them.
function ensureD1ChartInsightBoxes() {
  const items = [
    { chart: "#lineChart", id: "lineInsight", icon: "↗", fallback: "Loading insight..." },
    { chart: "#lollipopChart", id: "jurisdictionInsight", icon: "👥", fallback: "Loading insight..." },
    { chart: "#d1-heatmap-chart", id: "heatmapInsight", icon: "▦", fallback: "Loading insight..." }
  ];

  items.forEach(item => {
    const chartEl = document.querySelector(`#dashboard1 ${item.chart}`);
    const card = chartEl ? chartEl.closest(".story-chart-card") : null;
    if (!chartEl || !card) return;

    let textEl = card.querySelector(`#${item.id}`) || document.getElementById(item.id);
    let insightBox = textEl ? textEl.closest(".insight-box") : null;

    if (!insightBox || !card.contains(insightBox)) {
      insightBox = document.createElement("div");
      insightBox.className = "insight-box";
      insightBox.innerHTML = `<span aria-hidden="true">${item.icon}</span><p id="${item.id}">${item.fallback}</p>`;
    }

    if (chartEl.nextElementSibling !== insightBox) {
      chartEl.insertAdjacentElement("afterend", insightBox);
    }

    insightBox.style.display = "flex";
    insightBox.style.visibility = "visible";
    insightBox.style.opacity = "1";
    insightBox.style.height = "";
    insightBox.style.minHeight = "";
    insightBox.style.marginTop = "";
    insightBox.style.padding = "";
    insightBox.style.overflow = "visible";
  });
}

// UI-only refresh: keeps the existing insight boxes and expand buttons alive
// after SPA/heatmap injection. Does not touch data, D3 scales, filters, or chart
// calculations.
function refreshD1ChartUiControls() {
  ensureD1HeatmapCardPresent();
  ensureD1ChartInsightBoxes();
  if (typeof initChartExpandButtons === "function") initChartExpandButtons("#dashboard1");
}

function getD1Baseline(allData) {
  const prevYearData   = getD1PreviousYearData(allData);
  const byYear         = yearlyTotals(prevYearData);
  const byJurisdiction = jurisdictionTotals(prevYearData);
  d1Baseline = {
    total: prevYearData.length ? d3.sum(prevYearData, d => d["Speeding Fines"]) : null,
    peak: byYear.length ? byYear.reduce((p, c) => (p.value > c.value) ? p : c) : null,
    topJurisdiction: byJurisdiction.length ? byJurisdiction[0] : null
  };
  return d1Baseline;
}

function updateKpis(data, allData) {
  const baseline       = getD1Baseline(allData);
  const byYear         = yearlyTotals(data);
  const byJurisdiction = jurisdictionTotals(data);

  const total          = d3.sum(data, d => d["Speeding Fines"]);
  const peak           = byYear.length ? byYear.reduce((p, c) => (p.value > c.value) ? p : c) : null;
  const latest         = byYear.length ? byYear[byYear.length - 1] : null;
  const topJurisdiction = byJurisdiction.length ? byJurisdiction[0] : null;

  const change = (peak && latest && peak.value !== 0) ? ((latest.value - peak.value) / peak.value) * 100 : null;

  const selectedStart = d3.select("#startYear").property("value");
  const selectedEnd   = d3.select("#endYear").property("value");

  // 1. UPDATE KPI CARDS
  d3.select("#kpiTotalFines").text(formatNumber(total));
  d3.select("#kpiTotalNote").text(`${selectedStart}–${selectedEnd}`);
  d3.select("#kpiTotalDelta").html(d1FormatKpiDelta(total, baseline.total, { label: "vs previous year" }));

  d3.select("#kpiPeakYear").text(peak ? peak.year : "--");
  d3.select("#kpiPeakNote").text(peak ? `${formatNumber(peak.value)} fines` : "No data");
  d3.select("#kpiPeakDelta").html(
    (peak && baseline.peak) ? d1FormatKpiDelta(peak.value, baseline.peak.value, { label: "vs previous year" }) : ""
  );

  d3.select("#kpiTopJurisdiction").text(topJurisdiction ? topJurisdiction.jurisdiction : "--");
  d3.select("#kpiTopNote").text(topJurisdiction ? `${formatNumber(topJurisdiction.value)} fines` : "No data");
  d3.select("#kpiTopDelta").html(
    (topJurisdiction && baseline.topJurisdiction)
      ? d1FormatKpiDelta(topJurisdiction.value, baseline.topJurisdiction.value, { label: "vs previous year" })
      : ""
  );

  const changeEl = d3.select("#kpiChange");
  changeEl.text(change === null ? "--" : formatPercent(change));
  changeEl.classed("kpi-positive", change !== null && change >= 0);
  changeEl.classed("kpi-negative", change !== null && change < 0);
  d3.select("#kpiChangeNote").text((peak && latest) ? `${peak.year} to ${latest.year}` : "No data");

  // 2. BULLETPROOF INSIGHTS & SUMMARIES (Targets multiple possible HTML IDs)
  try {
    d3.selectAll("#lineInsight, #d1LineInsight").text(peak && latest ? `Speeding fines peaked in ${peak.year} at ${formatNumber(peak.value)}, then reached ${formatNumber(latest.value)} in ${latest.year}, highlighting the change after the selected-period peak.` : "No data available.");
    d3.selectAll("#jurisdictionInsight, #d1JurisdictionInsight").text(topJurisdiction ? `${byJurisdiction.slice(0, 3).map(d => d.jurisdiction).join(", ")} recorded the highest total speeding fines, showing the selected view is concentrated in a few larger jurisdictions.` : "No data available.");
    
    // Bottom Summaries
    d3.selectAll("#summaryOne, #d1SummaryOne, #d1Summary1").text(peak ? `Speeding fines peaked in ${peak.year} during the selected period.` : "No yearly peak could be calculated.");
    d3.selectAll("#summaryTwo, #d1SummaryTwo, #d1Summary2").text(topJurisdiction ? `${topJurisdiction.jurisdiction} recorded the highest total speeding fines.` : "No top jurisdiction could be calculated.");
  } catch (err) {
    console.warn("Insight text targets missing from DOM, skipping gracefully.");
  }
}

function updateDashboard(allData) {
  refreshD1ChartUiControls();
  removeD1StorySummaryOnly();

  const filtered = getFilteredData(allData);
  updateKpis(filtered, allData);
  
  // Try/catch guarantees one broken chart won't stop the insights from loading
  try { if (typeof drawLineChart === "function") drawLineChart(filtered); } catch(e) { console.error("Line error:", e); }
  try { if (typeof drawLollipopChart === "function") drawLollipopChart(filtered); } catch(e) { console.error("Lollipop error:", e); }
  try { if (typeof drawHeatmap === "function") drawHeatmap(filtered, allData); } catch(e) { console.error("Heatmap error:", e); }

  refreshD1ChartUiControls();
  removeD1StorySummaryOnly();
  setTimeout(() => { refreshD1ChartUiControls(); removeD1StorySummaryOnly(); }, 80);
  setTimeout(() => { refreshD1ChartUiControls(); removeD1StorySummaryOnly(); }, 300);

  // Guarantee insight text renders even if a chart stumbles
  setTimeout(() => {
    refreshD1ChartUiControls();
    const byJurisdiction = jurisdictionTotals(filtered);
    const topJur = byJurisdiction.length ? byJurisdiction[0] : null;
    const insightText = topJur 
      ? `${byJurisdiction.slice(0, 3).map(d => d.jurisdiction).join(", ")} recorded the highest total speeding fines, showing the selected view is concentrated in a few larger jurisdictions.` 
      : "No data available.";
      
    const insightBox = d3.select("#jurisdictionInsight");
    if (!insightBox.text() || insightBox.text() === "Loading insight...") {
      insightBox.text(insightText);
    }
  }, 200);
}
function initFilters(allData) {
  const years = Array.from(new Set(allData.map(d => d.YEAR))).sort((a, b) => a - b);
  const jurisdictions = JURISDICTION_ORDER.filter(j => allData.some(d => d.JURISDICTION === j));

  const startSelect = d3.select("#startYear");
  const endSelect = d3.select("#endYear");
  const jurisdictionSelect = d3.select("#jurisdictionSelect");

  startSelect.selectAll("option").data(years).join("option").attr("value", d => d).text(d => d);
  endSelect.selectAll("option").data(years).join("option").attr("value", d => d).text(d => d);
  jurisdictionSelect.selectAll("option").data(["All", ...jurisdictions]).join("option").attr("value", d => d).text(d => d === "All" ? "All jurisdictions" : d);

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

function renderDashboard1Page() {
  const run = allData => {
    if (d3.select("#dashboard1").empty()) return;
    if (!allData || !allData.length) return;
    initFilters(allData);
    if (typeof initD1InfoTooltips === "function") initD1InfoTooltips();
    
    if (typeof initChartExpandButtons === "function") initChartExpandButtons('#dashboard1');
    
    updateDashboard(allData);
  };
  if (window.appData) run(window.appData);
  else window.appDataPromise.then(run).catch(err => console.error("Data error:", err));
}