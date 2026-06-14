function ensureD1DirectVisibleSummary(card, heatmapText) {
  if (!card) return;

  const insightBox = card.querySelector('.heatmap-inline-insight') || card.querySelector('.insight-box');
  if (!insightBox) return;

  // Remove older runtime fallback sections so only one Story Summary remains visible.
  card.querySelectorAll('.visible-heatmap-summary, .visible-heatmap-note').forEach(el => el.remove());

  let block = card.querySelector('.direct-visible-summary-block');

  if (!block) {
    block = document.createElement('section');
    block.className = 'direct-visible-summary-block';
    block.innerHTML = `
      <div class="direct-summary-header">
        <span class="direct-summary-icon" aria-hidden="true">💡</span>
        <div>
          <h2>Story summary</h2>
          <p>Key takeaways from the speeding enforcement data</p>
        </div>
      </div>
      <ol>
        <li class="direct-summary-one"></li>
        <li class="direct-summary-two"></li>
        <li class="direct-summary-three"></li>
      </ol>
      <div class="direct-visible-footer">
        <p><strong>Note:</strong> Data shows recorded enforcement activity, not direct proof of actual driver behaviour. Higher values may reflect enforcement intensity, population size, reporting practices, or testing activity.</p>
        <p><strong>Source:</strong> Australian road safety enforcement data, final processed dataset (2020–2024).</p>
      </div>
    `;
  }

  const summaryOne = document.querySelector('#summaryOne')?.textContent || 'Speeding fines peaked during the selected period.';
  const summaryTwo = document.querySelector('#summaryTwo')?.textContent || 'Fine records are concentrated in larger jurisdictions.';
  const summaryThree = heatmapText || document.querySelector('#summaryThree')?.textContent || 'The heatmap reveals how the pattern varies across both year and jurisdiction.';

  block.querySelector('.direct-summary-one').textContent = summaryOne;
  block.querySelector('.direct-summary-two').textContent = summaryTwo;
  block.querySelector('.direct-summary-three').textContent = summaryThree;

  insightBox.insertAdjacentElement('afterend', block);

  block.style.display = 'block';
  block.style.visibility = 'visible';
  block.style.opacity = '1';
  block.style.position = 'relative';
  block.style.zIndex = '999';
  block.style.width = '100%';
  block.style.clear = 'both';

  // Hide every older/original summary or note section so only the direct block remains.
  document.querySelectorAll('#dashboard1 .story-summary, #dashboard1 .data-note').forEach(el => {
    if (el.closest('.direct-visible-summary-block')) return;
    if (el.classList.contains('direct-visible-summary-block')) return;
    el.style.display = 'none';
    el.style.visibility = 'hidden';
    el.style.opacity = '0';
    el.style.height = '0';
    el.style.margin = '0';
    el.style.padding = '0';
    el.style.border = '0';
    el.style.overflow = 'hidden';
  });
}


