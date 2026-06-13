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

  // BULLETPROOF INSIGHTS & SUMMARIES
  try {
    const byYear = Array.from(d3.rollup(data, v => d3.sum(v, d => d["Positive drug tests"]), d => d.YEAR))
        .map(([year, value]) => ({ year: +year, value })).sort((a, b) => a.year - b.year);

    const peak = byYear.length ? byYear.reduce((p, c) => (p.value > c.value) ? p : c) : null;
    const latest = byYear.length ? byYear[byYear.length - 1] : null;
    const topThree = byJuris.slice(0, 3).map(d => d.name).join(", ");

    d3.selectAll("#d2BarInsight, #d2JurisdictionInsight, #jurisdictionInsight").text(
      topJuris ? `${topThree} recorded the highest positive tests in the selected period.` : "No data available."
    );

    d3.selectAll("#d2AreaInsight, #d2LineInsight, #lineInsight").text(
      (peak && latest) ? `Positive tests peaked in ${peak.year} at ${d2FormatK(peak.value)}.` : "No data available."
    );

    // Bottom Summaries
    d3.selectAll("#d2SummaryOne, #d2Summary1, #summaryOne").text(
      peak ? `Positive drug tests peaked in ${peak.year} during the selected period.` : "No peak data."
    );

    d3.selectAll("#d2SummaryTwo, #d2Summary2, #summaryTwo").text(
      topJuris ? `${topJuris.name} recorded the highest total positive drug tests.` : "No jurisdiction data."
    );
  } catch (err) {
    console.warn("Dashboard 2 Insight text targets missing from DOM, skipping gracefully.");
  }
}

function d2UpdateDashboard(allData) {
  const filtered = d2GetFiltered(allData);
  d2UpdateKpis(filtered);
  
  if (typeof d2DrawGroupedBar === "function") d2DrawGroupedBar(filtered);
  if (typeof d2DrawAreaChart === "function") d2DrawAreaChart(filtered);
  if (typeof d2DrawHeatmap === "function") d2DrawHeatmap(filtered, allData);
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
    d2UpdateDashboard(allData);
  };
  
  if (window.appData) run(window.appData); 
  else window.appDataPromise.then(run).catch(err => console.error("Error:", err));
}