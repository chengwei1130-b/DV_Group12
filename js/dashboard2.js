// ─────────────────────────────────────────────────────────────────────────────
// js/dashboard2.js - Core Dashboard Logic & Shared Constants
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

// Recomputed on every filter change: KPI totals computed from the single year
// immediately BEFORE the selected start year (same jurisdiction filter).
// Used as the comparison point for the delta badges in each KPI card.
let d2Baseline = null;

function d2GetPreviousYearData(allData) {
  let startYear = +d3.select("#d2StartYear").property("value");
  const jurisdiction = d3.select("#d2JurisdictionSelect").property("value");
  const prevYear = startYear - 1;

  return allData.filter(d => {
    const inPrevYear = d.YEAR === prevYear;
    const inJuris    = jurisdiction === "All" || d.JURISDICTION === jurisdiction;
    return inPrevYear && inJuris;
  });
}

// Removes Story Summary / Note sections only. This is DOM cleanup only and
// deliberately avoids touching the heatmap card, chart container, data, filters,
// D3 scales, or chart calculations.
function removeD2StorySummaryOnly() {
  document.querySelectorAll(
    "#drug-dashboard .story-summary, #drug-dashboard .data-note, #drug-dashboard .visible-heatmap-summary, #drug-dashboard .visible-heatmap-note, #drug-dashboard .direct-visible-summary-block"
  ).forEach(element => element.remove());
}

