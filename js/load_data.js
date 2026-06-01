window.appDataPromise = d3.csv("data/final.csv")
  .then(data => {
    data.forEach(d => {
      d.YEAR = +d.YEAR;
      d.SpeedingFines = +d.SpeedingFines;
      d.Alcohol_drug_tests = +d.Alcohol_drug_tests;
      d.Positive_drug_tests = +d.Positive_drug_tests;
    });
    return data;
  })
  .then(data => {
    window.appData = data;
    console.log("Data loaded successfully:", data);
    return data;
  })
  .catch(error => {
    console.error("Error loading data:", error);
  });
