function renderFineJurisdictionPage() {
  const container = d3.select("#fine-jurisdiction-chart");
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

      const minYear = d3.min(rawData, d => d.YEAR);
      const maxYear = d3.max(rawData, d => d.YEAR);
      const jurisdictions = [...new Set(rawData.map(d => d.JURISDICTION))].sort();
      const overallMaxFine = d3.max(
        d3.rollups(rawData, v => d3.sum(v, d => d.SpeedingFines), d => d.JURISDICTION)
          .map(([jurisdiction, total]) => total)
      ) / 1e6;

      const filterDiv = container.append("div")
        .style("margin-bottom", "16px")
        .style("padding", "12px 20px")
        .style("background", "#F9FAFB")
        .style("border-radius", "8px")
        .style("display", "flex")
        .style("gap", "16px")
        .style("align-items", "center")
        .style("flex-wrap", "wrap")
        .style("max-width", "780px")
        .style("margin", "0 auto 16px auto");

      const jurisdictionLabel = filterDiv.append("label")
        .style("font-weight", "600")
        .style("color", "#374151")
        .text("Jurisdiction:");

      const jurisdictionSelect = filterDiv.append("select")
        .style("padding", "8px 10px")
        .style("border-radius", "6px")
        .style("border", "1px solid #D1D5DB")
        .style("background", "#fff");

      jurisdictionSelect.append("option")
        .attr("value", "All")
        .text("All Jurisdictions");

      jurisdictions.forEach(jurisdiction => {
        jurisdictionSelect.append("option")
          .attr("value", jurisdiction)
          .text(jurisdiction);
      });

      const yearFilterLabel = filterDiv.append("label")
        .style("font-weight", "600")
        .style("color", "#374151")
        .text("Filter by Year:");

      const yearRange = filterDiv.append("input")
        .attr("type", "range")
        .attr("min", minYear)
        .attr("max", maxYear)
        .attr("value", maxYear)
        .style("width", "240px");

      const yearLabel = filterDiv.append("span")
        .style("color", "#6B7280")
        .style("min-width", "100px")
        .text(maxYear);

      const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background-color", "#F3F4F6");

      const inner = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      function getAggregatedData(selectedYear, selectedJurisdiction) {
        let filtered = rawData.filter(d => d.YEAR <= selectedYear);
        if (selectedJurisdiction && selectedJurisdiction !== "All") {
          filtered = filtered.filter(d => d.JURISDICTION === selectedJurisdiction);
        }

        const aggregatedMap = new Map(
          d3.rollups(
            filtered,
            v => d3.sum(v, d => d.SpeedingFines),
            d => d.JURISDICTION
          ).map(([jurisdiction, total]) => [jurisdiction, total])
        );

        return jurisdictions.map(jurisdiction => ({
          JURISDICTION: jurisdiction,
          SpeedingFines: aggregatedMap.get(jurisdiction) || 0
        }));
      }

      // Tooltip styled like Fine Trend chart
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
        .style("border-left", "3px solid #F97316");

      function updateChart(selectedYear, selectedJurisdiction) {
        const aggregated = getAggregatedData(selectedYear, selectedJurisdiction);
        const sortedAggregated = [...aggregated].sort((a, b) => d3.ascending(a.SpeedingFines, b.SpeedingFines));
        const maxFine = overallMaxFine || 0;

        const xScale = d3.scaleBand()
          .domain(sortedAggregated.map(d => d.JURISDICTION))
          .range([0, innerWidth])
          .padding(0.3);

        const yScale = d3.scaleLinear()
          .domain([0, maxFine])
          .nice()
          .range([innerHeight, 0]);

        inner.selectAll(".axis").remove();

        const bars = inner.selectAll(".bar")
          .data(sortedAggregated, d => d.JURISDICTION);

        const barEnter = bars.enter()
          .append("rect")
          .attr("class", "bar")
          .attr("x", d => xScale(d.JURISDICTION))
          .attr("y", innerHeight)
          .attr("width", xScale.bandwidth())
          .attr("height", 0)
          .attr("fill", "#F97316")
          .attr("rx", 3)
          .attr("opacity", 0)
          .style("cursor", "pointer")
          .on("mouseover", (event, d) => {
            tooltip.style("opacity", 1)
              .style("left", (event.pageX + 15) + "px")
              .style("top", (event.pageY - 35) + "px")
              .html(`<strong>${d.JURISDICTION}</strong><br/>Fines: ${d3.format(",.0f")(d.SpeedingFines)}`);
          })
          .on("mousemove", (event) => {
            tooltip.style("left", (event.pageX + 15) + "px")
                   .style("top", (event.pageY - 35) + "px");
          })
          .on("mouseout", () => {
            tooltip.style("opacity", 0);
          });

        const barSelection = barEnter.merge(bars);

        barSelection.transition()
          .duration(700)
          .ease(d3.easeCubicOut)
          .attr("x", d => xScale(d.JURISDICTION))
          .attr("y", d => yScale(d.SpeedingFines / 1e6))
          .attr("width", xScale.bandwidth())
          .attr("height", d => innerHeight - yScale(d.SpeedingFines / 1e6))
          .attr("opacity", 1);

        const labels = inner.selectAll(".bar-label")
          .data(sortedAggregated, d => d.JURISDICTION);

        const labelEnter = labels.enter()
          .append("text")
          .attr("class", "bar-label")
          .attr("x", d => xScale(d.JURISDICTION) + xScale.bandwidth() / 2)
          .attr("y", innerHeight)
          .attr("text-anchor", "middle")
          .attr("font-size", "11px")
          .attr("fill", "#374151")
          .attr("opacity", 0)
          .text(d => d.SpeedingFines > 0 ? (d.SpeedingFines / 1e6).toFixed(2) + "M" : "–");

        labelEnter.merge(labels)
          .transition()
          .duration(700)
          .ease(d3.easeCubicOut)
          .attr("x", d => xScale(d.JURISDICTION) + xScale.bandwidth() / 2)
          .attr("y", d => yScale(d.SpeedingFines / 1e6) - 6)
          .attr("opacity", 1)
          .text(d => d.SpeedingFines > 0 ? (d.SpeedingFines / 1e6).toFixed(2) + "M" : "–");

        // Axes
        inner.append("g")
          .attr("class", "axis")
          .call(d3.axisLeft(yScale).ticks(6));

        inner.append("g")
          .attr("class", "axis")
          .attr("transform", `translate(0,${innerHeight})`)
          .call(d3.axisBottom(xScale));

        inner.selectAll(".chart-title").remove();
        inner.append("text")
          .attr("class", "chart-title")
          .attr("x", innerWidth / 2)
          .attr("y", -26)
          .attr("text-anchor", "middle")
          .attr("font-size", "16px")
          .attr("font-weight", "bold")
          .attr("fill", "#111827")
          .text(`Total Speeding Fines by Jurisdiction (Up to ${selectedYear}${selectedJurisdiction && selectedJurisdiction !== "All" ? ` · ${selectedJurisdiction}` : ""})`);
      }

      // Labels
      inner.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 40)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .attr("fill", "#374151")
        .text("Jurisdiction");

      inner.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -55)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .attr("fill", "#374151")
        .text("Speeding Fines (millions)");

      function getCurrentFilters() {
        return {
          year: +yearRange.property("value"),
          jurisdiction: jurisdictionSelect.property("value")
        };
      }

      yearRange.on("input", function() {
        const val = +this.value;
        yearLabel.text(val);
        const filters = getCurrentFilters();
        updateChart(filters.year, filters.jurisdiction);
      });

      jurisdictionSelect.on("change", function() {
        const filters = getCurrentFilters();
        updateChart(filters.year, filters.jurisdiction);
      });

      updateChart(maxYear, "All");
    })
    .catch(error => {
      console.error("Failed to render fine jurisdiction chart:", error);
      container.text("Error loading chart.");
    });
}