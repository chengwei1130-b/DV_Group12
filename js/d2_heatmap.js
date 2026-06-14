


function d2EnsureDirectVisibleSummary(card, heatmapText) {
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
          <p>Key takeaways from the drug testing enforcement data</p>
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

  const summaryOne = document.querySelector('#d2SummaryOne')?.textContent || 'Drug testing volumes vary significantly across jurisdictions.';
  const summaryTwo = document.querySelector('#d2SummaryTwo')?.textContent || 'Positive drug test trends show meaningful year-to-year changes.';
  const summaryThree = heatmapText || document.querySelector('#d2SummaryThree')?.textContent || 'The heatmap reveals concentration hotspots by jurisdiction and year.';

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
  document.querySelectorAll('#drug-dashboard .story-summary, #drug-dashboard .data-note').forEach(el => {
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


function d2EnsureVisibleSummary(card, text) {
  if (!card) return;

  const existingSummary = document.querySelector('#drug-dashboard .story-summary');
  const existingNote = document.querySelector('#drug-dashboard .data-note');

  const summaryOne = document.querySelector('#d2SummaryOne')?.textContent || 'Drug testing volumes vary significantly across jurisdictions.';
  const summaryTwo = document.querySelector('#d2SummaryTwo')?.textContent || 'Positive drug test trends show meaningful year-to-year changes.';
  const summaryThree = text || document.querySelector('#d2SummaryThree')?.textContent || 'The heatmap reveals concentration hotspots by jurisdiction and year.';

  let visibleSummary = card.querySelector('.visible-heatmap-summary');

  if (!visibleSummary) {
    visibleSummary = document.createElement('section');
    visibleSummary.className = 'story-summary visible-heatmap-summary';
    visibleSummary.innerHTML = `
      <div class="summary-title">
        <div class="summary-icon" aria-hidden="true">💡</div>
        <div>
          <h2>Story summary</h2>
          <p>Key takeaways from the drug testing enforcement data</p>
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


function d2EnsureHeatmapContent(text) {
  const card = document.querySelector('#drug-dashboard .heatmap-card');
  if (!card) return;

  const chartContainer = card.querySelector('#d2-heatmap-chart');
  let insightBox = card.querySelector(':scope > .insight-box') || card.querySelector('.insight-box');

  // Use the existing heatmap insight box from dashboard2.html. If it is missing,
  // create the same structure as a fallback so the content under the heatmap is always visible.
  if (!insightBox) {
    insightBox = document.createElement('div');
    insightBox.className = 'insight-box heatmap-inline-insight';
    insightBox.innerHTML = '<span aria-hidden="true">▦</span><p id="d2HeatmapInsight"></p>';
  }

  insightBox.classList.add('heatmap-inline-insight');

  if (chartContainer && insightBox.previousElementSibling !== chartContainer) {
    chartContainer.insertAdjacentElement('afterend', insightBox);
  }

  const textTarget = insightBox.querySelector('p') || document.querySelector('#d2HeatmapInsight');
  if (textTarget) textTarget.textContent = text;

  insightBox.style.display = 'flex';
  insightBox.style.visibility = 'visible';
  insightBox.style.opacity = '1';

  d3.selectAll('#d2HeatmapInsight').text(text);
  d3.selectAll('#d2SummaryThree, #d2Summary3').text(text);

  const dashboard = document.querySelector('#drug-dashboard .story-dashboard');
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

  d2EnsureDirectVisibleSummary(card, text);
}

// ─────────────────────────────────────────────────────────────────────────────
// js/d2_heatmap.js
// ─────────────────────────────────────────────────────────────────────────────

function d2DrawHeatmap(data, allData) {
  const dash = d3.select("#drug-dashboard");
  if (dash.empty()) return;

  let container = dash.select("#d2-heatmap-chart");

  if (container.empty()) {
    const card = dash.select(".heatmap-card").node();
    if (card) {
      card.querySelectorAll("#drug-outcome-chart, #d2HeatmapContainer, svg").forEach(el => el.remove());
      const newDiv = document.createElement("div");
      newDiv.id = "d2-heatmap-chart";
      newDiv.className = "drug-outcome-content";
      const insightBox = card.querySelector(".insight-box");
      if (insightBox) card.insertBefore(newDiv, insightBox);
      else card.appendChild(newDiv);
      container = d3.select(newDiv);
    } else return;
  }

  container.selectAll("*").interrupt().remove();

  if (!data || data.length === 0) {
    const message = "No heatmap data available for the selected filters.";
    container.append("p").attr("class", "heatmap-empty").style("padding", "24px").style("text-align", "center").text(message);
    d2EnsureHeatmapContent(message);
    return;
  }

  const startYear = +d3.select("#d2StartYear").property("value");
  const endYear = +d3.select("#d2EndYear").property("value");
  const selectedJurisdiction = d3.select("#d2JurisdictionSelect").property("value");

  const years = Array.from(new Set(allData.map(d => d.YEAR)))
    .filter(yr => yr >= Math.min(startYear, endYear) && yr <= Math.max(startYear, endYear)).sort((a, b) => a - b);

  const jurisdictions = selectedJurisdiction === "All"
    ? D2_JURISDICTION_ORDER.filter(j => allData.some(d => d.JURISDICTION === j))
    : [selectedJurisdiction];

  const dataMap = new Map();
  data.forEach(d => { dataMap.set(`${d.YEAR}-${d.JURISDICTION}`, d["Positive drug tests"]); });

  const margin = { top: 54, right: 180, bottom: 62, left: 92 };
  const totalWidth = 1160;
  const totalHeight = Math.max(360, 96 + jurisdictions.length * 42);
  const innerWidth = totalWidth - margin.left - margin.right;
  const innerHeight = totalHeight - margin.top - margin.bottom;

  const svg = container.append("svg").attr("class", "drug-outcome-style-heatmap").attr("width", totalWidth).attr("height", totalHeight).attr("viewBox", `0 0 ${totalWidth} ${totalHeight}`).attr("preserveAspectRatio", "xMidYMid meet");
  const inner = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const maxVal = d3.max(allData, d => d["Positive drug tests"]) || 1;
  const cellWidth = innerWidth / years.length;
  const cellHeight = innerHeight / jurisdictions.length;
  const colorScale = d3.scaleSequential().domain([0, maxVal]).interpolator(d3.interpolateOranges);

  const cells = [];
  years.forEach((year, xi) => {
    jurisdictions.forEach((jur, yi) => {
      const val = dataMap.get(`${year}-${jur}`) || 0;
      cells.push({ year, jur, val, xi, yi, active: dataMap.has(`${year}-${jur}`) });
    });
  });

  inner.selectAll(".heatmap-cell").data(cells, d => `${d.year}-${d.jur}`).join(
    enter => enter.append("rect").attr("class", "heatmap-cell")
      .attr("x", d => d.xi * cellWidth).attr("y", d => d.yi * cellHeight).attr("width", Math.max(0, cellWidth - 3)).attr("height", Math.max(0, cellHeight - 3))
      .attr("rx", 8).style("cursor", "pointer").attr("fill", "#E5E7EB").attr("opacity", 0)
      .call(e => e.transition().duration(600).ease(d3.easeCubicOut).attr("fill", d => d.active ? colorScale(d.val) : "#E5E7EB").attr("opacity", 1)),
    update => update.call(u => u.transition().duration(600).ease(d3.easeCubicOut).attr("fill", d => d.active ? colorScale(d.val) : "#E5E7EB")),
    exit => exit.call(e => e.transition().duration(600).attr("opacity", 0).remove())
  )
  .on("mouseenter", function(event, d) {
    d3.select(this).attr("stroke", "#111827").attr("stroke-width", 2);
    const displayValue = d.active ? `${d2FormatNum(d.val)} (${d2FormatK(d.val)})` : "No record";
    d2ShowTooltipPinned(event, `<strong>${d.jur} — ${d.year}</strong><br>Positive tests: ${displayValue}`);
  })
  .on("mouseleave", function() { 
    d3.select(this).attr("stroke", "none"); 
    d2HideTooltip(); 
  });

  inner.selectAll(".cell-label").data(cells, d => `${d.year}-${d.jur}`).join(
    enter => enter.append("text").attr("class", "cell-label")
      .attr("x", d => d.xi * cellWidth + cellWidth / 2).attr("y", d => d.yi * cellHeight + cellHeight / 2 + 5)
      .attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", 800).attr("opacity", 0)
      .attr("fill", d => (d.active && d.val > maxVal * 0.55) ? "#fff" : "#222")
      .text(d => d.active && d.val > 0 ? d2FormatK(d.val) : "–") 
      .call(e => e.transition().duration(600).ease(d3.easeCubicOut).attr("opacity", 1)),
    update => update.call(u => u.transition().duration(600).ease(d3.easeCubicOut)
      .attr("x", d => d.xi * cellWidth + cellWidth / 2).attr("y", d => d.yi * cellHeight + cellHeight / 2 + 5)
      .attr("fill", d => (d.active && d.val > maxVal * 0.55) ? "#fff" : "#222")
      .text(d => d.active && d.val > 0 ? d2FormatK(d.val) : "–")),
    exit => exit.call(e => e.transition().duration(600).attr("opacity", 0).remove())
  );

  const xScale = d3.scalePoint().domain(years).range([cellWidth / 2, innerWidth - cellWidth / 2]);
  const yScale = d3.scalePoint().domain(jurisdictions).range([cellHeight / 2, innerHeight - cellHeight / 2]);

  inner.append("g").attr("class", "axis-x").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(xScale).tickFormat(d3.format("d"))).call(g => g.select(".domain").remove());
  inner.append("g").attr("class", "axis-y").call(d3.axisLeft(yScale)).call(g => g.select(".domain").remove());

  inner.append("text").attr("x", innerWidth / 2).attr("y", innerHeight + 48).attr("text-anchor", "middle").attr("font-size", "13px").attr("font-weight", "800").attr("fill", "#111827").text("Year");
  inner.append("text").attr("class", "chart-title-label horizontal-axis-label").attr("x", 0).attr("y", -22).attr("transform", null).attr("text-anchor", "start").attr("font-size", "13px").attr("font-weight", "800").attr("fill", "#111827").text("Jurisdiction");

  const defs = svg.append("defs");
  const linearGrad = defs.append("linearGradient").attr("id", "d2-heatmap-gradient").attr("x1", "0%").attr("x2", "100%");
  linearGrad.append("stop").attr("offset", "0%").attr("stop-color", colorScale(0));
  linearGrad.append("stop").attr("offset", "100%").attr("stop-color", colorScale(maxVal));

  const legend = inner.append("g").attr("class", "heatmap-svg-legend").attr("transform", `translate(${innerWidth + 28},22)`);
  legend.append("text").attr("x", 0).attr("y", -8).attr("font-size", 11).attr("font-weight", 800).attr("fill", "#374151").text("Positive Tests");
  legend.append("rect").attr("width", 130).attr("height", 14).attr("rx", 7).attr("fill", "url(#d2-heatmap-gradient)");
  legend.append("text").attr("x", 0).attr("y", 30).attr("font-size", 10).attr("fill", "#374151").text("Low");
  legend.append("text").attr("x", 130).attr("y", 30).attr("font-size", 10).attr("text-anchor", "end").attr("fill", "#374151").text("High");

  const maxCell = d3.greatest(cells.filter(d => d.active), d => d.val);
  const heatmapMessage = maxCell
    ? `${maxCell.jur} in ${maxCell.year} had the highest positive drug test count (${d3.format(",")(maxCell.val)}).`
    : "No heatmap insight available for the selected filters.";

  d2EnsureHeatmapContent(heatmapMessage);
}