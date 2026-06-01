function renderFineTrendPage() {
  const container = d3.select("#fine-trend-chart");
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
        v => d3.sum(v, d => d.SpeedingFines),
        d => d.YEAR
      )
        .map(([year, total]) => ({ YEAR: year, SpeedingFines: total }))
        .sort((a, b) => a.YEAR - b.YEAR);

      const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background-color", "#F3F4F6")

      const inner = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const xScale = d3.scaleBand()
        .domain(aggregated.map(d => d.YEAR))
        .range([0, innerWidth])
        .padding(0.4);

      const yScale = d3.scaleLinear()
        .domain([0, d3.max(aggregated, d => d.SpeedingFines / 1e6)])
        .nice()
        .range([innerHeight, 0]);

      // Lollipop stems
      inner.selectAll(".stem")
        .data(aggregated)
        .enter()
        .append("line")
        .attr("class", "stem")
        .attr("x1", d => xScale(d.YEAR) + xScale.bandwidth() / 2)
        .attr("x2", d => xScale(d.YEAR) + xScale.bandwidth() / 2)
        .attr("y1", innerHeight)
        .attr("y2", d => yScale(d.SpeedingFines / 1e6))
        .attr("stroke", "#F97316")
        .attr("stroke-width", 2.5);

      // Lollipop circles (the "candy")
      inner.selectAll(".lollipop-head")
        .data(aggregated)
        .enter()
        .append("circle")
        .attr("class", "lollipop-head")
        .attr("cx", d => xScale(d.YEAR) + xScale.bandwidth() / 2)
        .attr("cy", d => yScale(d.SpeedingFines / 1e6))
        .attr("r", 9)
        .attr("fill", "#F97316")
        .attr("stroke", "#FFFFFF")
        .attr("stroke-width", 2);

      // Value labels above each lollipop head
      inner.selectAll(".value-label")
        .data(aggregated)
        .enter()
        .append("text")
        .attr("class", "value-label")
        .attr("x", d => xScale(d.YEAR) + xScale.bandwidth() / 2)
        .attr("y", d => yScale(d.SpeedingFines / 1e6) - 16)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("fill", "#374151")
        .text(d => (d.SpeedingFines / 1e6).toFixed(2) + "M");

      // Axes
      inner.append("g")
        .call(d3.axisLeft(yScale).ticks(6));

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
        .text("Speeding Fines (millions)");

      // Chart title
      inner.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", -26)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text("Total Speeding Fines by Year (All Jurisdictions)");
    })
    .catch(error => {
      console.error("Failed to render fine trend chart:", error);
      container.text("Error loading chart.");
    });
}