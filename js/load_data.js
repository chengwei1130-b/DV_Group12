// Shared dataset loader.
// The Promise is reused by page renderers so the same CSV is not requested multiple times.
window.appDataPromise = d3.csv("data/final.csv")
  .then(rows => rows.map(row => ({
    YEAR: +row.YEAR,
    JURISDICTION: String(row.JURISDICTION).trim(),
    SpeedingFines: +row.SpeedingFines,
    Alcohol_drug_tests: +row.Alcohol_drug_tests,
    Positive_drug_tests: +row.Positive_drug_tests
  })))
  .then(data => {
    window.appData = data;
    return data;
  })
  .catch(error => {
    console.error("Error loading final.csv:", error);
    return [];
  });
