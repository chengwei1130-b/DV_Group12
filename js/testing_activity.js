function renderTestingActivityPage() {
  const container = d3.select("#testing-activity-chart");
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
      const minYear = d3.min(years);
      const maxYear = d3.max(years);

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

      filterDiv.append("label")
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

      filterDiv.append("label")
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

      const donutWidth = width;
      const donutHeight = height + 60;
      const cx = donutWidth / 2;
      const cy = (height - 40) / 2 + margin.top;
      const outerRadius = Math.min(innerWidth, innerHeight) / 2 - 10;
      const innerRadius = outerRadius * 0.55;

      const colors = ["#F97316", "#3B82F6", "#10B981", "#8B5CF6", "#EF4444", "#F59E0B", "#06B6D4", "#EC4899"];
      const colorScale = d3.scaleOrdinal()
        .domain(jurisdictions)
        .range(colors);

      const svg = container.append("svg")
        .attr("width", donutWidth)
        .attr("height", donutHeight)
        .style("background-color", "#F3F4F6");

      const chartTitle = svg.append("text")
        .attr("class", "chart-title")
        .attr("x", cx)
        .attr("y", margin.top - 10)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .attr("fill", "#111827")
        .text("Alcohol & Drug Tests by Jurisdiction (All Years)");

      const pie = d3.pie()
        .value(d => d.Alcohol_drug_tests)
        .sort(null);

      const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

      const arcHover = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius + 8);

      const arcs = svg.append("g")
        .attr("transform", `translate(${cx},${cy})`);

      const totalLabel = arcs.append("text")
        .attr("class", "total-label")
        .attr("text-anchor", "middle")
        .attr("dy", "-0.3em")
        .attr("font-size", "13px")
        .attr("fill", "#6B7280")
        .text("Total");

      const totalValue = arcs.append("text")
        .attr("class", "total-value")
        .attr("text-anchor", "middle")
        .attr("dy", "1em")
        .attr("font-size", "15px")
        .attr("font-weight", "bold")
        .attr("fill", "#111827")
        .text("0M");

      const tooltip = d3.select("body")
        .selectAll(".chart-tooltip")
        .data([null])
        .join("div")
        .attr("class", "chart-tooltip")
        .style("position", "absolute")
        .style("background", "rgba(17,24,39,0.95)")
        .style("color", "#fff")
        .style("padding", "8px 12px")
        .style("border-radius", "6px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("opacity", 0);

      const legendItemHeight = 22;
      const legendCols = 1;
      const legendRows = jurisdictions.length;
      const legendX = cx + outerRadius + 20;
      const legendY = cy - (legendRows * legendItemHeight) / 2;

      const legend = svg.append("g")
        .attr("transform", `translate(${legendX}, ${legendY})`);

      jurisdictions.forEach((jurisdiction, i) => {
        const g = legend.append("g")
          .attr("transform", `translate(0, ${i * legendItemHeight})`);

        g.append("rect")
          .attr("width", 12)
          .attr("height", 12)
          .attr("rx", 2)
          .attr("fill", colorScale(jurisdiction));

        g.append("text")
          .attr("x", 18)
          .attr("y", 10)
          .attr("font-size", "12px")
          .attr("fill", "#374151")
          .text(jurisdiction);
      });

      function arcTween(d) {
        const i = d3.interpolate(this._current, d);
        this._current = i(1);
        return t => arc(i(t));
      }

      function updateChart(selectedYear, selectedJurisdiction) {
        const filteredData = rawData.filter(d => d.YEAR <= selectedYear && (selectedJurisdiction === "All" || d.JURISDICTION === selectedJurisdiction));
        const aggregated = d3.rollups(
          filteredData,
          v => d3.sum(v, d => d.Alcohol_drug_tests),
          d => d.JURISDICTION
        )
          .map(([jurisdiction, total]) => ({ JURISDICTION: jurisdiction, Alcohol_drug_tests: total }))
          .sort((a, b) => b.Alcohol_drug_tests - a.Alcohol_drug_tests);

        const total = d3.sum(aggregated, d => d.Alcohol_drug_tests);
        const pieData = pie(aggregated);

        const slice = arcs.selectAll(".slice")
          .data(pieData, d => d.data.JURISDICTION);

        slice.exit()
          .transition()
          .duration(600)
          .ease(d3.easeCubicOut)
          .attrTween("d", function(d) {
            const start = { startAngle: d.startAngle, endAngle: d.endAngle };
            const end = { startAngle: d.endAngle, endAngle: d.endAngle };
            const i = d3.interpolate(start, end);
            return t => arc(i(t));
          })
          .style("opacity", 0)
          .remove();

        const merged = slice.enter()
          .append("path")
          .attr("class", "slice")
          .attr("fill", d => colorScale(d.data.JURISDICTION))
          .attr("stroke", "#fff")
          .attr("stroke-width", 2)
          .each(function(d) {
            this._current = { startAngle: d.startAngle, endAngle: d.startAngle };
          })
          .on("mouseover", function(event, d) {
            d3.select(this).attr("d", arcHover);

            const percentage = ((d.data.Alcohol_drug_tests / total) * 100).toFixed(1);
            tooltip
              .style("opacity", 1)
              .html(`
                <strong>${d.data.JURISDICTION}</strong><br>
                Tests: ${d3.format(",")(d.data.Alcohol_drug_tests)}<br>
                Share: ${percentage}%
              `);
          })
          .on("mousemove", function(event) {
            tooltip
              .style("left", (event.pageX + 12) + "px")
              .style("top", (event.pageY - 28) + "px");
          })
          .on("mouseout", function() {
            d3.select(this).attr("d", arc);
            tooltip.style("opacity", 0);
          })
          .merge(slice);

        merged.transition()
          .duration(800)
          .ease(d3.easeCubicOut)
          .attrTween("d", arcTween);

        totalValue.text((total / 1e6).toFixed(1) + "M");
        chartTitle.text(`Alcohol & Drug Tests by Jurisdiction (Up to ${selectedYear}${selectedJurisdiction !== "All" ? ` · ${selectedJurisdiction}` : ""})`);

        arcs.selectAll(".slice-label, .slice-dot, .slice-line, .slice-text").remove();

        const THRESHOLD = 4;
        const visiblePie = pieData;

        arcs.selectAll(".slice-label")
          .data(visiblePie.filter(d => (d.data.Alcohol_drug_tests / total * 100) > THRESHOLD))
          .enter()
          .append("text")
          .attr("class", "slice-label")
          .attr("transform", d => `translate(${arc.centroid(d)})`)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "central")
          .attr("font-size", "11px")
          .attr("fill", "#fff")
          .attr("font-weight", "bold")
          .text(d => (d.data.Alcohol_drug_tests / total * 100).toFixed(1) + "%");

        const smallSlices = visiblePie.filter(d => (d.data.Alcohol_drug_tests / total * 100) <= THRESHOLD);
        const labelOffsetsByJurisdiction = {
          SA:  { tx: -outerRadius - 20, ty: -outerRadius - 50 },
          NT:  { tx: -outerRadius - 20, ty: -outerRadius - 28 },
          ACT: { tx: -outerRadius - 20, ty: -outerRadius + 16 },
          TAS: { tx: -outerRadius - 20, ty: -outerRadius + 38 },
        };

        smallSlices.forEach((d, i) => {
          const pct = (d.data.Alcohol_drug_tests / total * 100).toFixed(1);
          const mid = (d.startAngle + d.endAngle) / 2;
          const color = colorScale(d.data.JURISDICTION);
          const p1x = Math.sin(mid) * (outerRadius + 10);
          const p1y = -Math.cos(mid) * (outerRadius + 10);
          const elbowR = outerRadius + 38;
          const p2x = Math.sin(mid) * elbowR;
          const p2y = -Math.cos(mid) * elbowR;
          const cfg = labelOffsetsByJurisdiction[d.data.JURISDICTION] || { tx: -outerRadius - 20, ty: -outerRadius + 38 + (i - 3) * 22 };

          arcs.append("circle")
            .attr("class", "slice-dot")
            .attr("cx", p1x).attr("cy", p1y)
            .attr("r", 2.5)
            .attr("fill", color);

          arcs.append("polyline")
            .attr("class", "slice-line")
            .attr("points", `${p1x},${p1y} ${p2x},${p2y} ${cfg.tx + 55},${cfg.ty}`)
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("stroke-width", 1.3);

          arcs.append("text")
            .attr("class", "slice-text")
            .attr("x", cfg.tx + 53)
            .attr("y", cfg.ty)
            .attr("text-anchor", "end")
            .attr("dominant-baseline", "central")
            .attr("font-size", "11px")
            .attr("fill", "#374151")
            .attr("font-weight", "500")
            .text(`${d.data.JURISDICTION} — ${pct}%`);
        });
      }

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
      console.error("Failed to render testing activity chart:", error);
      container.text("Error loading chart.");
    });
}