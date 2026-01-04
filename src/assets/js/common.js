// 1. CONFIGURE TAILWIND (Maps CSS Variables to Utility Classes)
tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Map custom names to our CSS variables with Opacity Support
                app: {
                    bg: 'rgb(var(--bg-main) / <alpha-value>)',
                    card: 'rgb(var(--bg-card) / <alpha-value>)',
                    input: 'rgb(var(--bg-input) / <alpha-value>)',
                    border: 'rgb(var(--border-main) / <alpha-value>)',
                    borderSub: 'rgb(var(--border-sub) / <alpha-value>)',
                    text: 'rgb(var(--text-main) / <alpha-value>)',
                    sub: 'rgb(var(--text-sub) / <alpha-value>)',
                    muted: 'rgb(var(--text-muted) / <alpha-value>)',
                    accent: 'rgb(var(--accent-blue) / <alpha-value>)',
                }
            }
        }
    }
};

// 2. THEME MANAGER
const ThemeManager = {
    init() {
        const savedTheme = localStorage.getItem('theme') || 'dark';

        // Set Attribute
        document.documentElement.setAttribute('data-theme', savedTheme);

        // Set Class
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        this.renderToggle();
    },

    toggle() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';

        // Update Attribute for CSS Variables
        document.documentElement.setAttribute('data-theme', next);

        // Update Class for Tailwind Dark Mode
        if (next === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        localStorage.setItem('theme', next);
        this.updateIcon(next);

        // Dispatch a global event so other components (like charts) can react
        window.dispatchEvent(new Event('theme-changed'));
    },

    // 3. AUTO-INJECT TOGGLE BUTTON
    // Finds an element with class `.relative` inside the header to use as an anchor.
    renderToggle() {
        const header = document.querySelector('header .relative'); // Finds an anchor container
        if (!header) return;

        // Create Button
        const btn = document.createElement('button');
        btn.className = "absolute right-0 top-3.5 mr-[-40px] text-app-sub hover:text-app-accent transition-colors";
        btn.onclick = () => this.toggle();
        btn.id = "theme-toggle-btn";
        
        // Initial Icon
        const current = localStorage.getItem('theme') || 'dark';
        btn.innerHTML = current === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';

        header.parentElement.appendChild(btn); // Add to header
    },

    updateIcon(theme) {
        const btn = document.getElementById('theme-toggle-btn');
        if (btn) btn.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }
};

// Run immediately
ThemeManager.init();
