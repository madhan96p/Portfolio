import { API } from '../../core/api-client.js';

async function initDashboard() {
    try {
        const data = await API.getDashboard();
        renderDashboard(data);
    } catch (err) {
        console.error("Dashboard Crash:", err);
        document.getElementById('wallet-status').innerText = "Sync Error - Check Console";
    }
}

/**
 * RENDER DASHBOARD v2.1
 * Includes Safe-to-Spend (Burn Rate) Calibration
 */
function renderDashboard(data) {
    // --- 1. CONFIGURATION & TIME MATH ---
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    
    // Calculate the Pro-Rated Goal (Where you SHOULD be today)
    const proRatedWalletGoal = (data.pool.wallet.goal / daysInMonth) * dayOfMonth;
    const isOverDailyLimit = data.pool.wallet.spent > proRatedWalletGoal;

    // --- 2. INTEGRITY STATUS (Top Right) ---
    const statusEl = document.getElementById('integrity-status');
    const overlay = document.getElementById('pool-bleed-overlay');
    
    if (data.pool.wallet.remaining < 0) {
        statusEl.innerText = "POOL BLEEDING";
        statusEl.className = "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter bg-red-500/20 text-red-400 border border-red-500/50";
        if (overlay) overlay.classList.remove('hidden');
    } else if (isOverDailyLimit) {
        statusEl.innerText = "BURN RATE HIGH";
        statusEl.className = "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter bg-amber-500/20 text-amber-400 border border-amber-500/50";
        if (overlay) overlay.classList.add('hidden');
    } else {
        statusEl.innerText = "SYSTEM STABLE";
        statusEl.className = "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter bg-emerald-500/20 text-emerald-400 border border-emerald-500/50";
        if (overlay) overlay.classList.add('hidden');
    }

    // --- 3. WALLET GAUGE (The Pool) ---
    const walletRemaining = data.pool.wallet.remaining;
    const walletRemainingEl = document.getElementById('wallet-remaining');
    const walletStatusEl = document.getElementById('wallet-status');
    
    walletRemainingEl.innerText = `₹${Math.abs(walletRemaining).toLocaleString()}`;
    
    if (walletRemaining < 0) {
        walletRemainingEl.classList.add('text-red-500');
        walletStatusEl.innerText = "MONTHLY LIMIT EXCEEDED";
        walletStatusEl.classList.replace('text-slate-500', 'text-red-400');
    } else {
        walletRemainingEl.classList.remove('text-red-500');
        // Daily Burn Rate Feedback
        walletStatusEl.innerText = isOverDailyLimit 
            ? `OVER DAILY LIMIT (Target: ₹${Math.floor(proRatedWalletGoal)})` 
            : "WITHIN SAFE SPENDING LIMIT";
        walletStatusEl.classList.toggle('text-amber-400', isOverDailyLimit);
    }

    // Wallet Progress Bar
    const walletProgress = (data.pool.wallet.spent / data.pool.wallet.goal) * 100;
    const walletBar = document.getElementById('wallet-progress-bar');
    
    walletBar.style.width = `${Math.min(walletProgress, 100)}%`;
    walletBar.className = walletProgress > 100 
        ? "bg-red-500 h-full transition-all duration-1000" 
        : (isOverDailyLimit ? "bg-amber-500 h-full transition-all" : "bg-emerald-500 h-full transition-all");

    // --- 4. FAMILY COMMITMENT (The 60% Split) ---
    document.getElementById('family-actual').innerText = `₹${data.family.actual.toLocaleString()}`;
    document.getElementById('family-goal').innerText = `₹${data.family.goal.toLocaleString()}`;
    document.getElementById('portfolio-val').innerText = `₹${data.pool.shares.currentPortfolio.toLocaleString()}`;
    document.getElementById('wealth-ratio').innerText = data.summary.wealthToDebtRatio;

    // Progress Bar (Ensuring it doesn't go negative or over 100 visually)
    const familyProgress = Math.min(Math.max(0, parseFloat(data.family.progress)), 100);
    document.getElementById('family-progress-bar').style.width = `${familyProgress}%`;
}

// Start the Pulse
document.addEventListener('DOMContentLoaded', initDashboard);