// 1. CONFIGURE TAILWIND (Maps CSS Variables to Utility Classes)
tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Map custom names to our CSS variables
                app: {
                    bg: 'var(--bg-main)',
                    card: 'var(--bg-card)',
                    input: 'var(--bg-input)',
                    border: 'var(--border-main)',
                    borderSub: 'var(--border-sub)',
                    text: 'var(--text-main)',
                    sub: 'var(--text-sub)',
                    muted: 'var(--text-muted)',
                    accent: 'var(--accent-blue)',
                }
            }
        }
    }
};

// 2. THEME MANAGER
const ThemeManager = {
    init() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.renderToggle();
    },

    toggle() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
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