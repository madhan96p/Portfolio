// --- main.js ---
// Manages the Dashboard page (main.html)

document.addEventListener('DOMContentLoaded', () => {
    // --- Dashboard Page Elements ---
    
    // Goal Cards
    const familyCard = document.getElementById('family-card');
    const familyPending = document.getElementById('family-pending');
    const familyProgress = document.getElementById('family-progress');
    const familySummary = document.getElementById('family-summary');
    
    const sharesCard = document.getElementById('shares-card');
    const sharesPending = document.getElementById('shares-pending');
    const sharesProgress = document.getElementById('shares-progress');
    const sharesSummary = document.getElementById('shares-summary');
    
    const savingsCard = document.getElementById('savings-card');
    const savingsPending = document.getElementById('savings-pending');
    const savingsProgress = document.getElementById('savings-progress');
    const savingsSummary = document.getElementById('savings-summary');

    // Income Card
    const incomeSalaryEl = document.getElementById('income-salary');
    const incomeOtherEl = document.getElementById('income-other');
    
    // Wallet Card
    const balanceEl = document.getElementById('balance');
    const totalAvailableEl = document.getElementById('total-available');
    const totalSpentEl = document.getElementById('total-spent');

    // --- NEW: Wallet Breakdown Elements ---
    const breakdownPersonalEl = document.getElementById('breakdown-personal');
    const breakdownHouseholdEl = document.getElementById('breakdown-household');

    /**
     * Helper to update a single progress bar card.
     */
    const updateProgressBar = (card, progressEl, summaryEl, pendingEl, actual, goal, labels) => {
        if (!card) return; // Guard clause
        actual = Math.max(0, actual);
        goal = Math.max(0, goal);
        let pending = goal - actual;
        let percent = (goal > 0) ? (actual / goal) * 100 : 0;
        
        if (percent >= 100) {
            percent = 100;
            pending = 0;
            card.classList.add('completed');
        } else {
            card.classList.remove('completed');
        }

        progressEl.style.width = `${percent}%`;
        // --- FIX: Fixed typo 'formatCurency' to 'formatCurrency' ---
        summaryEl.textContent = `${labels.sent}: ${formatCurrency(actual)} / ${labels.goal}: ${formatCurrency(goal)}`;
        pendingEl.textContent = `${labels.pending}: ${formatCurrency(pending)}`;
    };

    /**
     * --- REWRITTEN: Updates the entire dashboard UI from API data. ---
     */
    const updateUI = (data) => {
        // Data now comes from our new "calculator" api.js
        const { goals, actuals, wallet } = data; 
        
        // 1. Update Goal Progress Bars
        updateProgressBar(familyCard, familyProgress, familySummary, familyPending, 
            actuals.family, goals.goalFamily, { sent: 'Sent', goal: 'Goal', pending: 'Pending' });
        
        updateProgressBar(sharesCard, sharesProgress, sharesSummary, sharesPending, 
            actuals.shares, goals.goalShares, { sent: 'Invested', goal: 'Goal', pending: 'Pending' });
        
        updateProgressBar(savingsCard, savingsProgress, savingsSummary, savingsPending, 
            actuals.savings, goals.goalSavings, { sent: 'Saved', goal: 'Goal', pending: 'Pending' });
        
        // 2. Update Income Card (now reads from 'actuals')
        if (incomeSalaryEl) {
            incomeSalaryEl.textContent = formatCurrency(actuals.salary);
            incomeOtherEl.textContent = formatCurrency(actuals.otherIncome);
        }

        // 3. Update Wallet Card (receives pre-calculated values)
        if (balanceEl) {
            balanceEl.textContent = formatCurrency(wallet.balance);
            totalAvailableEl.textContent = formatCurrency(wallet.totalAvailable);
            totalSpentEl.textContent = formatCurrency(wallet.totalSpent);
        }

        // 4. --- NEW: Update Wallet Breakdown Card ---
        if (breakdownPersonalEl) {
            breakdownPersonalEl.textContent = formatCurrency(actuals.personal);
            breakdownHouseholdEl.textContent = formatCurrency(actuals.household);
        }
    };
    
    /**
     * Main function to load dashboard data.
     */
    const loadDashboardData = async () => {
        // The global `callApi` function is from common.js
        // It now gets data from our new "calculator" API
        const result = await callApi('getTrackerData');
        if (result && result.data) {
            updateUI(result.data); 
        }
    };

    // Initial load
    if (balanceEl) { // Only run if we are on main.html
        loadDashboardData();
    }
});