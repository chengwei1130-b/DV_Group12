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
      const tooltip = container.append("div")
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
        .style("border-left", "3px solid #F97316");

      const inner = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      function updateChart(selectedYear) {
        inner.selectAll(".stem, .lollipop-head, .value-label").remove();

        const filtered = aggregated.filter(d => d.YEAR <= selectedYear);

        const xScale = d3.scaleBand()
          .domain(filtered.map(d => d.YEAR))
          .range([0, innerWidth])
          .padding(0.4);

        const yScale = d3.scaleLinear()
          .domain([0, d3.max(aggregated, d => d.SpeedingFines / 1e6)])
          .nice()
          .range([innerHeight, 0]);

        // Lollipop stems
        inner.selectAll(".stem")
          .data(filtered)
          .enter()
          .append("line")
          .attr("class", "stem")
          .attr("x1", d => xScale(d.YEAR) + xScale.bandwidth() / 2)
          .attr("x2", d => xScale(d.YEAR) + xScale.bandwidth() / 2)
          .attr("y1", innerHeight)
          .attr("y2", d => yScale(d.SpeedingFines / 1e6))
          .attr("stroke", "#F97316")
          .attr("stroke-width", 2.5);

        // Lollipop circles with tooltip
        inner.selectAll(".lollipop-head")
          .data(filtered)
          .enter()
          .append("circle")
          .attr("class", "lollipop-head")
          .attr("cx", d => xScale(d.YEAR) + xScale.bandwidth() / 2)
          .attr("cy", d => yScale(d.SpeedingFines / 1e6))
          .attr("r", 9)
          .attr("fill", "#F97316")
          .attr("stroke", "#FFFFFF")
          .attr("stroke-width", 2)
          .style("cursor", "pointer")
          .on("mouseover", (event, d) => {
            d3.select(event.target).attr("r", 12);
            tooltip.style("opacity", 1)
              .style("left", (event.pageX + 15) + "px")
              .style("top", (event.pageY - 35) + "px")
              .html(`<strong>Year: ${d.YEAR}</strong><br/>Fines: ${d3.format(",.0f")(d.SpeedingFines)}`);
          })
          .on("mousemove", (event) => {
            tooltip.style("left", (event.pageX + 15) + "px")
              .style("top", (event.pageY - 35) + "px");
          })
          .on("mouseout", (event) => {
            d3.select(event.target).attr("r", 9);
            tooltip.style("opacity", 0);
          });

        // Value labels
        inner.selectAll(".value-label")
          .data(filtered)
          .enter()
          .append("text")
          .attr("class", "value-label")
          .attr("x", d => xScale(d.YEAR) + xScale.bandwidth() / 2)
          .attr("y", d => yScale(d.SpeedingFines / 1e6) - 16)
          .attr("text-anchor", "middle")
          .attr("font-size", "12px")
          .attr("fill", "#374151")
          .text(d => (d.SpeedingFines / 1e6).toFixed(2) + "M");

        // Update axes
        inner.selectAll(".axis").remove();
        
        inner.append("g")
          .attr("class", "axis")
          .call(d3.axisLeft(yScale).ticks(6));

        inner.append("g")
          .attr("class", "axis")
          .attr("transform", `translate(0,${innerHeight})`)
          .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));
      }

      // Initial axes
      const xScale = d3.scaleBand()
        .domain(aggregated.map(d => d.YEAR))
        .range([0, innerWidth])
        .padding(0.4);

      const yScale = d3.scaleLinear()
        .domain([0, d3.max(aggregated, d => d.SpeedingFines / 1e6)])
        .nice()
        .range([innerHeight, 0]);

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

      // Update chart on filter change
      yearRange.on("input", function() {
        const val = +this.value;
        yearLabel.text(`${minYear} - ${val}`);
        updateChart(val);
      });

      updateChart(maxYear);
    })
    .catch(error => {
      console.error("Failed to render fine trend chart:", error);
      container.text("Error loading chart.");
    });
}
