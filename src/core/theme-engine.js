/**
 * THEME ENGINE: Hybrid System (Device + Manual)
 */
const ThemeEngine = {
  init() {
    // 1. Check LocalStorage first, then fall back to System Preference
    const savedTheme = localStorage.theme;
    const systemDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    if (savedTheme === "dark" || (!savedTheme && systemDark)) {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
    }
  },

  toggle() {
    if (document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.theme = "light";
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.theme = "dark";
    }
    this.updateIcon(localStorage.theme);
    window.dispatchEvent(new Event("theme-changed"));
  },

  renderToggle() {
    const header = document.querySelector("header .relative");
    if (!header) return;

    const btn = document.createElement("button");
    btn.className =
      "absolute right-0 top-3.5 mr-[-40px] text-app-sub hover:text-app-accent transition-colors";
    btn.onclick = () => this.toggle();
    btn.id = "theme-toggle-btn";

    const current = localStorage.getItem("theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? 'dark' : 'light');
    btn.innerHTML =
      current === "dark"
        ? '<i class="fas fa-sun"></i>'
        : '<i class="fas fa-moon"></i>';

    header.parentElement.appendChild(btn);
  },

  updateIcon(theme) {
    const btn = document.getElementById("theme-toggle-btn");
    if (btn)
      btn.innerHTML =
        theme === "dark"
          ? '<i class="fas fa-sun"></i>'
          : '<i class="fas fa-moon"></i>';
  },
};

// Immediate Execution to prevent flash
ThemeEngine.init();
// Render the toggle button after the DOM is loaded
document.addEventListener('DOMContentLoaded', () => ThemeEngine.renderToggle());
export default ThemeEngine;
