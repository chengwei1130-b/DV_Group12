function renderDrugOutcomePage() {
  const container = d3.select("#drug-outcome-chart");
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

      const years = [...new Set(rawData.map(d => d.YEAR))].sort((a, b) => a - b);
      const jurisdictions = [...new Set(rawData.map(d => d.JURISDICTION))].sort();

      // Create filter controls
      const filterDiv = container.append("div")
        .style("margin-bottom", "16px")
        .style("padding", "12px 20px")
        .style("background", "#F9FAFB")
        .style("border-radius", "8px")
        .style("display", "flex")
        .style("gap", "20px")
        .style("flex-wrap", "wrap")
        .style("align-items", "center")
        .style("max-width", "400px")
        .style("margin", "0 auto 16px auto");

      filterDiv.append("label")
        .style("font-weight", "600")
        .style("color", "#374151")
        .text("Filter:");

      const minYear = d3.min(years);
      const maxYear = d3.max(years);

      filterDiv.append("label")
        .style("font-size", "12px")
        .style("color", "#6B7280")
        .text("Year Range:");

      const yearRange = filterDiv.append("input")
        .attr("type", "range")
        .attr("min", minYear)
        .attr("max", maxYear)
        .attr("value", maxYear)
        .style("width", "120px");

      const yearLabel = filterDiv.append("span")
        .style("color", "#6B7280")
        .style("min-width", "60px")
        .style("font-size", "12px")
        .text(`${minYear} - ${maxYear}`);

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
        .style("border-left", "3px solid #EC4899");

      // Build lookup map
      const dataMap = new Map();
      rawData.forEach(d => {
        dataMap.set(`${d.YEAR}-${d.JURISDICTION}`, d.Positive_drug_tests);
      });

      const heatMargin = { top: 60, right: 120, bottom: 60, left: 70 };
      const heatWidth = width;
      const heatHeight = height;
      const heatInnerWidth = heatWidth - heatMargin.left - heatMargin.right;
      const heatInnerHeight = heatHeight - heatMargin.top - heatMargin.bottom;

      const svg = container.append("svg")
        .attr("width", heatWidth)
        .attr("height", heatHeight)
        .style("background-color", "#F3F4F6");

      const inner = svg.append("g")
        .attr("transform", `translate(${heatMargin.left},${heatMargin.top})`);

      function updateChart(filteredYears) {
        inner.selectAll(".heatmap-cell, .cell-label").remove();

        const cellWidth = heatInnerWidth / filteredYears.length;
        const cellHeight = heatInnerHeight / jurisdictions.length;

        const maxVal = d3.max(rawData, d => d.Positive_drug_tests);

        const colorScale = d3.scaleSequential()
          .domain([0, maxVal])
          .interpolator(d3.interpolateOranges);

        // Draw cells
        filteredYears.forEach((year, xi) => {
          jurisdictions.forEach((jur, yi) => {
            const val = dataMap.get(`${year}-${jur}`) || 0;

            inner.append("rect")
              .attr("class", "heatmap-cell")
              .attr("x", xi * cellWidth)
              .attr("y", yi * cellHeight)
              .attr("width", cellWidth - 2)
              .attr("height", cellHeight - 2)
              .attr("rx", 3)
              .attr("fill", val > 0 ? colorScale(val) : "#E5E7EB")
              .style("cursor", "pointer")
              .on("mouseover", (event) => {
                d3.select(event.target).attr("stroke", "#111827").attr("stroke-width", 2);
                tooltip.style("opacity", 1)
                  .style("left", (event.pageX + 15) + "px")
                  .style("top", (event.pageY - 35) + "px")
                  .html(`<strong>${jur} — ${year}</strong><br/>Positive Tests: ${d3.format(",.0f")(val)}`);
              })
              .on("mousemove", (event) => {
                tooltip.style("left", (event.pageX + 15) + "px")
                  .style("top", (event.pageY - 35) + "px");
              })
              .on("mouseout", (event) => {
                d3.select(event.target).attr("stroke", "none");
                tooltip.style("opacity", 0);
              });

            // Cell value label
            if (cellWidth > 35 && cellHeight > 18) {
              inner.append("text")
                .attr("class", "cell-label")
                .attr("x", xi * cellWidth + cellWidth / 2 - 1)
                .attr("y", yi * cellHeight + cellHeight / 2 + 4)
                .attr("text-anchor", "middle")
                .attr("font-size", "10px")
                .attr("fill", val > maxVal * 0.6 ? "#fff" : "#374151")
                .text(val > 0 ? d3.format(",")(val) : "–");
            }
          });
        });

        // X axis
        inner.selectAll(".axis-x").remove();
        inner.append("g")
          .attr("class", "axis-x")
          .attr("transform", `translate(0,${heatInnerHeight})`)
          .call(
            d3.axisBottom(
              d3.scaleOrdinal()
                .domain(filteredYears)
                .range(filteredYears.map((_, i) => i * cellWidth + cellWidth / 2))
            ).tickFormat(d3.format("d"))
          )
          .call(g => g.select(".domain").remove());

        // Y axis
        inner.selectAll(".axis-y").remove();
        inner.append("g")
          .attr("class", "axis-y")
          .call(
            d3.axisLeft(
              d3.scaleOrdinal()
                .domain(jurisdictions)
                .range(jurisdictions.map((_, i) => i * cellHeight + cellHeight / 2))
            )
          )
          .call(g => g.select(".domain").remove());
      }

      // Initial draw
      const maxVal = d3.max(rawData, d => d.Positive_drug_tests);
      const cellWidth = heatInnerWidth / years.length;
      const cellHeight = heatInnerHeight / jurisdictions.length;

      const colorScale = d3.scaleSequential()
        .domain([0, maxVal])
        .interpolator(d3.interpolateOranges);

      // Initial axes
      inner.append("g")
        .attr("class", "axis-x")
        .attr("transform", `translate(0,${heatInnerHeight})`)
        .call(
          d3.axisBottom(
            d3.scaleOrdinal()
              .domain(years)
              .range(years.map((_, i) => i * cellWidth + cellWidth / 2))
          ).tickFormat(d3.format("d"))
        )
        .call(g => g.select(".domain").remove());

      inner.append("g")
        .attr("class", "axis-y")
        .call(
          d3.axisLeft(
            d3.scaleOrdinal()
              .domain(jurisdictions)
              .range(jurisdictions.map((_, i) => i * cellHeight + cellHeight / 2))
          )
        )
        .call(g => g.select(".domain").remove());

      // X-axis label
      inner.append("text")
        .attr("x", heatInnerWidth / 2)
        .attr("y", heatInnerHeight + 45)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .attr("fill", "#374151")
        .text("Year");

      // Y-axis label
      inner.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -heatInnerHeight / 2)
        .attr("y", -55)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .attr("fill", "#374151")
        .text("Jurisdiction");

      // Chart title
      svg.append("text")
        .attr("x", heatWidth / 2)
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .attr("fill", "#111827")
        .text("Positive Drug Tests by Year & Jurisdiction");

      // Colour legend
      const legendHeight = heatInnerHeight * 0.7;
      const legendX = heatInnerWidth + 20;
      const legendY = (heatInnerHeight - legendHeight) / 2;
      const legendSteps = 50;

      const defs = svg.append("defs");
      const linearGrad = defs.append("linearGradient")
        .attr("id", "heatmap-gradient")
        .attr("x1", "0%").attr("y1", "100%")
        .attr("x2", "0%").attr("y2", "0%");

      d3.range(legendSteps + 1).forEach(i => {
        linearGrad.append("stop")
          .attr("offset", `${(i / legendSteps) * 100}%`)
          .attr("stop-color", colorScale((i / legendSteps) * maxVal));
      });

      inner.append("rect")
        .attr("x", legendX)
        .attr("y", legendY)
        .attr("width", 14)
        .attr("height", legendHeight)
        .attr("rx", 3)
        .attr("fill", "url(#heatmap-gradient)");

      const legendScale = d3.scaleLinear()
        .domain([0, maxVal])
        .range([legendY + legendHeight, legendY]);

      inner.append("g")
        .attr("transform", `translate(${legendX + 14}, 0)`)
        .call(d3.axisRight(legendScale).ticks(5).tickFormat(d3.format(",d")))
        .call(g => g.select(".domain").remove());

      // Update chart on filter change
      yearRange.on("input", function() {
        const val = +this.value;
        yearLabel.text(`${minYear} - ${val}`);
        const filtered = years.filter(y => y <= val);
        updateChart(filtered);
      });

      updateChart(years);
    })
    .catch(error => {
      console.error("Failed to render drug outcome chart:", error);
      container.text("Error loading chart.");
    });
}
