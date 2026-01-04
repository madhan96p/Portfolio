/**
 * THEME ENGINE: Hybrid System (Device + Manual)
 */
const ThemeEngine = {
    init() {
        // 1. Check LocalStorage first, then fall back to System Preference
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    },

    toggle() {
        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.theme = 'light';
        } else {
            document.documentElement.classList.add('dark');
            localStorage.theme = 'dark';
        }
    }
};

// Immediate Execution to prevent flash
ThemeEngine.init();
export default ThemeEngine;