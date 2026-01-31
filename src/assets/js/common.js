// 1. CONFIGURE TAILWIND (Maps CSS Variables to Utility Classes)
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Map custom names to our CSS variables with Opacity Support
        app: {
          bg: "rgb(var(--bg-main) / <alpha-value>)",
          card: "rgb(var(--bg-card) / <alpha-value>)",
          input: "rgb(var(--bg-input) / <alpha-value>)",
          border: "rgb(var(--border-main) / <alpha-value>)",
          borderSub: "rgb(var(--border-sub) / <alpha-value>)",
          text: "rgb(var(--text-main) / <alpha-value>)",
          sub: "rgb(var(--text-sub) / <alpha-value>)",
          muted: "rgb(var(--text-muted) / <alpha-value>)",
          accent: "rgb(var(--accent-blue) / <alpha-value>)",
        },
      },
    },
  },
};

// 2. THEME MANAGER - REMOVED
// This logic is now handled by src/core/theme-engine.js to prevent conflicts.

