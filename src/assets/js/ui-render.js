/**
 * Component Loader: Injects modular HTML fragments (Header, Nav)
 */
async function loadComponents() {
    const components = [
        { id: 'header-component', url: '../components/header.html' },
        { id: 'mobile-nav-component', url: '../components/mobile-nav.html' },
        { id: 'sidebar-component', url: '../components/sidebar.html' } // Optional desktop sidebar
    ];

    for (const comp of components) {
        const el = document.getElementById(comp.id);
        if (el) {
            try {
                const response = await fetch(comp.url);
                el.innerHTML = await response.text();
            } catch (err) {
                console.error(`Failed to load component: ${comp.id}`, err);
            }
        }
    }
}

/**
 * Engine Sync: Fetches 60/40 logic and P2P Debt data from Netlify
 */
async function refreshEngine() {
    try {
        const response = await fetch('/.netlify/functions/engine');
        const data = await response.json();

        // Update UI displays for Liability vs Equity
        document.getElementById('family-debt-display').innerText = `₹${data.familyGoal.toFixed(2)}`;
        document.getElementById('wallet-display').innerText = `₹${(data.salary * 0.4).toFixed(2)}`;
        
        // Handle the Backwards-Moving Progress Bar
        const fill = document.getElementById('progress-bar-fill');
        const percentText = document.getElementById('progress-percent');
        
        const currentProgress = Math.max(0, Math.min(data.progress, 100)); // Clamp between 0-100
        fill.style.width = `${currentProgress}%`;
        percentText.innerText = `${currentProgress.toFixed(1)}%`;

        // Logic Visual Feedback: Red for high debt/low progress
        fill.style.backgroundColor = currentProgress < 30 ? '#ef4444' : '#10b981';

        // Update Cycle Date in Header (if loaded)
        const cycleEl = document.getElementById('current-cycle-date');
        if (cycleEl) cycleEl.innerText = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    } catch (error) {
        console.error("Engine Sync Failed:", error);
    }
}

// Single Entry Point for the Browser
window.addEventListener('DOMContentLoaded', async () => {
    await loadComponents();
    await refreshEngine();
});