document.addEventListener("DOMContentLoaded", () => {
  const contentContainer = document.getElementById("content-container");
  const navLinks = document.querySelectorAll(".nav-menu a");

  // Register a renderer function for each page fragment.
  const pageRenderers = {
    "dashboard1.html": renderDashboard1Page,
    "dashboard2.html": renderDashboard2Page
  };

  function getPageFromQuery() {
    const params = new URLSearchParams(location.search);
    return params.get("page") || "home.html";
  }

  function setActiveLink(url) {
    navLinks.forEach(link => {
      link.classList.toggle("active", link.getAttribute("href") === url);
    });
  }

function loadPageContent(url, pushToHistory = true) {
    const cacheBusterUrl = `${url}?t=${Date.now()}`;

    fetch(cacheBusterUrl, { cache: "no-store" })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status} loading ${url}`);
        return response.text();
      })
      .then(html => {
        const temp = document.createElement("div");
        temp.innerHTML = html;

        const section = temp.querySelector("section.page");
        if (!section) {
          contentContainer.innerHTML = `<p>Error: No section.page found in ${url}</p>`;
          return;
        }

        // 1. CLEAR and then APPEND the live node directly to the DOM
        contentContainer.innerHTML = '';
        contentContainer.appendChild(section);

        // 2. NOW that it is in the DOM, wait for the paint and initialize
        requestAnimationFrame(() => {
          const renderer = pageRenderers[url];
          if (typeof renderer === "function") renderer();

          attachNavigationHandlers(contentContainer);

          if (pushToHistory) {
            history.pushState({ url }, document.title, `?page=${url}`);
          }

          setActiveLink(url);
          window.scrollTo(0, 0);

          // Handle Back to Home link visibility (now integrated top-right in the header)
          const navHomeLink = document.querySelector(".nav-home-link");
          if (navHomeLink) {
            navHomeLink.style.display = (url === "home.html" || url === "") ? "none" : "inline-flex";
          }
        });
      })
      .catch(error => {
        console.error("Error loading page:", error);
        contentContainer.innerHTML = `<p>Error loading page: ${error.message}</p>`;
      });
  }

  function attachNavigationHandlers(container = document) {
    const links = container.querySelectorAll(
      ".nav-menu a, .site-brand, .dashboard-link, .nav-home-link"
    );

    links.forEach(link => {
      link.addEventListener("click", event => {
        event.preventDefault();

        const url = link.getAttribute("href");
        if (!url) return;

        const activeNav = document.querySelector(".nav-menu a.active");
        if (activeNav && activeNav.getAttribute("href") === url) return;

        loadPageContent(url);
      });
    });
  }

  window.addEventListener("popstate", event => {
    const url = event.state?.url ?? getPageFromQuery();
    loadPageContent(url, false);
  });

  attachNavigationHandlers();

  const initialUrl = getPageFromQuery();
  loadPageContent(initialUrl, false);
  history.replaceState({ url: initialUrl }, document.title, `?page=${initialUrl}`);
});