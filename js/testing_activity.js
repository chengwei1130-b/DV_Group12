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

      // Aggregate Alcohol_drug_tests by JURISDICTION across all years
      const aggregated = d3.rollups(
        rawData,
        v => d3.sum(v, d => d.Alcohol_drug_tests),
        d => d.JURISDICTION
      )
        .map(([jurisdiction, total]) => ({ JURISDICTION: jurisdiction, Alcohol_drug_tests: total }))
        .sort((a, b) => b.Alcohol_drug_tests - a.Alcohol_drug_tests);

      const total = d3.sum(aggregated, d => d.Alcohol_drug_tests);

      // Donut dimensions — centre it within the SVG
      const donutWidth = width;
      const donutHeight = height + 60; // extra height for legend below
      const cx = donutWidth / 2;
      const cy = (height - 40) / 2 + margin.top;
      const outerRadius = Math.min(innerWidth, innerHeight) / 2 - 10;
      const innerRadius = outerRadius * 0.55;

      const colors = ["#F97316", "#3B82F6", "#10B981", "#8B5CF6", "#EF4444", "#F59E0B", "#06B6D4", "#EC4899"];
      const colorScale = d3.scaleOrdinal()
        .domain(aggregated.map(d => d.JURISDICTION))
        .range(colors);

      const svg = container.append("svg")
        .attr("width", donutWidth)
        .attr("height", donutHeight)
        .style("background-color", "#F3F4F6");

      // Chart title
      svg.append("text")
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

      // Draw slices
      arcs.selectAll(".slice")
        .data(pie(aggregated))
        .enter()
        .append("path")
        .attr("class", "slice")
        .attr("d", arc)
        .attr("fill", d => colorScale(d.data.JURISDICTION))
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .on("mouseover", function(event, d) {
          d3.select(this).attr("d", arcHover);
        })
        .on("mouseout", function(event, d) {
          d3.select(this).attr("d", arc);
        });

      // Centre label — total
      arcs.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "-0.3em")
        .attr("font-size", "13px")
        .attr("fill", "#6B7280")
        .text("Total");

      arcs.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "1em")
        .attr("font-size", "15px")
        .attr("font-weight", "bold")
        .attr("fill", "#111827")
        .text((total / 1e6).toFixed(1) + "M");

      // Percentage labels on slices (only if slice is large enough)
      arcs.selectAll(".slice-label")
        .data(pie(aggregated))
        .enter()
        .append("text")
        .attr("class", "slice-label")
        .attr("transform", d => `translate(${arc.centroid(d)})`)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("fill", "#fff")
        .attr("font-weight", "bold")
        .text(d => {
          const pct = (d.data.Alcohol_drug_tests / total * 100);
          return pct > 4 ? pct.toFixed(1) + "%" : "";
        });

      // Legend below the donut
      const legendY = cy + outerRadius + 30;
      const legendItemWidth = 100;
      const legendsPerRow = Math.floor(donutWidth / legendItemWidth);

      const legend = svg.append("g")
        .attr("transform", `translate(${(donutWidth - legendsPerRow * legendItemWidth) / 2}, ${legendY})`);

      aggregated.forEach((d, i) => {
        const col = i % legendsPerRow;
        const row = Math.floor(i / legendsPerRow);
        const g = legend.append("g")
          .attr("transform", `translate(${col * legendItemWidth}, ${row * 22})`);

        g.append("rect")
          .attr("width", 12)
          .attr("height", 12)
          .attr("rx", 2)
          .attr("fill", colorScale(d.JURISDICTION));

        g.append("text")
          .attr("x", 18)
          .attr("y", 10)
          .attr("font-size", "12px")
          .attr("fill", "#374151")
          .text(d.JURISDICTION);
      });
    })
    .catch(error => {
      console.error("Failed to render testing activity chart:", error);
      container.text("Error loading chart.");
    });
}