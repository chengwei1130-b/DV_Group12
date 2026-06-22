/* ==========================================================
   Page onboarding guide
   - UI-only feature for guiding users through each SPA page.
   - Does not touch datasets, chart calculations, D3 scales, filters,
     grouping, heatmap values, or SPA routing logic.
   ========================================================== */
(function () {
  const guides = {
    home: [
      {
        selector: "#home .page-heading",
        title: "Welcome to the Dashboard",
        text: "This page introduces the Australian road safety data story and helps users choose where to begin."
      },
      {
        selector: "#home .feature-image-shell",
        title: "Main Project Preview",
        text: "The hero visual introduces the road safety enforcement theme before users explore the interactive dashboards."
      },
      {
        selector: "#home .feature-copy-panel",
        title: "Project Purpose",
        text: "This section explains what the website is about: enforcement patterns, jurisdictions, and yearly changes."
      },
      {
        selector: "#home .story-path-panel",
        title: "How to Read the Story",
        text: "Users can follow the intended flow: start with trends, compare locations, then look for year-by-jurisdiction patterns."
      },
      {
        selector: "#home .home-card-stack .premium-link-card:nth-child(1)",
        title: "Dashboard 1",
        text: "This card opens the Speeding Enforcement dashboard, where users can explore speeding fines from multiple views."
      },
      {
        selector: "#home .home-card-stack .premium-link-card:nth-child(2)",
        title: "Dashboard 2",
        text: "This card opens the Drug Testing dashboard, which compares enforcement volume, positive tests, and jurisdiction patterns."
      },
      {
        selector: "#home .home-card-stack .premium-link-card:nth-child(3)",
        title: "About Us",
        text: "This card leads to the team page, where users can learn about the project members and overall mission."
      },
      {
        selector: "#a11y-open",
        title: "Accessibility Controls",
        text: "Use the accessibility button to open quick controls for zoom, colour themes, and magnifier support on any page."
      }
    ],

    dashboard1: [
      {
        selector: "#dashboard1 .dashboard-heading",
        title: "Speeding Enforcement Story",
        text: "This page explains how speeding fine records changed across years and Australian jurisdictions."
      },
      {
        selector: "#dashboard1 .filter-panel",
        title: "Filter the View",
        text: "Use the start year, end year, and jurisdiction filters to focus the story on a specific time range or location."
      },
      {
        selector: "#dashboard1 .kpi-grid",
        title: "Read the Key Numbers First",
        text: "The KPI cards summarise total fines, peak year, leading jurisdiction, and change since the peak."
      },
      {
        selector: "#lineChart",
        title: "Chart 1: Yearly Trend",
        text: "This line chart shows how speeding fine totals changed over time, making the overall trend easy to follow."
      },
      {
        selector: "#lollipopChart",
        title: "Chart 2: Jurisdiction Comparison",
        text: "This lollipop chart ranks jurisdictions so users can identify where speeding fine totals were highest."
      },
      {
        selector: "#d1-heatmap-chart",
        title: "Chart 3: Year-by-Jurisdiction Pattern",
        text: "The heatmap combines year and jurisdiction, helping users spot the strongest fine concentration in one view."
      },
      {
        selector: "#dashboard1 .heatmap-card .info-dot, #dashboard1 .story-chart-card .info-dot",
        title: "Expand Charts",
        text: "Use the expand icon on chart cards to inspect each visualisation more clearly during presentation or analysis."
      },
      {
        selector: "#a11y-fab",
        title: "Accessibility Controls",
        text: "The accessibility button provides options such as colour themes, zoom, and magnifier support."
      }
    ],

    dashboard2: [
      {
        selector: "#drug-dashboard .dashboard-heading",
        title: "Drug Testing & Enforcement Story",
        text: "This page explores drug testing volume, confirmed positive tests, and enforcement differences across jurisdictions."
      },
      {
        selector: "#drug-dashboard .filter-panel",
        title: "Filter the Dashboard",
        text: "Use the year and jurisdiction filters to compare selected periods or focus on one jurisdiction."
      },
      {
        selector: "#drug-dashboard .kpi-grid",
        title: "Start with the KPI Cards",
        text: "These cards summarise total tests, positive tests, positivity rate, and the jurisdiction with the highest positive rate."
      },
      {
        selector: "#d2GroupedBar",
        title: "Chart 1: Enforcement Volume Comparison",
        text: "The grouped bar chart compares speeding fines and drug testing volume across jurisdictions."
      },
      {
        selector: "#d2AreaChart",
        title: "Chart 2: Positive Tests Over Time",
        text: "The stacked area chart shows how confirmed positive drug tests changed by year and jurisdiction."
      },
      {
        selector: "#d2-heatmap-chart",
        title: "Chart 3: Positive Test Heatmap",
        text: "The heatmap highlights where and when positive drug test outcomes were most concentrated."
      },
      {
        selector: "#drug-dashboard .heatmap-card .info-dot, #drug-dashboard .story-chart-card .info-dot",
        title: "Expand Charts",
        text: "Use the expand icon to enlarge a chart when users need a clearer view of details and labels."
      },
      {
        selector: "#a11y-fab",
        title: "Accessibility Controls",
        text: "The floating accessibility button helps users customise the page view for readability."
      }
    ],

    about: [
      {
        selector: "#about-us .about-heading",
        title: "About the Project Team",
        text: "This page introduces the members behind the Australian Road Safety Insights website."
      },
      {
        selector: "#about-us .about-us-content",
        title: "Team Member Contributions",
        text: "Each card explains a member's responsibilities, including data preparation, visualisation, layout, and project development."
      },
      {
        selector: "#about-us .mission-panel",
        title: "Project Mission",
        text: "The mission section explains the goal of presenting road safety enforcement data clearly and accessibly."
      },
      {
        selector: ".bottom-site-footer",
        title: "Footer Information",
        text: "The footer summarises the academic context, dataset period, and key dashboard focus areas."
      },
      {
        selector: "#a11y-open",
        title: "Accessibility Controls",
        text: "The accessibility button is also available on this page, allowing users to adjust zoom, colour mode, and magnifier support."
      }
    ]
  };

  let activeSteps = [];
  let activeIndex = 0;
  let currentTarget = null;
  let overlay = null;
  let spotlight = null;
  let popover = null;
  let lastSpotlightBox = null;
  let spotlightAnimation = null;
  let spotlightFrame = null;
  let suppressSpotlightScrollUpdate = false;

  function getCurrentGuideKey(button) {
    if (button?.dataset?.onboarding) return button.dataset.onboarding;
    if (document.querySelector("#home")) return "home";
    if (document.querySelector("#dashboard1")) return "dashboard1";
    if (document.querySelector("#drug-dashboard")) return "dashboard2";
    if (document.querySelector("#about-us")) return "about";
    return "home";
  }

  function findFirstAvailableElement(selector) {
    if (!selector) return null;
    const selectors = selector.split(",").map(item => item.trim()).filter(Boolean);
    for (const item of selectors) {
      const found = document.querySelector(item);
      if (found) return found;
    }
    return null;
  }

  function getHighlightTarget(element) {
    if (!element) return null;

    const directInfoDot = element.closest?.(".info-dot");
    if (directInfoDot) return directInfoDot;

    const a11yButton = document.getElementById("a11y-open");
    if ((element.id === "a11y-open" || element.closest?.("#a11y-open") || element.id === "a11y-fab" || element.closest?.("#a11y-fab")) && a11yButton) {
      return a11yButton;
    }

    return element.closest(".story-chart-card, .filter-panel, .kpi-grid, .feature-panel, .feature-image-shell, .feature-copy-panel, .story-path-panel, .premium-link-card, .about-us-content, .mission-panel, .section-heading, .page-heading, .bottom-site-footer") || element;
  }

  function getAvailableSteps(key) {
    return (guides[key] || []).map(step => {
      const source = findFirstAvailableElement(step.selector);
      const target = getHighlightTarget(source);
      return target ? { ...step, target } : null;
    }).filter(Boolean);
  }

  function createGuideElements() {
    if (overlay && popover) return;

    overlay = document.createElement("div");
    overlay.className = "onboarding-overlay";
    overlay.setAttribute("aria-hidden", "true");

    spotlight = document.createElement("div");
    spotlight.className = "onboarding-spotlight";
    spotlight.setAttribute("aria-hidden", "true");

    popover = document.createElement("aside");
    popover.className = "onboarding-popover";
    popover.setAttribute("role", "dialog");
    popover.setAttribute("aria-live", "polite");
    popover.setAttribute("aria-label", "Page guide");

    popover.innerHTML = `
      <button class="onboarding-close" type="button" aria-label="Close guide">×</button>
      <p class="onboarding-progress"></p>
      <h2 class="onboarding-title"></h2>
      <p class="onboarding-text"></p>
      <div class="onboarding-actions">
        <button class="onboarding-prev" type="button">← Previous</button>
        <button class="onboarding-next" type="button">Next →</button>
      </div>
    `;

    // Append to <html> (not <body>) so these fixed-position elements are
    // NOT subject to the body{zoom} applied by the accessibility widget.
    // When zoom is applied to <body>, position:fixed children placed inside
    // it are positioned in the zoomed coordinate space, causing them to appear
    // in the wrong location. Placing them on <html> keeps them in true
    // viewport pixel coordinates that match getBoundingClientRect() values.
    document.documentElement.appendChild(overlay);
    document.documentElement.appendChild(spotlight);
    document.documentElement.appendChild(popover);

    popover.querySelector(".onboarding-close").addEventListener("click", closeGuide);
    popover.querySelector(".onboarding-prev").addEventListener("click", () => moveStep(-1));
    popover.querySelector(".onboarding-next").addEventListener("click", () => moveStep(1));
  }

  function startGuide(key) {
    createGuideElements();
    activeSteps = getAvailableSteps(key);
    activeIndex = 0;

    if (!activeSteps.length) return;

    document.body.classList.add("onboarding-active");
    overlay.classList.add("show");
    spotlight.classList.add("show");
    popover.classList.add("show");
    showStep();
  }

  function clearTarget() {
    if (currentTarget) {
      currentTarget.classList.remove("onboarding-highlight");
      currentTarget = null;
    }
  }

  function isHomeNavCard(element) {
    return Boolean(element?.closest?.("#home .home-card-stack .premium-link-card"));
  }

  function useCompactMobileHomePopover(element = currentTarget) {
    return Boolean(isHomeNavCard(element) && window.innerWidth <= 640);
  }

  function syncPopoverMode(element = currentTarget) {
    popover?.classList.toggle("home-card-mobile-popover", useCompactMobileHomePopover(element));
  }

  function isHomeReadableSection(element) {
    return Boolean(element?.matches?.("#home .feature-copy-panel, #home .story-path-panel"));
  }

  function isTargetComfortablyVisible(element) {
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;

    if (isHomeNavCard(element)) {
      // On phone widths the guide card has to sit above the Home navigation
      // card, otherwise it can cover the card button. Keep desktop behaviour
      // unchanged, but ask mobile cards to sit lower in the viewport.
      if (viewportW <= 640) {
        const popoverHeight = popover?.getBoundingClientRect?.().height || 220;
        const preferredTop = Math.min(viewportH * 0.44, popoverHeight + 22);
        const button = element.querySelector?.(".link-card-button");
        const buttonRect = button?.getBoundingClientRect?.();
        const visibleBottom = Math.min(rect.bottom, viewportH - 16);
        const visibleHeight = Math.max(0, visibleBottom - Math.max(rect.top, 16));
        const visibilityRatio = visibleHeight / Math.max(1, rect.height);
        const buttonVisible = buttonRect
          ? buttonRect.bottom <= viewportH - 18 && buttonRect.top >= popoverHeight + 18
          : true;

        return (
          rect.top >= preferredTop - 22 &&
          rect.top <= preferredTop + 64 &&
          visibilityRatio >= 0.50 &&
          buttonVisible &&
          rect.right > 12 &&
          rect.left < viewportW - 12
        );
      }

      const topSafeZone = Math.min(78, viewportH * 0.12);
      const bottomSafeZone = Math.min(78, viewportH * 0.12);
      const visibleTop = Math.max(rect.top, topSafeZone);
      const visibleBottom = Math.min(rect.bottom, viewportH - bottomSafeZone);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);
      const visibilityRatio = visibleHeight / Math.max(1, rect.height);

      return (
        visibilityRatio >= 0.62 &&
        rect.right > 12 &&
        rect.left < viewportW - 12
      );
    }

    if (isHomeReadableSection(element)) {
      const heading = element.querySelector("h2, h3") || element;
      const headingRect = heading.getBoundingClientRect();
      return headingRect.top >= 82 && headingRect.top <= viewportH * 0.42;
    }

    const verticalMargin = Math.min(72, viewportH * 0.10);
    const horizontalMargin = 16;

    if (rect.height > viewportH - (verticalMargin * 2)) {
      return rect.top < viewportH * 0.38 && rect.bottom > verticalMargin;
    }

    return (
      rect.top >= verticalMargin &&
      rect.bottom <= viewportH - verticalMargin &&
      rect.left >= horizontalMargin &&
      rect.right <= viewportW - horizontalMargin
    );
  }

  function scrollTargetIntoGuideView(element) {
    if (!element) return;

    if (isHomeNavCard(element)) {
      const rect = element.getBoundingClientRect();

      if (window.innerWidth <= 640) {
        const popoverHeight = popover?.getBoundingClientRect?.().height || 220;
        const button = element.querySelector?.(".link-card-button");
        const buttonRect = button?.getBoundingClientRect?.();
        const preferredTop = Math.min(window.innerHeight * 0.44, popoverHeight + 22);
        let scrollAmount = rect.top - preferredTop;

        // If the card action button would still be hidden under the guide or
        // near the bottom edge, nudge the page just enough to keep it visible.
        if (buttonRect) {
          const bottomOverflow = buttonRect.bottom - (window.innerHeight - 18);
          const topOverlap = (popoverHeight + 18) - buttonRect.top;

          if (bottomOverflow > 0) {
            scrollAmount = Math.max(scrollAmount, bottomOverflow);
          }

          if (topOverlap > 0) {
            scrollAmount = Math.min(scrollAmount, -topOverlap);
          }
        }

        if (Math.abs(scrollAmount) > 1) {
          window.scrollBy({ top: scrollAmount, left: 0, behavior: "auto" });
        }
        return;
      }

      const topSafeZone = Math.min(78, window.innerHeight * 0.12);
      const bottomSafeZone = Math.min(78, window.innerHeight * 0.12);
      let scrollAmount = 0;

      if (rect.top < topSafeZone) {
        scrollAmount = rect.top - topSafeZone;
      } else if (rect.bottom > window.innerHeight - bottomSafeZone) {
        scrollAmount = rect.bottom - (window.innerHeight - bottomSafeZone);
      }

      if (Math.abs(scrollAmount) > 1) {
        window.scrollBy({ top: scrollAmount, left: 0, behavior: "auto" });
      }
      return;
    }

    if (isHomeReadableSection(element)) {
      const anchor = element.querySelector("h2, h3") || element;
      const rect = anchor.getBoundingClientRect();
      const targetTop = Math.max(76, window.innerHeight * 0.22);
      window.scrollBy({ top: rect.top - targetTop, left: 0, behavior: "auto" });
      return;
    }

    element.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
  }

  function updateGuidePosition(animateSpotlight = true, fromBox = null) {
    positionSpotlight(animateSpotlight, fromBox);
    positionPopover();
  }

  function showStep() {
    const step = activeSteps[activeIndex];
    if (!step) return;

    const previousTarget = currentTarget;
    const fromBox = getCurrentSpotlightBox() || lastSpotlightBox;

    clearTarget();
    currentTarget = step.target;
    currentTarget.classList.add("onboarding-highlight");
    syncPopoverMode(currentTarget);

    popover.querySelector(".onboarding-progress").textContent = `${activeIndex + 1} of ${activeSteps.length}`;
    popover.querySelector(".onboarding-title").textContent = step.title;
    popover.querySelector(".onboarding-text").textContent = step.text;

    const prevButton = popover.querySelector(".onboarding-prev");
    const nextButton = popover.querySelector(".onboarding-next");
    prevButton.disabled = activeIndex === 0;
    nextButton.textContent = activeIndex === activeSteps.length - 1 ? "Finish" : "Next →";

    if (!isTargetComfortablyVisible(currentTarget)) {
      suppressSpotlightScrollUpdate = true;
      scrollTargetIntoGuideView(currentTarget);
    }

    // Let layout settle after any required auto-scroll, then animate from the
    // previous visible box to the new target box. Two RAFs are used only to
    // give the browser a clean old-box and new-box state; there is no timed
    // delay, so the guide stays responsive.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        updateGuidePosition(true, fromBox);
        suppressSpotlightScrollUpdate = false;
      });
    });
  }

  function getCurrentSpotlightBox() {
    if (!spotlight?.classList.contains("show")) return null;

    const rect = spotlight.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      borderRadius: spotlight.style.borderRadius || "22px"
    };
  }

  // Returns the current body{zoom} factor set by the accessibility widget.
  // getBoundingClientRect() values already reflect zoomed layout in CSS-pixel
  // viewport coordinates. Since spotlight/popover now live on <html> (outside
  // the zoomed body), those raw rect values can be used directly — no scaling
  // needed. We keep this helper available for the popover clamping logic.
  function getBodyZoom() {
    return parseFloat(document.body.style.zoom) || 1;
  }

  function getSpotlightBox() {
    if (!currentTarget) return null;

    const rect = currentTarget.getBoundingClientRect();
    const isSmallControl = currentTarget.classList?.contains("info-dot") || currentTarget.id === "a11y-open";
    const pad = isSmallControl ? 10 : 8;
    const top = Math.max(8, rect.top - pad);
    const left = Math.max(8, rect.left - pad);
    const right = Math.min(window.innerWidth - 8, rect.right + pad);
    const bottom = Math.min(window.innerHeight - 8, rect.bottom + pad);

    return {
      top,
      left,
      width: Math.max(24, right - left),
      height: Math.max(24, bottom - top),
      borderRadius: isSmallControl ? "999px" : "22px"
    };
  }

  function applySpotlightBox(box) {
    if (!box || !spotlight) return;

    spotlight.style.top = `${box.top}px`;
    spotlight.style.left = `${box.left}px`;
    spotlight.style.width = `${box.width}px`;
    spotlight.style.height = `${box.height}px`;
    spotlight.style.borderRadius = box.borderRadius;
  }

  function animateSpotlightBox(fromBox, toBox) {
    if (!spotlight || !toBox) return;

    spotlightAnimation?.cancel?.();
    spotlightAnimation = null;

    if (spotlightFrame) {
      cancelAnimationFrame(spotlightFrame);
      spotlightFrame = null;
    }

    if (!fromBox) {
      applySpotlightBox(toBox);
      lastSpotlightBox = toBox;
      return;
    }

    const distance = Math.hypot(toBox.left - fromBox.left, toBox.top - fromBox.top);
    const sizeChange = Math.abs(toBox.width - fromBox.width) + Math.abs(toBox.height - fromBox.height);

    if (distance < 3 && sizeChange < 3 && fromBox.borderRadius === toBox.borderRadius) {
      applySpotlightBox(toBox);
      lastSpotlightBox = toBox;
      return;
    }

    const duration = 340;
    const start = performance.now();
    const fromRadius = fromBox.borderRadius === "999px" ? 999 : parseFloat(fromBox.borderRadius) || 22;
    const toRadius = toBox.borderRadius === "999px" ? 999 : parseFloat(toBox.borderRadius) || 22;

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function mix(a, b, t) {
      return a + (b - a) * t;
    }

    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = easeOutCubic(t);
      const radius = mix(fromRadius, toRadius, eased);

      applySpotlightBox({
        top: mix(fromBox.top, toBox.top, eased),
        left: mix(fromBox.left, toBox.left, eased),
        width: mix(fromBox.width, toBox.width, eased),
        height: mix(fromBox.height, toBox.height, eased),
        borderRadius: radius > 900 ? "999px" : `${radius}px`
      });

      if (t < 1) {
        spotlightFrame = requestAnimationFrame(tick);
      } else {
        applySpotlightBox(toBox);
        lastSpotlightBox = toBox;
        spotlightFrame = null;
      }
    }

    applySpotlightBox(fromBox);
    spotlightFrame = requestAnimationFrame(tick);
    lastSpotlightBox = toBox;
  }

  function positionSpotlight(animate = true, fromOverride = null) {
    if (!currentTarget || !spotlight?.classList.contains("show")) return;

    const nextBox = getSpotlightBox();
    if (!nextBox) return;

    const fromBox = fromOverride || getCurrentSpotlightBox() || lastSpotlightBox;

    if (animate && fromBox) {
      animateSpotlightBox(fromBox, nextBox);
    } else {
      spotlightAnimation?.cancel?.();
      spotlightAnimation = null;
      if (spotlightFrame) {
        cancelAnimationFrame(spotlightFrame);
        spotlightFrame = null;
      }
      applySpotlightBox(nextBox);
      lastSpotlightBox = nextBox;
    }
  }

  function positionPopover() {
    if (!currentTarget || !popover?.classList.contains("show")) return;

    const rect = currentTarget.getBoundingClientRect();
    const gap = 18;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const isInfoDot = currentTarget.classList?.contains("info-dot");
    const isA11y = currentTarget.id === "a11y-open";
    const isHomeNavCard = Boolean(currentTarget.closest?.("#home .home-card-stack .premium-link-card"));
    const isMobileHomeNavCard = isHomeNavCard && viewportW <= 640;

    syncPopoverMode(currentTarget);
    const popRect = popover.getBoundingClientRect();

    let top = rect.bottom + gap;
    let left = rect.left + (rect.width / 2) - (popRect.width / 2);

    if (isHomeNavCard) {
      if (viewportW <= 640) {
        // Phone view: keep the guide above the highlighted Home card and use
        // the compact guide style so the card title and action button stay
        // visible instead of being covered.
        top = rect.top - popRect.height - 10;
        left = (viewportW - popRect.width) / 2;

        if (top < 10) {
          top = 10;
        }
      } else {
        top = rect.top + (rect.height / 2) - (popRect.height / 2);
        left = rect.left - popRect.width - gap;

        if (left < gap) {
          left = rect.right + gap;
        }
      }
    }

    if (isInfoDot) {
      top = rect.top + (rect.height / 2) - (popRect.height / 2);
      left = rect.left - popRect.width - gap;

      if (left < gap) {
        left = rect.right + gap;
      }
    }

    if (isA11y) {
      top = rect.top - popRect.height - gap;
      left = rect.left - popRect.width - gap;

      if (left < gap) {
        left = rect.right - popRect.width;
      }
    }

    if (isMobileHomeNavCard) {
      top = Math.max(10, Math.min(top, viewportH - popRect.height - 10));
    } else {
      if (top + popRect.height > viewportH - gap) {
        top = rect.top - popRect.height - gap;
      }

      if (top < gap) {
        top = Math.min(viewportH - popRect.height - gap, Math.max(gap, rect.bottom + gap));
      }
    }

    left = Math.max(gap, Math.min(left, viewportW - popRect.width - gap));

    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
  }

  function moveStep(direction) {
    if (direction > 0 && activeIndex === activeSteps.length - 1) {
      closeGuide();
      return;
    }

    activeIndex = Math.max(0, Math.min(activeIndex + direction, activeSteps.length - 1));
    showStep();
  }

  function closeGuide() {
    clearTarget();
    spotlightAnimation?.cancel?.();
    spotlightAnimation = null;
    if (spotlightFrame) {
      cancelAnimationFrame(spotlightFrame);
      spotlightFrame = null;
    }
    lastSpotlightBox = null;
    document.body.classList.remove("onboarding-active");
    overlay?.classList.remove("show");
    spotlight?.classList.remove("show");
    popover?.classList.remove("show");
    popover?.classList.remove("home-card-mobile-popover");
  }

  document.addEventListener("click", event => {
    const button = event.target.closest(".onboarding-start-btn");
    if (!button) return;

    event.preventDefault();
    startGuide(getCurrentGuideKey(button));
  });

  document.addEventListener("keydown", event => {
    if (!document.body.classList.contains("onboarding-active")) return;
    if (event.key === "Escape") closeGuide();
    if (event.key === "ArrowRight") moveStep(1);
    if (event.key === "ArrowLeft") moveStep(-1);
  });

  const contentContainer = document.getElementById("content-container");
  if (contentContainer) {
    new MutationObserver(() => {
      if (document.body.classList.contains("onboarding-active")) closeGuide();
    }).observe(contentContainer, { childList: true });
  }

  window.addEventListener("resize", () => {
    positionSpotlight(false);
    positionPopover();
  });

  // Reposition spotlight/popover when the accessibility zoom level changes.
  // body{zoom} causes getBoundingClientRect() to return scaled values so the
  // positions are correct, but a repaint is needed to re-query the new rects.
  window.addEventListener("a11y-zoom-change", () => {
    // Two rAFs let the browser reflow from the new zoom before we re-read rects.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        positionSpotlight(false);
        positionPopover();
      });
    });
  });
  window.addEventListener("scroll", () => {
    if (suppressSpotlightScrollUpdate) return;
    positionSpotlight(false);
    positionPopover();
  }, { passive: true });
})();
