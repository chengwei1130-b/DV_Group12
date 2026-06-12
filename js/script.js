document.addEventListener("DOMContentLoaded", () => {
  const contentContainer = document.getElementById("content-container");
  const navLinks = document.querySelectorAll(".nav-links a");

  const pageRenderers = {
    "fine_trend.html": renderFineTrendPage
  };

  function setActiveLink(url) {
    navLinks.forEach(link => {
      link.classList.toggle("active", link.getAttribute("href") === url);
    });
  }

  function getPageFromQuery() {
    const params = new URLSearchParams(location.search);
    return params.get("page") || "home.html";
  }

  function loadPageContent(url, pushToHistory = true) {
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.text();
      })
      .then(html => {
        const temp = document.createElement("div");
        temp.innerHTML = html;

        const section = temp.querySelector("section.page");
        if (!section) {
          contentContainer.innerHTML = `<p>Error: No section.page found in ${url}</p>`;
          return;
        }

        contentContainer.innerHTML = "";
        contentContainer.appendChild(section.cloneNode(true));

        const renderer = pageRenderers[url];
        if (typeof renderer === "function") {
          renderer();
        }

        attachNavigationHandlers(contentContainer);

        if (pushToHistory) {
          history.pushState({ url }, document.title, `?page=${url}`);
        }

        setActiveLink(url);
        window.scrollTo(0, 0);
      })
      .catch(err => {
        console.error("Error loading page:", err);
        contentContainer.innerHTML = `<p>Error loading page: ${err.message}</p>`;
      });
  }

  window.addEventListener("popstate", e => {
    const url = e.state?.url ?? getPageFromQuery() ?? "home.html";
    loadPageContent(url, false);
  });

  function attachNavigationHandlers(container = document) {
    const links = container.querySelectorAll(".nav-links a, .dashboard-link, .home-return-link");
    links.forEach(link => {
      link.addEventListener("click", e => {
        e.preventDefault();
        const url = link.getAttribute("href");
        if (!url) return;

        const activeNav = document.querySelector(".nav-links a.active");
        if (activeNav && activeNav.getAttribute("href") === url) return;

        loadPageContent(url);
      });
    });
  }

  attachNavigationHandlers();

  const initialUrl = getPageFromQuery();
  loadPageContent(initialUrl, false);
  history.replaceState({ url: initialUrl }, document.title, `?page=${initialUrl}`);
});