// Safety guard: if the heatmap card is ever missing after SPA injection, recreate
// only the original static container structure so the existing d2DrawHeatmap()
// function can render into it. If the card already exists, this only ensures it
// remains visible. No chart/data logic is changed.
function ensureD2HeatmapCardPresent() {
  const dashboard = document.querySelector("#drug-dashboard .story-dashboard");
  if (!dashboard) return;

  let card = dashboard.querySelector(".heatmap-card");
  if (!card) {
    card = document.createElement("section");
    card.className = "story-chart-card heatmap-card";
    card.innerHTML = `
      <div class="chart-heading">
        <div>
          <h2>3. Positive drug test heatmap</h2>
          <p>Where and when were positive drug tests most concentrated?</p>
        </div>
        <button class="info-dot heatmap-info-dot" id="d2HeatmapInfo" type="button" aria-label="Drug heatmap information" data-info="Heatmap of positive drug test counts across jurisdictions and years." title="Heatmap of positive drug test counts across jurisdictions and years.">⤢</button>
      </div>
      <div id="d2-heatmap-chart" class="drug-outcome-content"></div>
      <div class="insight-box">
        <span aria-hidden="true">▦</span>
        <p id="d2HeatmapInsight">Loading insight...</p>
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
function ensureD2ChartInsightBoxes() {
  const items = [
    { chart: "#d2GroupedBar", id: "d2BarInsight", icon: "📊", fallback: "Loading insight..." },
    { chart: "#d2AreaChart", id: "d2AreaInsight", icon: "📈", fallback: "Loading insight..." },
    { chart: "#d2-heatmap-chart", id: "d2HeatmapInsight", icon: "▦", fallback: "Loading insight..." }
  ];

  items.forEach(item => {
    const chartEl = document.querySelector(`#drug-dashboard ${item.chart}`);
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
function refreshD2ChartUiControls() {
  ensureD2HeatmapCardPresent();
  ensureD2ChartInsightBoxes();
  if (typeof initChartExpandButtons === "function") initChartExpandButtons("#drug-dashboard");
}

function getD2Baseline(allData) {
  const prevYearData  = d2GetPreviousYearData(allData);
  const totalTests    = prevYearData.length ? d3.sum(prevYearData, d => d["Alcohol drug tests"]) : null;
  const totalPositive = prevYearData.length ? d3.sum(prevYearData, d => d["Positive drug tests"]) : null;
  const rate          = (prevYearData.length && totalTests > 0) ? (totalPositive / totalTests) * 100 : null;

  const byJuris = Array.from(
    d3.rollup(prevYearData,
      vs => ({ tests: d3.sum(vs, d => d["Alcohol drug tests"]), positive: d3.sum(vs, d => d["Positive drug tests"]) }),
      d => d.JURISDICTION
    ),
    ([name, v]) => ({ name, rate: v.tests > 0 ? (v.positive / v.tests) * 100 : 0 })
  ).sort((a, b) => b.rate - a.rate);

  d2Baseline = { totalTests, totalPositive, rate, topJuris: byJuris[0] ?? null };
  return d2Baseline;
}

// Dashboard 2-only wrapper around the shared KPI delta helper.
// This keeps Dashboard 1/global logic untouched, but prevents Dashboard 2 KPI
// cards from looking empty when the selected view matches the previous year.
function d2FormatKpiDelta(current, base, opts = {}) {
  const deltaHtml = formatKpiDelta(current, base, opts);
  if (deltaHtml) return deltaHtml;

  if (current === null || current === undefined || base === null || base === undefined) return "";

  const { label = "vs previous year" } = opts;
  return `<span class="kpi-delta kpi-delta-neutral"><span class="kpi-delta-arrow" aria-hidden="true">•</span>No change <span class="kpi-delta-label">${label}</span></span>`;
}

function d2UpdateKpis(data, allData) {
  const baseline = getD2Baseline(allData);
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

  d3.select("#d2KpiTests").text(d2FormatNum(totalTests));
  d3.select("#d2KpiTestsNote").text(`${s}–${e}`);
  d3.select("#d2KpiTestsDelta").html(d2FormatKpiDelta(totalTests, baseline.totalTests));

  d3.select("#d2KpiPositive").text(d2FormatNum(totalPositive));
  d3.select("#d2KpiPositiveNote").text("Total confirmed positives");
  d3.select("#d2KpiPositiveDelta").html(d2FormatKpiDelta(totalPositive, baseline.totalPositive));

  d3.select("#d2KpiRate").text(totalTests > 0 ? d2FormatPct(rate) : "--");
  d3.select("#d2KpiRateNote").text("Positive / all tests");
  d3.select("#d2KpiRateDelta").html(
    totalTests > 0 ? d2FormatKpiDelta(rate, baseline.rate, { isPercentagePoints: true, label: "vs previous year" }) : ""
  );

  d3.select("#d2KpiTopJurisdiction").text(topJuris ? topJuris.name : "--");
  d3.select("#d2KpiTopNote").text(topJuris ? `${d2FormatPct(topJuris.rate)} positivity` : "No data");
  d3.select("#d2KpiTopDelta").html(
    (topJuris && baseline.topJuris)
      ? d2FormatKpiDelta(topJuris.rate, baseline.topJuris.rate, { isPercentagePoints: true, label: "vs previous year" })
      : ""
  );

  // BULLETPROOF INSIGHTS & SUMMARIES
  try {
    ensureD2ChartInsightBoxes();
    const byYear = Array.from(d3.rollup(data, v => d3.sum(v, d => d["Positive drug tests"]), d => d.YEAR))
        .map(([year, value]) => ({ year: +year, value })).sort((a, b) => a.year - b.year);

    const peak = byYear.length ? byYear.reduce((p, c) => (p.value > c.value) ? p : c) : null;
    const latest = byYear.length ? byYear[byYear.length - 1] : null;
    const topThree = byJuris.slice(0, 3).map(d => d.name).join(", ");

    d3.selectAll("#d2BarInsight, #d2JurisdictionInsight, #jurisdictionInsight").text(
      topJuris ? `${topThree} recorded the highest positivity rates, while larger jurisdictions still account for most testing volume in the selected view.` : "No data available."
    );

    d3.selectAll("#d2AreaInsight, #d2LineInsight, #lineInsight").text(
      (peak && latest) ? `Positive tests peaked in ${peak.year} at ${d2FormatNum(peak.value)}, showing where confirmed positives were strongest across the selected years.` : "No data available."
    );

    // Bottom Summaries
    d3.selectAll("#d2SummaryOne, #d2Summary1, #summaryOne").text(
      peak ? `Positive drug tests peaked in ${peak.year} during the selected period.` : "No peak data."
    );

    d3.selectAll("#d2SummaryTwo, #d2Summary2, #summaryTwo").text(
      topJuris ? `${topJuris.name} recorded the highest total positive drug tests.` : "No jurisdiction data."
    );
    ensureD2ChartInsightBoxes();
  } catch (err) {
    console.warn("Dashboard 2 Insight text targets missing from DOM, skipping gracefully.");
  }
}

function d2UpdateDashboard(allData) {
  refreshD2ChartUiControls();
  removeD2StorySummaryOnly();

  const filtered = d2GetFiltered(allData);
  ensureD2ChartInsightBoxes();
  d2UpdateKpis(filtered, allData);
  
  try { if (typeof d2DrawGroupedBar === "function") d2DrawGroupedBar(filtered); } catch(e) { console.error("Bar error:", e); }
  try { if (typeof d2DrawAreaChart === "function") d2DrawAreaChart(filtered); } catch(e) { console.error("Area error:", e); }
  try { if (typeof d2DrawHeatmap === "function") d2DrawHeatmap(filtered, allData); } catch(e) { console.error("Heatmap error:", e); }

  refreshD2ChartUiControls();
  removeD2StorySummaryOnly();
  setTimeout(() => { refreshD2ChartUiControls(); removeD2StorySummaryOnly(); }, 80);
  setTimeout(() => { refreshD2ChartUiControls(); removeD2StorySummaryOnly(); }, 300);
}

function d2InitFilters(allData) {
  const years = Array.from(new Set(allData.map(d => d.YEAR))).sort((a, b) => a - b);
  const jurisdictions = D2_JURISDICTION_ORDER.filter(j => allData.some(d => d.JURISDICTION === j));

  const startSel = d3.select("#d2StartYear"); 
  const endSel = d3.select("#d2EndYear"); 
  const jurisSel = d3.select("#d2JurisdictionSelect");

  startSel.selectAll("option").data(years).join("option").attr("value", d => d).text(d => d);
  endSel.selectAll("option").data(years).join("option").attr("value", d => d).text(d => d);
  jurisSel.selectAll("option").data(["All", ...jurisdictions]).join("option").attr("value", d => d).text(d => d === "All" ? "All jurisdictions" : d);

  startSel.property("value", years[0]); 
  endSel.property("value", years[years.length - 1]); 
  jurisSel.property("value", "All");

  startSel.on("change", () => d2UpdateDashboard(allData)); 
  endSel.on("change", () => d2UpdateDashboard(allData)); 
  jurisSel.on("change", () => d2UpdateDashboard(allData));

  d3.select("#d2ResetFilters").on("click", () => {
    startSel.property("value", years[0]); 
    endSel.property("value", years[years.length - 1]); 
    jurisSel.property("value", "All");
    d2UpdateDashboard(allData);
  });
}

function renderDashboard2Page() {
  const run = allData => {
    if (d3.select("#drug-dashboard").empty()) return;
    if (!allData || !allData.length) return;
    
    d2InitFilters(allData);
    if (typeof initD2InfoTooltips === "function") initD2InfoTooltips();
    if (typeof initChartExpandButtons === "function") initChartExpandButtons('#drug-dashboard');
    d2UpdateDashboard(allData);
  };
  
  if (window.appData) run(window.appData); 
  else window.appDataPromise.then(run).catch(err => console.error("Error:", err));
}