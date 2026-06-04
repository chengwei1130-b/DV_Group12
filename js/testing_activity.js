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

        const percentage =
          ((d.data.Alcohol_drug_tests / total) * 100).toFixed(1);

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

        tooltip
          .style("opacity", 0);
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

      // Percentage labels and leader lines for small slices
      const THRESHOLD = 4;
      const pieData = pie(aggregated);

      // Internal labels for large slices
      arcs.selectAll(".slice-label")
        .data(pieData.filter(d => (d.data.Alcohol_drug_tests / total * 100) > THRESHOLD))
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

      // External leader lines + labels for small slices
      const smallSlices = pieData.filter(d => (d.data.Alcohol_drug_tests / total * 100) <= THRESHOLD);

      // Fan label anchors to upper-left — clear of title and legend
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

        // Point on slice edge
        const p1x = Math.sin(mid) * (outerRadius + 10);
        const p1y = -Math.cos(mid) * (outerRadius + 10);

        // Elbow point
        const elbowR = outerRadius + 38;
        const p2x = Math.sin(mid) * elbowR;
        const p2y = -Math.cos(mid) * elbowR;

        // Label anchor
        const cfg = labelOffsetsByJurisdiction[d.data.JURISDICTION] || { tx: -outerRadius - 20, ty: -outerRadius + 38 + (i - 3) * 22 };

        // Dot on slice
        arcs.append("circle")
          .attr("cx", p1x).attr("cy", p1y)
          .attr("r", 2.5).attr("fill", color);

        // Two-segment polyline: slice → elbow → label
        arcs.append("polyline")
          .attr("points", `${p1x},${p1y} ${p2x},${p2y} ${cfg.tx + 55},${cfg.ty}`)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-width", 1.3);

        // Label text
        arcs.append("text")
          .attr("x", cfg.tx + 53)
          .attr("y", cfg.ty)
          .attr("text-anchor", "end")
          .attr("dominant-baseline", "central")
          .attr("font-size", "11px")
          .attr("fill", "#374151")
          .attr("font-weight", "500")
          .text(`${d.data.JURISDICTION} — ${pct}%`);
      });

      // Tooltip
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


      // Legend to the right of the donut, vertically centered
      const legendItemHeight = 22;
      const legendCols = 1; // single column on the right
      const legendRows = Math.ceil(aggregated.length / legendCols);
      const legendX = cx + outerRadius + 20; // 20px gap to the right of the donut
      const legendY = cy - (legendRows * legendItemHeight) / 2;

      const legend = svg.append("g")
        .attr("transform", `translate(${legendX}, ${legendY})`);

      aggregated.forEach((d, i) => {
        const row = i;
        const g = legend.append("g")
          .attr("transform", `translate(0, ${row * legendItemHeight})`);

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