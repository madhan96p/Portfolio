// --- main.js ---
// Manages the Dashboard page (main.html)

document.addEventListener('DOMContentLoaded', () => {
    // --- Dashboard Page Elements ---
    
    // NEW: Summary Card
    const openingBalanceEl = document.getElementById('opening-balance');
    const salaryReceivedEl = document.getElementById('salary-received');
    const otherIncomeEl = document.getElementById('other-income-received');
    
    // Goal Cards
    const familyCard = document.getElementById('family-card');
    const familyPending = document.getElementById('family-pending');
    const familyProgress = document.getElementById('family-progress');
    const familySummary = document.getElementById('family-summary');
    
    const sharesCard = document.getElementById('shares-card');
    const sharesPending = document.getElementById('shares-pending');
    // ... (rest of goal card elements) ...
    const savingsSummary = document.getElementById('savings-summary');
    
    // Wallet Card
    const balanceEl = document.getElementById('balance');
    const totalAvailableEl = document.getElementById('total-available');
    const totalSpentEl = document.getElementById('total-spent');

    // Wallet Breakdown
    const breakdownPersonalEl = document.getElementById('breakdown-personal');
    const breakdownHouseholdEl = document.getElementById('breakdown-household');
    
    // NEW: Approx Balance Elements
    const approxBalanceToggle = document.getElementById('approx-balance-toggle');
    const approxBalanceValue = document.getElementById('approx-balance-value');
    const approxBalanceIcon = document.getElementById('approx-balance-icon');

    /**
     * Helper to update a single progress bar card.
     * (This function is unchanged)
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
        summaryEl.textContent = `${labels.sent}: ${formatCurrency(actual)} / ${labels.goal}: ${formatCurrency(goal)}`;
        pendingEl.textContent = `${labels.pending}: ${formatCurrency(pending)}`;
    };

    /**
     * --- REWRITTEN: Updates the entire new dashboard UI ---
     */
    const updateUI = (data) => {
        const { goals, actuals, wallet } = data; 
        
        // 1. Update NEW "Monthly Story" Card
        if (openingBalanceEl) {
            openingBalanceEl.textContent = formatCurrency(actuals.openingBalance);
            salaryReceivedEl.textContent = formatCurrency(actuals.salary);
            otherIncomeEl.textContent = formatCurrency(actuals.otherIncome);
        }

        // 2. Update Goal Progress Bars (Unchanged)
        updateProgressBar(familyCard, familyProgress, familySummary, familyPending, 
            actuals.family, goals.goalFamily, { sent: 'Sent', goal: 'Goal', pending: 'Pending' });
        
        updateProgressBar(sharesCard, sharesProgress, sharesSummary, sharesPending, 
            actuals.shares, goals.goalShares, { sent: 'Invested', goal: 'Goal', pending: 'Pending' });
        
        updateProgressBar(savingsCard, savingsProgress, savingsSummary, savingsPending, 
            actuals.savings, goals.goalSavings, { sent: 'Saved', goal: 'Goal', pending: 'Pending' });
        
        // 3. Update Wallet Card
        if (balanceEl) {
            balanceEl.textContent = formatCurrency(wallet.balance);
            totalAvailableEl.textContent = formatCurrency(wallet.totalAvailable);
            totalSpentEl.textContent = formatCurrency(wallet.totalSpent);
            // NEW: Set the approx balance
            approxBalanceValue.textContent = formatCurrency(wallet.approxBankBalance);
        }

        // 4. Update Wallet Breakdown (Unchanged)
        if (breakdownPersonalEl) {
            breakdownPersonalEl.textContent = formatCurrency(actuals.personal);
            breakdownHouseholdEl.textContent = formatCurrency(actuals.household);
        }
    };
    
    /**
     * Main function to load dashboard data.
     * (This function is unchanged)
     */
    const loadDashboardData = async () => {
        const result = await callApi('getTrackerData');
        if (result && result.data) {
            updateUI(result.data); 
        }
    };

    // --- NEW: Event Listener for Bank Balance Toggle ---
    if (approxBalanceToggle) {
        approxBalanceToggle.addEventListener('click', () => {
            const isHidden = approxBalanceValue.classList.toggle('hidden');
            if (isHidden) {
                approxBalanceIcon.classList.remove('fa-eye');
                approxBalanceIcon.classList.add('fa-eye-slash');
            } else {
                approxBalanceIcon.classList.remove('fa-eye-slash');
                approxBalanceIcon.classList.add('fa-eye');
            }
        });
    }

    // Initial load
    if (balanceEl) { // Only run if we are on main.html
        loadDashboardData();
    }
});