function ensureD1VisibleSummary(card, text) {
  if (!card) return;

  const existingSummary = document.querySelector('#dashboard1 .story-summary');
  const existingNote = document.querySelector('#dashboard1 .data-note');

  const summaryOne = document.querySelector('#summaryOne')?.textContent || 'Speeding fines peaked during the selected period.';
  const summaryTwo = document.querySelector('#summaryTwo')?.textContent || 'Fine records are concentrated in larger jurisdictions.';
  const summaryThree = text || document.querySelector('#summaryThree')?.textContent || 'The heatmap reveals how the pattern varies across both year and jurisdiction.';

  let visibleSummary = card.querySelector('.visible-heatmap-summary');

  if (!visibleSummary) {
    visibleSummary = document.createElement('section');
    visibleSummary.className = 'story-summary visible-heatmap-summary';
    visibleSummary.innerHTML = `
      <div class="summary-title">
        <div class="summary-icon" aria-hidden="true">💡</div>
        <div>
          <h2>Story summary</h2>
          <p>Key takeaways from the speeding enforcement data</p>
        </div>
      </div>
      <ol>
        <li class="visible-summary-one"></li>
        <li class="visible-summary-two"></li>
        <li class="visible-summary-three"></li>
      </ol>
    `;
  }

  visibleSummary.querySelector('.visible-summary-one').textContent = summaryOne;
  visibleSummary.querySelector('.visible-summary-two').textContent = summaryTwo;
  visibleSummary.querySelector('.visible-summary-three').textContent = summaryThree;

  // Footer/data note fallback placed inside the visible summary block.
  // This makes the existing footer information visible even if the original footer is clipped by layout.
  let embeddedFooter = visibleSummary.querySelector('.embedded-summary-footer');

  if (!embeddedFooter) {
    embeddedFooter = document.createElement('div');
    embeddedFooter.className = 'embedded-summary-footer data-note';
    visibleSummary.appendChild(embeddedFooter);
  }

  embeddedFooter.innerHTML = existingNote
    ? existingNote.innerHTML
    : `
      <p><strong>Note:</strong> Data shows recorded enforcement activity, not direct proof of actual driver behaviour. Higher values may reflect enforcement intensity, population size, reporting practices, or testing activity.</p>
      <p><strong>Source:</strong> Australian road safety enforcement data, final processed dataset (2020–2024).</p>
    `;

  embeddedFooter.style.display = 'block';
  embeddedFooter.style.visibility = 'visible';
  embeddedFooter.style.opacity = '1';

  visibleSummary.style.display = 'block';
  visibleSummary.style.visibility = 'visible';
  visibleSummary.style.opacity = '1';

  // Remove the old separate note fallback because the note/source is already embedded
  // inside the visible summary block. Keeping both creates duplicate Note/Source cards.
  card.querySelectorAll('.visible-heatmap-note').forEach(note => note.remove());

  const insightBox = card.querySelector('.heatmap-inline-insight') || card.querySelector('.insight-box');

  if (insightBox && visibleSummary.previousElementSibling !== insightBox) {
    insightBox.insertAdjacentElement('afterend', visibleSummary);
  } else if (!visibleSummary.parentElement) {
    card.appendChild(visibleSummary);
  }

  // If the original summary/note is still elsewhere, keep it hidden to avoid duplicate visual sections.
  // The visible summary above uses the same current text, only placed in the visible heatmap area.
  if (existingSummary && existingSummary !== visibleSummary) {
    existingSummary.style.display = 'none';
  }
  if (existingNote && existingNote !== visibleSummary.querySelector('.embedded-summary-footer')) {
    existingNote.style.display = 'none';
  }
}


function ensureD1HeatmapContent(text) {
  const card = document.querySelector('#dashboard1 .heatmap-card');
  if (!card) return;

  const chartContainer = card.querySelector('#d1-heatmap-chart');
  let insightBox = card.querySelector(':scope > .insight-box') || card.querySelector('.insight-box');

  // Use the existing heatmap insight box from dashboard1.html. If it is missing,
  // create the same structure as a fallback so the content under the heatmap is always visible.
  if (!insightBox) {
    insightBox = document.createElement('div');
    insightBox.className = 'insight-box heatmap-inline-insight';
    insightBox.innerHTML = '<span aria-hidden="true">▦</span><p id="heatmapInsight"></p>';
  }

  insightBox.classList.add('heatmap-inline-insight');

  if (chartContainer && insightBox.previousElementSibling !== chartContainer) {
    chartContainer.insertAdjacentElement('afterend', insightBox);
  }

  const textTarget = insightBox.querySelector('p') || document.querySelector('#heatmapInsight');
  if (textTarget) textTarget.textContent = text;

  insightBox.style.display = 'flex';
  insightBox.style.visibility = 'visible';
  insightBox.style.opacity = '1';

  d3.selectAll('#heatmapInsight').text(text);
  d3.selectAll('#summaryThree, #d1SummaryThree, #d1Summary3').text(text);

  const dashboard = document.querySelector('#dashboard1 .story-dashboard');
  if (dashboard) {
    const summary = dashboard.querySelector(':scope > .story-summary') || dashboard.querySelector('.story-summary');
    const dataNote = dashboard.querySelector(':scope > .data-note') || dashboard.querySelector('.data-note');

    // Keep the existing Story Summary and Note sections inside the visible heatmap card.
    // This is more reliable than placing them after the card because the heatmap card is
    // already confirmed visible after rendering. No new content or data logic is created.
    if (summary && insightBox && summary.previousElementSibling !== insightBox) {
      insightBox.insertAdjacentElement('afterend', summary);
    }

    if (dataNote && summary && dataNote.previousElementSibling !== summary) {
      summary.insertAdjacentElement('afterend', dataNote);
    }

    [summary, dataNote].forEach(element => {
      if (!element) return;
      element.style.display = 'block';
      element.style.visibility = 'visible';
      element.style.opacity = '1';
      element.style.position = 'relative';
      element.style.zIndex = '2';
      element.style.clear = 'both';
      element.style.width = '100%';
      element.style.boxSizing = 'border-box';
    });
  }

  ensureD1DirectVisibleSummary(card, text);
}

