document.addEventListener("DOMContentLoaded", () => {
  const contentContainer = document.getElementById("content-container");
  const navLinks = document.querySelectorAll(".nav-menu a");

  // Add new page renderers here when more dashboard/story pages are added.
  const pageRenderers = {
    "fine_trend.html": renderFineTrendPage
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
    fetch(url)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.text();
      })
      .then(html => {
        const temp = document.createElement("div");
        temp.innerHTML = html;

        // Every page file is a fragment. Only the <section class="page"> is injected.
        const section = temp.querySelector("section.page");
        if (!section) {
          contentContainer.innerHTML = `<p>Error: No section.page found in ${url}</p>`;
          return;
        }

        contentContainer.replaceChildren(section.cloneNode(true));

        // Render D3 charts only after the fragment is available in the DOM.
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
    const links = container.querySelectorAll(".nav-menu a, .site-brand, .dashboard-link, .floating-home");

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
