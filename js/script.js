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
    // CACHE BUSTER: Forces the browser to bypass memory and grab the newest HTML
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

        contentContainer.replaceChildren(section.cloneNode(true));

        // Run the D3 renderer only after the fragment is live in the DOM.
        const renderer = pageRenderers[url];
        if (typeof renderer === "function") renderer();

        attachNavigationHandlers(contentContainer);

        if (pushToHistory) {
          history.pushState({ url }, document.title, `?page=${url}`);
        }

        setActiveLink(url);
        window.scrollTo(0, 0);
      })
      .catch(error => {
        console.error("Error loading page:", error);
        contentContainer.innerHTML = `<p>Error loading page: ${error.message}</p>`;
      });
  }

  function attachNavigationHandlers(container = document) {
    const links = container.querySelectorAll(
      ".nav-menu a, .site-brand, .dashboard-link, .floating-home"
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

  document.querySelector(".floating-top")?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  attachNavigationHandlers();

  const initialUrl = getPageFromQuery();
  loadPageContent(initialUrl, false);
  history.replaceState({ url: initialUrl }, document.title, `?page=${initialUrl}`);
});