// ─────────────────────────────────────────────────────────────────────────────
// js/d1_heatmap.js
// ─────────────────────────────────────────────────────────────────────────────

function drawHeatmap(data, allData) {
  const dash = d3.select("#dashboard1");
  if (dash.empty()) return;

  let container = dash.select("#d1-heatmap-chart");
  if (container.empty()) {
    const card = dash.select(".heatmap-card").node();
    if (card) {
      card.querySelectorAll("#drug-outcome-chart, #heatmapChart, svg").forEach(el => el.remove());
      const newDiv = document.createElement("div");
      newDiv.id = "d1-heatmap-chart";
      newDiv.className = "fine-trend-heatmap-svg";
      const insightBox = card.querySelector(".insight-box");
      if (insightBox) card.insertBefore(newDiv, insightBox);
      else card.appendChild(newDiv);
      container = d3.select(newDiv);
    } else return;
  }

  container.selectAll("*").interrupt().remove();
  
  const startYear = +d3.select("#startYear").property("value");
  const endYear = +d3.select("#endYear").property("value");
  const selectedJurisdiction = d3.select("#jurisdictionSelect").property("value");

  const years = Array.from(new Set(allData.map(d => d.YEAR)))
    .filter(yr => yr >= Math.min(startYear, endYear) && yr <= Math.max(startYear, endYear))
    .sort((a, b) => a - b);

  const jurisdictions = selectedJurisdiction === "All"
    ? JURISDICTION_ORDER.filter(j => allData.some(d => d.JURISDICTION === j))
    : [selectedJurisdiction];

  if (!years.length || !jurisdictions.length) {
    const message = "No heatmap data available for the selected filters.";
    container.append("p").attr("class", "heatmap-empty").text(message);
    ensureD1HeatmapContent(message);
    return;
  }

  const dataMap = new Map();
  data.forEach(row => dataMap.set(`${row.YEAR}-${row.JURISDICTION}`, row["Speeding Fines"]));

  const margin = { top: 54, right: 180, bottom: 62, left: 92 };
  const totalWidth = 1160;
  const totalHeight = Math.max(360, 96 + jurisdictions.length * 42);
  const innerWidth = totalWidth - margin.left - margin.right;
  const innerHeight = totalHeight - margin.top - margin.bottom;
  const cellWidth = innerWidth / years.length;
  const cellHeight = innerHeight / jurisdictions.length;

  const maxValue = d3.max(allData, d => d["Speeding Fines"]) || 1;
  const colorScale = d3.scaleSequential(d3.interpolateOranges).domain([0, maxValue]);

  const svg = container.append("svg").attr("class", "drug-outcome-style-heatmap").attr("width", totalWidth).attr("height", totalHeight).attr("viewBox", `0 0 ${totalWidth} ${totalHeight}`).attr("preserveAspectRatio", "xMidYMid meet");
  const inner = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const cells = years.flatMap((year, xi) => jurisdictions.map((jurisdiction, yi) => {
      const key = `${year}-${jurisdiction}`;
      const value = dataMap.has(key) ? dataMap.get(key) : null;
      return { year, jurisdiction, value, xi, yi, active: value !== null };
  }));

  inner.selectAll(".heatmap-cell").data(cells, d => `${d.year}-${d.jurisdiction}`).join(
    enter => enter.append("rect").attr("class", "heatmap-cell")
      .attr("x", d => d.xi * cellWidth).attr("y", d => d.yi * cellHeight)
      .attr("width", Math.max(0, cellWidth - 3)).attr("height", Math.max(0, cellHeight - 3))
      .attr("rx", 8).style("cursor", "pointer").attr("fill", "#E5E7EB").attr("opacity", 0)
      .attr("data-value", d => d.active ? d.value : null)
      .call(e => e.transition().duration(CHART_ANIMATION_DURATION).ease(chartEase).attr("fill", d => d.active ? colorScale(d.value) : "#E5E7EB").attr("opacity", 1)),
    update => update.attr("data-value", d => d.active ? d.value : null)
      .call(u => u.transition().duration(CHART_ANIMATION_DURATION).ease(chartEase).attr("fill", d => d.active ? colorScale(d.value) : "#E5E7EB").attr("opacity", 1)),
    exit => exit.call(e => e.transition().duration(CHART_ANIMATION_DURATION).attr("opacity", 0).remove())
  )
  .on("mouseenter", function(event, d) {
    d3.select(this).attr("stroke", "#111827").attr("stroke-width", 2);
    const displayValue = d.active ? `${formatNumber(d.value)} (${formatMillions(d.value)})` : "No record";
    showTooltipPinned(event, `<strong>${d.jurisdiction} — ${d.year}</strong><br>Speeding fines: ${displayValue}`);
  })
  .on("mouseleave", function(event) { 
    d3.select(this).attr("stroke", "none"); 
    hideTooltip(); 
  });

  inner.selectAll(".cell-label").data(cells, d => `${d.year}-${d.jurisdiction}`).join(
    enter => enter.append("text").attr("class", "cell-label")
      .attr("x", d => d.xi * cellWidth + cellWidth / 2).attr("y", d => d.yi * cellHeight + cellHeight / 2 + 5)
      .attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", 800).attr("opacity", 0)
      .text(d => d.active ? formatMillions(d.value) : "N/A")
      .call(e => e.transition().duration(CHART_ANIMATION_DURATION).attr("opacity", 1)),
    update => update.call(u => u.transition().duration(CHART_ANIMATION_DURATION).attr("x", d => d.xi * cellWidth + cellWidth / 2).attr("y", d => d.yi * cellHeight + cellHeight / 2 + 5).attr("fill", d => (d.active && d.value > maxValue * 0.55) ? "#fff" : "#222").text(d => d.active ? formatMillions(d.value) : "N/A")),
    exit => exit.call(e => e.transition().duration(CHART_ANIMATION_DURATION).attr("opacity", 0).remove())
  ).attr("fill", d => (d.active && d.value > maxValue * 0.55) ? "#fff" : "#222");

  const xScale = d3.scalePoint().domain(years).range([cellWidth / 2, innerWidth - cellWidth / 2]);
  const yScale = d3.scalePoint().domain(jurisdictions).range([cellHeight / 2, innerHeight - cellHeight / 2]);

  inner.append("g").attr("class", "axis-x").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(xScale).tickFormat(d3.format("d"))).call(g => g.select(".domain").remove());
  inner.append("g").attr("class", "axis-y").call(d3.axisLeft(yScale)).call(g => g.select(".domain").remove());

  inner.append("text").attr("class", "chart-title-label").attr("x", innerWidth / 2).attr("y", innerHeight + 48).attr("text-anchor", "middle").text("Year");
  inner.append("text").attr("class", "chart-title-label horizontal-axis-label").attr("x", 0).attr("y", -22).attr("transform", null).attr("text-anchor", "start").text("Jurisdiction");

  const defs = svg.append("defs");
  const gradient = defs.append("linearGradient").attr("id", "speeding-heatmap-gradient").attr("x1", "0%").attr("x2", "100%");
  gradient.append("stop").attr("offset", "0%").attr("stop-color", colorScale(0));
  gradient.append("stop").attr("offset", "100%").attr("stop-color", colorScale(maxValue));

  const legend = inner.append("g").attr("class", "heatmap-svg-legend").attr("transform", `translate(${innerWidth + 28},22)`);
  legend.append("text").attr("x", 0).attr("y", -8).attr("font-size", 11).attr("font-weight", 800).attr("fill", "#374151").text("Fines");
  legend.append("rect").attr("width", 130).attr("height", 14).attr("rx", 7).attr("fill", "url(#speeding-heatmap-gradient)");
  legend.append("text").attr("x", 0).attr("y", 30).attr("font-size", 10).attr("fill", "#374151").text("Low");
  legend.append("text").attr("x", 130).attr("y", 30).attr("font-size", 10).attr("text-anchor", "end").attr("fill", "#374151").text("High");

  const maxCell = d3.greatest(cells.filter(d => d.active), d => d.value);
  const heatmapMessage = maxCell
    ? `${maxCell.jurisdiction} in ${maxCell.year} shows the highest fine total in the selected view.`
    : "No heatmap insight available for the selected filters.";

  ensureD1HeatmapContent(heatmapMessage);
}