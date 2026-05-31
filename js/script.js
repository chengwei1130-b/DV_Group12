document.addEventListener("DOMContentLoaded", () => {
  const contentContainer = document.getElementById("content-container");
  const navLinks = document.querySelectorAll(".nav-links a");

  function setActiveLink(url) {
    navLinks.forEach(link => {
      link.classList.toggle("active", link.getAttribute("href") === url);
    });
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
          contentContainer.innerHTML = "<p>Error: No <section class=\"page\"> found in " + url + "</p>";
          return;
        }

        // Inject the page section
        contentContainer.innerHTML = "";
        contentContainer.appendChild(section.cloneNode(true));

        // Re-execute any inline or external scripts from the fetched file
        temp.querySelectorAll("script").forEach(oldScript => {
          const script = document.createElement("script");
          [...oldScript.attributes].forEach(attr => script.setAttribute(attr.name, attr.value));
          if (!oldScript.src) script.textContent = oldScript.textContent;
          contentContainer.appendChild(script);
        });

        // Update browser history and URL
        if (pushToHistory) {
          history.pushState({ url }, document.title, url);
        }

        // Sync active nav link
        setActiveLink(url);

        // Scroll to top on navigation
        window.scrollTo(0, 0);
      })
      .catch(err => {
        console.error("Error loading page:", err);
        contentContainer.innerHTML = `<p>Error loading page: ${err.message}</p>`;
      });
  }

  // Handle browser back/forward buttons
  window.addEventListener("popstate", e => {
    const url = e.state?.url ?? "home.html";
    loadPageContent(url, false);
  });

  // Attach click handlers to nav links
  navLinks.forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const url = link.getAttribute("href");
      // Don't reload the already-active page
      if (link.classList.contains("active")) return;
      loadPageContent(url);
    });
  });

  // Load initial page — respect deep-linked URL if present
  const initialUrl = location.pathname !== "/" && location.pathname !== "/index.html"
    ? location.pathname
    : "home.html";

  loadPageContent(initialUrl, false);
  history.replaceState({ url: initialUrl }, document.title, initialUrl);
});