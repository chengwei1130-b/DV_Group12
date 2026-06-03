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

      const aggregated = d3.rollups(
        rawData,
        v => d3.sum(v, d => d.Positive_drug_tests),
        d => d.YEAR
      )
        .map(([year, total]) => ({ YEAR: year, Positive_drug_tests: total }))
        .sort((a, b) => a.YEAR - b.YEAR);

      const minYear = d3.min(aggregated, d => d.YEAR);
      const maxYear = d3.max(aggregated, d => d.YEAR);

      // Create filter controls
      const filterDiv = container.append("div")
        .style("margin-bottom", "16px")
        .style("padding", "12px 20px")
        .style("background", "#F9FAFB")
        .style("border-radius", "8px")
        .style("display", "flex")
        .style("gap", "20px")
        .style("align-items", "center")
        .style("flex-wrap", "wrap")
        .style("max-width", "450px")
        .style("margin", "0 auto 16px auto");

      filterDiv.append("label")
        .style("font-weight", "600")
        .style("color", "#374151")
        .text("Filter by Year Range:");

      const yearRange = filterDiv.append("input")
        .attr("type", "range")
        .attr("min", minYear)
        .attr("max", maxYear)
        .attr("value", maxYear)
        .style("width", "150px");

      const yearLabel = filterDiv.append("span")
        .style("color", "#6B7280")
        .style("min-width", "80px")
        .text(`${minYear} - ${maxYear}`);

      const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background-color", "#F3F4F6");

      // Tooltip div
      const tooltip = container.append("div").attr("class","chart-tooltip")
        .style("position", "fixed")
        .style("opacity", 0)
        .style("background", "rgba(0, 0, 0, 0.9)")
        .style("color", "#fff")
        .style("padding", "10px 14px")
        .style("border-radius", "6px")
        .style("font-size", "13px")
        .style("font-weight", "500")
        .style("pointer-events", "none")
        .style("z-index", "1000")
        .style("white-space", "nowrap")
        .style("border-left", "3px solid #8B5CF6");

      const inner = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      function updateChart(selectedYear) {
        inner.selectAll(".area, .line, .dot, .point-label").remove();

        const filtered = aggregated.filter(d => d.YEAR <= selectedYear);

        const xScale = d3.scalePoint()
          .domain(filtered.map(d => d.YEAR))
          .range([0, innerWidth])
          .padding(0.3);

        const yScale = d3.scaleLinear()
          .domain([0, d3.max(aggregated, d => d.Positive_drug_tests)])
          .nice()
          .range([innerHeight, 0]);

        const lineGenerator = d3.line()
          .x(d => xScale(d.YEAR))
          .y(d => yScale(d.Positive_drug_tests));

        const areaGenerator = d3.area()
          .x(d => xScale(d.YEAR))
          .y0(innerHeight)
          .y1(d => yScale(d.Positive_drug_tests));

        inner.append("path")
          .attr("class", "area")
          .datum(filtered)
          .attr("d", areaGenerator)
          .attr("fill", "#8B5CF6")
          .attr("fill-opacity", 0.12);

        inner.append("path")
          .attr("class", "line")
          .datum(filtered)
          .attr("d", lineGenerator)
          .attr("fill", "none")
          .attr("stroke", "#8B5CF6")
          .attr("stroke-width", 2.5);

        // Circles at each data point with tooltip
        inner.selectAll(".dot")
          .data(filtered)
          .enter()
          .append("circle")
          .attr("class", "dot")
          .attr("cx", d => xScale(d.YEAR))
          .attr("cy", d => yScale(d.Positive_drug_tests))
          .attr("r", 7)
          .attr("fill", "#8B5CF6")
          .attr("stroke", "#fff")
          .attr("stroke-width", 2)
          .style("cursor", "pointer")
          .on("mouseover", (event, d) => {
            d3.select(event.target).attr("r", 10);
            tooltip.style("opacity", 1)
              .style("left", (event.pageX + 15) + "px")
              .style("top", (event.pageY - 35) + "px")
              .html(`<strong>Year: ${d.YEAR}</strong><br/>Positive Tests: ${d3.format(",.0f")(d.Positive_drug_tests)}`);
          })
          .on("mousemove", (event) => {
            tooltip.style("left", (event.pageX + 15) + "px")
              .style("top", (event.pageY - 35) + "px");
          })
          .on("mouseout", (event) => {
            d3.select(event.target).attr("r", 7);
            tooltip.style("opacity", 0);
          });

        // Value labels above each circle
        inner.selectAll(".point-label")
          .data(filtered)
          .enter()
          .append("text")
          .attr("class", "point-label")
          .attr("x", d => xScale(d.YEAR))
          .attr("y", d => yScale(d.Positive_drug_tests) - 16)
          .attr("text-anchor", "middle")
          .attr("font-size", "12px")
          .attr("fill", "#374151")
          .text(d => d3.format(",")(d.Positive_drug_tests));

        // Update axes
        inner.selectAll(".axis").remove();
        
        inner.append("g")
          .attr("class", "axis")
          .call(d3.axisLeft(yScale).ticks(6).tickFormat(d3.format(",")));

        inner.append("g")
          .attr("class", "axis")
          .attr("transform", `translate(0,${innerHeight})`)
          .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));
      }

      const xScale = d3.scalePoint()
        .domain(aggregated.map(d => d.YEAR))
        .range([0, innerWidth])
        .padding(0.3);

      const yScale = d3.scaleLinear()
        .domain([0, d3.max(aggregated, d => d.Positive_drug_tests)])
        .nice()
        .range([innerHeight, 0]);

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
        .text("Positive Drug Test Results Over Time (All Jurisdictions)");

      yearRange.on("input", function() {
        const val = +this.value;
        yearLabel.text(`${minYear} - ${val}`);
        updateChart(val);
      });

      updateChart(maxYear);
    })
    .catch(error => {
      console.error("Failed to render drug trend chart:", error);
      container.text("Error loading chart.");
    });
}