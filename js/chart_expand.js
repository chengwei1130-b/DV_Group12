// ─────────────────────────────────────────────────────────────────────────────
// js/chart_expand.js - Chart Expand Modal
// Replaces the old hover-only "info" tooltip on each chart's circular button
// with a click-to-expand modal: left side shows an enlarged copy of the
// chart, right side shows a DATA TABLE of the exact values driving that
// chart. Works for both Dashboard 1 and Dashboard 2 chart cards.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  if (window.openChartExpand) return; // already initialised (script only meant to load once)

  // ───────────────────────────────────────────────────────────────────────
  // Each chart's draw function (js/d1/*.js, js/d2/*.js) stashes its current
  // values into this object using the same shape:
  //   {
  //     columns: ["Col A", "Col B", ...],
  //     rows: [[v1, v2, ...], ...],
  //     rowKeys: ["point-2022", ...]   // optional, same length as rows
  //   }
  // Key = the id of the chart's <svg> (or its container div for the two
  // heatmaps, which render their own internal <svg>) — same key used by
  // openChartExpand() below to look up the right data set.
  //
  // rowKeys[i], when present, must match the `data-key` attribute the chart
  // stamps onto the SVG element(s) representing that same data point (a
  // circle, bar, or heatmap cell). Hovering the table row then highlights
  // whichever cloned chart element(s) share that data-key.
  // ───────────────────────────────────────────────────────────────────────
  window.chartExpandTableData = window.chartExpandTableData || {};

  document.head.insertAdjacentHTML("beforeend", `<style id="chart-expand-css">
    body.chart-expand-no-scroll { overflow: hidden; }

    .chart-expand-overlay {
      position: fixed; inset: 0; z-index: 20000;
      background: rgba(17, 24, 39, 0.72);
      display: none; align-items: center; justify-content: center;
      padding: 14px;
    }
    .chart-expand-overlay.open { display: flex; }

    .chart-expand-chart-wrap {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .chart-expand-modal {
      position: relative;
      background: #fff;
      border-radius: 22px;
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
      width: 96vw;
      max-width: 1800px;
      height: 92vh;
      max-height: 92vh;
      display: grid;
      grid-template-columns: 70% 30%;
      overflow: hidden;
    }

    .chart-expand-close {
      position: absolute; top: 14px; right: 14px; z-index: 5;
      width: 38px; height: 38px; border-radius: 50%;
      border: 1px solid rgba(23, 32, 51, 0.18);
      background: #fff; color: #111827;
      font-size: 20px; line-height: 1; cursor: pointer;
      display: grid; place-items: center;
      transition: background .15s ease, color .15s ease, transform .15s ease;
    }
    .chart-expand-close:hover, .chart-expand-close:focus-visible {
      background: #fff3e0; color: #F1622B; transform: translateY(-1px); outline: none;
    }

    .chart-expand-left {
      padding: 36px;
      display: flex; align-items: center; justify-content: center;
      background: #FBFAF8;
      overflow: auto;
      height: 100%;
      box-sizing: border-box;
    }
    .chart-expand-left svg {
      width: 100%; height: 100%; max-height: 100%; display: block;
    }

    .chart-expand-right {
      padding: 36px 32px;
      overflow-y: auto;
      border-left: 1px solid rgba(23, 32, 51, 0.08);
      height: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
    }
    .chart-expand-kicker {
      margin: 0 0 6px; font-size: 11px; font-weight: 800;
      letter-spacing: .08em; text-transform: uppercase; color: #F1622B;
    }
    .chart-expand-title { margin: 0 0 14px; font-size: 22px; line-height: 1.25; color: #111827; }

    /* "How to read this table" / "Data note" info boxes shown below the
       table, condensing the table area to roughly half the right panel. */
    .chart-expand-info-box {
      border-radius: 12px;
      padding: 12px 16px;
      margin: 14px 0 0;
      font-size: 13px;
      line-height: 1.5;
    }
    .chart-expand-info-title {
      margin: 0 0 6px;
      font-size: 11.5px;
      font-weight: 800;
      letter-spacing: .03em;
      text-transform: uppercase;
    }
    .chart-expand-info-box p { margin: 0; color: #374151; }
    .chart-expand-info-how {
      background: #FDF1E6;
      border: 1px solid rgba(241, 98, 43, 0.18);
    }
    .chart-expand-info-how .chart-expand-info-title { color: #B9501C; }
    .chart-expand-info-note {
      background: #EAF1FB;
      border: 1px solid rgba(30, 86, 160, 0.18);
    }
    .chart-expand-info-note .chart-expand-info-title { color: #1E56A0; }
    .chart-expand-info-box:empty,
    .chart-expand-info-box[hidden] { display: none; }

    .chart-expand-table-wrap {
      border: 1px solid rgba(23, 32, 51, 0.10);
      border-radius: 14px;
      overflow: auto;
      flex: 1 1 50%;
      max-height: 50%;
    }
    .chart-expand-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13.5px;
    }
    .chart-expand-table thead th {
      position: sticky; top: 0;
      background: #FFF7ED;
      color: #111827;
      font-size: 11px; font-weight: 800;
      text-transform: uppercase; letter-spacing: .04em;
      text-align: left;
      padding: 10px 14px;
      border-bottom: 1px solid rgba(241, 98, 43, 0.25);
      white-space: nowrap;
    }
    .chart-expand-table tbody td {
      padding: 9px 14px;
      color: #374151;
      border-bottom: 1px solid rgba(23, 32, 51, 0.06);
      white-space: nowrap;
    }
    .chart-expand-table tbody tr:last-child td { border-bottom: none; }
    .chart-expand-table tbody tr:nth-child(even) { background: #FBFAF8; }
    .chart-expand-table tbody tr:hover { background: #FFF3E0; }
    .chart-expand-table tbody tr[data-row-key] { cursor: pointer; }
    .chart-expand-table-empty { color: #6B7280; text-align: center; }

    /* Pulses/glows the matching chart element (circle, bar, or heatmap cell)
       when its row is hovered in the data table. transform-box: fill-box
       makes the scale animate around the shape's own center regardless of
       its position in the SVG. */
    @keyframes chartExpandHighlightPulse {
      0%, 100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(241, 98, 43, 0)); }
      50% { transform: scale(1.22); filter: drop-shadow(0 0 8px rgba(241, 98, 43, 0.85)); }
    }
    .chart-expand-highlight {
      animation: chartExpandHighlightPulse 0.85s ease-in-out infinite;
      transform-box: fill-box;
      transform-origin: center;
      stroke: #111827 !important;
      stroke-width: 3px !important;
    }

    @media (max-width: 880px) {
      .chart-expand-modal { grid-template-columns: 1fr; grid-template-rows: 55% 45%; width: 94vw; height: 94vh; }
      .chart-expand-left { padding: 56px 16px 16px; }
      .chart-expand-right { border-left: none; border-top: 1px solid rgba(23, 32, 51, 0.08); padding: 20px 18px; }
      .chart-expand-info-box { padding: 10px 12px; font-size: 12px; margin-top: 10px; }
    }
  </style>`);

  const overlay = document.createElement("div");
  overlay.id = "chartExpandOverlay";
  overlay.className = "chart-expand-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Expanded chart view");
  overlay.innerHTML = `
    <div class="chart-expand-modal">
      <button type="button" class="chart-expand-close" aria-label="Close expanded chart">×</button>
      <div class="chart-expand-left"><div class="chart-expand-chart-wrap"></div></div>
      <div class="chart-expand-right">
        <p class="chart-expand-kicker">Data table</p>
        <h2 class="chart-expand-title"></h2>
        <div class="chart-expand-table-wrap">
          <table class="chart-expand-table">
            <thead><tr class="chart-expand-table-head-row"></tr></thead>
            <tbody class="chart-expand-table-body"></tbody>
          </table>
        </div>
        <div class="chart-expand-info-box chart-expand-info-how">
          <p class="chart-expand-info-title">How to read this table</p>
          <p class="chart-expand-info-how-text"></p>
        </div>
        <div class="chart-expand-info-box chart-expand-info-note">
          <p class="chart-expand-info-title">Data note</p>
          <p class="chart-expand-info-note-text"></p>
        </div>
      </div>
    </div>`;
  document.documentElement.appendChild(overlay);

  const chartWrap = overlay.querySelector(".chart-expand-chart-wrap");
  const titleEl = overlay.querySelector(".chart-expand-title");
  const howText = overlay.querySelector(".chart-expand-info-how-text");
  const noteText = overlay.querySelector(".chart-expand-info-note-text");
  const tableHeadRow = overlay.querySelector(".chart-expand-table-head-row");
  const tableBody = overlay.querySelector(".chart-expand-table-body");
  const closeBtn = overlay.querySelector(".chart-expand-close");

  let lastFocused = null;

  function closeChartExpand() {
    overlay.classList.remove("open");
    chartWrap.innerHTML = "";
    document.body.classList.remove("chart-expand-no-scroll");
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  // Adds/removes the pulse-highlight class on whichever cloned chart
  // element(s) share this data-key (set by each chart's draw function,
  // e.g. data-key="point-2022" or data-key="cell-2022-VIC").
  function clearChartHighlights() {
    chartWrap.querySelectorAll(".chart-expand-highlight").forEach(el => el.classList.remove("chart-expand-highlight"));
  }

  function highlightChartElements(key) {
    if (!key) return;
    chartWrap.querySelectorAll(`[data-key="${CSS.escape(key)}"]`).forEach(el => el.classList.add("chart-expand-highlight"));
  }

  // Renders the right-panel table from a { columns, rows, rowKeys } object
  // (see the window.chartExpandTableData documentation above). rowKeys[i]
  // is optional and, when present, links rows[i] to the matching chart
  // element(s) so hovering the row highlights the data point/bar/cell on
  // the left. Falls back to a single "no data" row when the chart has
  // nothing plotted for the current filters.
  function renderChartExpandTable(tableData) {
    tableHeadRow.innerHTML = "";
    tableBody.innerHTML = "";
    clearChartHighlights();

    const columns = (tableData && tableData.columns) || [];
    const rows = (tableData && tableData.rows) || [];
    const rowKeys = (tableData && tableData.rowKeys) || [];

    columns.forEach(col => {
      const th = document.createElement("th");
      th.textContent = col;
      tableHeadRow.appendChild(th);
    });

    if (!rows.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.className = "chart-expand-table-empty";
      td.colSpan = Math.max(columns.length, 1);
      td.textContent = "No data available for the current filters.";
      tr.appendChild(td);
      tableBody.appendChild(tr);
      return;
    }

    rows.forEach((row, i) => {
      const tr = document.createElement("tr");
      const key = rowKeys[i];
      if (key) {
        tr.dataset.rowKey = key;
        tr.addEventListener("mouseenter", () => highlightChartElements(key));
        tr.addEventListener("mouseleave", clearChartHighlights);
      }
      row.forEach(cell => {
        const td = document.createElement("td");
        td.textContent = cell;
        tr.appendChild(td);
      });
      tableBody.appendChild(tr);
    });
  }

  // Fills the "How to read this table" / "Data note" boxes above the table.
  // Uses tableData.description / tableData.note when a chart script has
  // supplied them; otherwise falls back to copy generated from the chart's
  // title and column names so every chart still gets a sensible default.
  function renderChartExpandInfo(tableData, chartTitle) {
    const columns = (tableData && tableData.columns) || [];
    const valueCols = columns.slice(1); // first column is usually the row label (Year, etc.)
    const metricLabel = valueCols.length ? valueCols.join(" and ") : "values";
    const lowerTitle = (chartTitle || "this chart").replace(/^\d+\.\s*/, "").trim();

    const defaultHow = `This table shows the ${metricLabel.toLowerCase()} behind "${lowerTitle}". It is the processed data used to generate the chart on the left.`;
    const defaultNote = `Values are based on the processed dataset and may differ slightly from raw data due to cleaning and formatting.`;

    howText.textContent = (tableData && tableData.description) || defaultHow;
    noteText.textContent = (tableData && tableData.note) || defaultNote;
  }

  function openChartExpand(button) {
    const card = button.closest(".story-chart-card");
    if (!card) return;

    const heading = card.querySelector(".chart-heading h2");
    const sourceChart = card.querySelector("svg");

    // Look up this chart's id (svg id, or its container div's id for the
    // two heatmaps) to find the matching entry in window.chartExpandTableData.
    const chartContainer = card.querySelector("svg[id], [id$='-heatmap-chart']");
    const chartKey = chartContainer ? chartContainer.id : "";
    const tableData = (window.chartExpandTableData && window.chartExpandTableData[chartKey]) || null;

    const chartTitle = heading ? heading.textContent.trim() : "Chart";
    titleEl.textContent = chartTitle;
    renderChartExpandTable(tableData);
    renderChartExpandInfo(tableData, chartTitle);

    chartWrap.innerHTML = "";
    if (sourceChart) {
      const clone = sourceChart.cloneNode(true);
      clone.removeAttribute("width");
      clone.removeAttribute("height");
      clone.style.width = "100%";
      clone.style.height = "auto";
      clone.style.maxHeight = "72vh";
      clone.style.display = "block";
      chartWrap.appendChild(clone);
      bindClonedChartTooltips(clone);
    }

    lastFocused = document.activeElement;
    overlay.classList.add("open");
    document.body.classList.add("chart-expand-no-scroll");
    closeBtn.focus();
  }

  // cloneNode(true) copies DOM structure and attributes (including any
  // `data-tooltip` attribute each chart script stamps onto its hoverable
  // elements) but NOT event listeners attached via D3's .on(). This
  // re-attaches hover tooltips on the cloned/expanded chart by reading
  // that data-tooltip attribute, reusing the same global tooltip element
  // and positioning logic as the original charts (showTooltipPinned /
  // hideTooltip, defined in js/d1_tooltips.js).
  function bindClonedChartTooltips(clone) {
    if (typeof showTooltipPinned !== "function" || typeof hideTooltip !== "function") return;
    clone.querySelectorAll("[data-tooltip]").forEach(el => {
      el.style.cursor = "pointer";
      el.addEventListener("mouseenter", event => showTooltipPinned(event, el.getAttribute("data-tooltip")));
      el.addEventListener("mouseleave", hideTooltip);
    });
  }

  overlay.addEventListener("click", e => {
    if (e.target === overlay) closeChartExpand();
  });
  closeBtn.addEventListener("click", closeChartExpand);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && overlay.classList.contains("open")) closeChartExpand();
  });

  // Turns every `.info-dot` button inside scopeSelector into an expand
  // trigger: swaps the "i" glyph for an expand icon and wires the click.
  // Safe to call repeatedly (e.g. every time a dashboard page re-renders).
  function initChartExpandButtons(scopeSelector) {
    document.querySelectorAll(`${scopeSelector} .info-dot`).forEach(btn => {
      if (!btn.dataset.expandBound) {
        btn.dataset.expandBound = "1";
        btn.addEventListener("click", () => openChartExpand(btn));
      }
      btn.classList.add("expand-dot");
      btn.textContent = "⤢";
      const baseLabel = (btn.getAttribute("aria-label") || "Chart").replace(/\s+information$/i, "");
      btn.setAttribute("aria-label", `Expand ${baseLabel}`);
      btn.title = "Click to view the expanded chart and data table";
    });
  }

  window.openChartExpand = openChartExpand;
  window.closeChartExpand = closeChartExpand;
  window.initChartExpandButtons = initChartExpandButtons;
})();