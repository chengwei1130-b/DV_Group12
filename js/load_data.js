// Shared dataset loader.
// The Promise is reused by page renderers so the same CSV is not requested
// multiple times. Field names use the canonical "display name" convention
// that matches the canonical field names used in dashboard1.js and dashboard2.js.
window.appDataPromise = d3.csv("data/final.csv")
  .then(rows => rows.map(row => ({
    YEAR:              +row.YEAR,
    JURISDICTION:      String(row.JURISDICTION).trim(),
    "Speeding Fines":  +row.SpeedingFines       || 0,
    "Alcohol drug tests": +row.Alcohol_drug_tests || 0,
    "Positive drug tests": +row.Positive_drug_tests || 0
  })))
  .then(data => {
    window.appData = data;
    return data;
  })
  .catch(error => {
    console.error("Error loading final.csv:", error);
    return [];
  });
