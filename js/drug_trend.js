function renderDrugTrendPage() {
  const container = d3.select("#drug-trend-chart");
  container.selectAll("*").remove();

  if (!window.appDataPromise) {
    container.text("Loading data...");
    return;
  }

  window.appDataPromise
    .then(rawData => {
      if (!rawData || rawData.length === 0) {
        container.text("No data available.");
        return;
      }

      // Aggregate Positive_drug_tests by YEAR across all jurisdictions
      const aggregated = d3.rollups(
        rawData,
        v => d3.sum(v, d => d.Positive_drug_tests),
        d => d.YEAR
      )
        .map(([year, total]) => ({ YEAR: year, Positive_drug_tests: total }))
        .sort((a, b) => a.YEAR - b.YEAR);

      const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background-color", "#F3F4F6");

      const inner = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const xScale = d3.scalePoint()
        .domain(aggregated.map(d => d.YEAR))
        .range([0, innerWidth])
        .padding(0.3);

      const yScale = d3.scaleLinear()
        .domain([0, d3.max(aggregated, d => d.Positive_drug_tests)])
        .nice()
        .range([innerHeight, 0]);

      // Straight line segments between points
      const lineGenerator = d3.line()
        .x(d => xScale(d.YEAR))
        .y(d => yScale(d.Positive_drug_tests));
        // No curve — default is straight (curveLinear)

      // Subtle area fill
      const areaGenerator = d3.area()
        .x(d => xScale(d.YEAR))
        .y0(innerHeight)
        .y1(d => yScale(d.Positive_drug_tests));

      inner.append("path")
        .datum(aggregated)
        .attr("d", areaGenerator)
        .attr("fill", "#F97316")
        .attr("fill-opacity", 0.12);

      inner.append("path")
        .datum(aggregated)
        .attr("d", lineGenerator)
        .attr("fill", "none")
        .attr("stroke", "#F97316")
        .attr("stroke-width", 2.5);

      // Circles at each data point
      inner.selectAll(".dot")
        .data(aggregated)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", d => xScale(d.YEAR))
        .attr("cy", d => yScale(d.Positive_drug_tests))
        .attr("r", 7)
        .attr("fill", "#F97316")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);

      // Value labels above each circle
      inner.selectAll(".point-label")
        .data(aggregated)
        .enter()
        .append("text")
        .attr("class", "point-label")
        .attr("x", d => xScale(d.YEAR))
        .attr("y", d => yScale(d.Positive_drug_tests) - 16)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("fill", "#374151")
        .text(d => d3.format(",")(d.Positive_drug_tests));

      // Axes
      inner.append("g")
        .call(d3.axisLeft(yScale).ticks(6).tickFormat(d3.format(",")));

      inner.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));

      // X-axis label
      inner.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 40)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .attr("fill", "#374151")
        .text("Year");

      // Y-axis label
      inner.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -55)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .attr("fill", "#374151")
        .text("Positive Drug Tests");

      // Chart title
      inner.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", -26)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .attr("fill", "#111827")
        .text("Total Positive Drug Tests by Year (All Jurisdictions)");
    })
    .catch(error => {
      console.error("Failed to render drug trend chart:", error);
      container.text("Error loading chart.");
    });
}