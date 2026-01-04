/**
 * THEME ENGINE: Hybrid System (Device + Manual)
 */
const ThemeEngine = {
    init() {
        // 1. Check LocalStorage first, then fall back to System Preference
        const savedTheme = localStorage.theme;
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
            document.documentElement.classList.add('dark');
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.setAttribute('data-theme', 'light');
        }
    },

    toggle() {
        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.theme = 'light';
        } else {
            document.documentElement.classList.add('dark');
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.theme = 'dark';
        }
    }
};

// Immediate Execution to prevent flash
ThemeEngine.init();
export default ThemeEngine;