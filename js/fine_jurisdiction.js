function renderFineJurisdictionPage() {
  const container = d3.select("#fine-jurisdiction-chart");
  container.selectAll("*").remove();
  container.text("Fine Jurisdiction chart placeholder. Add chart rendering logic here.");
}
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

      // Aggregate SpeedingFines by JURISDICTION across all years
      const aggregated = d3.rollups(
        rawData,
        v => d3.sum(v, d => d.SpeedingFines),
        d => d.JURISDICTION
      )
        .map(([jurisdiction, total]) => ({ JURISDICTION: jurisdiction, SpeedingFines: total }))
        .sort((a, b) => b.SpeedingFines - a.SpeedingFines);

      const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background-color", "#F3F4F6");

      const inner = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const xScale = d3.scaleBand()
        .domain(aggregated.map(d => d.JURISDICTION))
        .range([0, innerWidth])
        .padding(0.3);

      const yScale = d3.scaleLinear()
        .domain([0, d3.max(aggregated, d => d.SpeedingFines / 1e6)])
        .nice()
        .range([innerHeight, 0]);

      // Bars
      inner.selectAll(".bar")
        .data(aggregated)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => xScale(d.JURISDICTION))
        .attr("y", d => yScale(d.SpeedingFines / 1e6))
        .attr("width", xScale.bandwidth())
        .attr("height", d => innerHeight - yScale(d.SpeedingFines / 1e6))
        .attr("fill", "#F97316")
        .attr("rx", 3);

      // Value labels on top of bars
      inner.selectAll(".bar-label")
        .data(aggregated)
        .enter()
        .append("text")
        .attr("class", "bar-label")
        .attr("x", d => xScale(d.JURISDICTION) + xScale.bandwidth() / 2)
        .attr("y", d => yScale(d.SpeedingFines / 1e6) - 6)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("fill", "#374151")
        .text(d => (d.SpeedingFines / 1e6).toFixed(2) + "M");

      // Axes
      inner.append("g")
        .call(d3.axisLeft(yScale).ticks(6));

      inner.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale));

      // X-axis label
      inner.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 40)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .attr("fill", "#374151")
        .text("Jurisdiction");

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
        .attr("fill", "#111827")
        .text("Total Speeding Fines by Jurisdiction (All Years)");
    })
    .catch(error => {
      console.error("Failed to render fine jurisdiction chart:", error);
      container.text("Error loading chart.");
    });
}