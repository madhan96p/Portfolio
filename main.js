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
    const sharesProgress = document.getElementById('shares-progress');
    const sharesSummary = document.getElementById('shares-summary');

    const savingsCard = document.getElementById('savings-card');
    const savingsPending = document.getElementById('savings-pending');
    const savingsProgress = document.getElementById('savings-progress');
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

    // --- NEW BREAKDOWN MODAL ELEMENTS ---
    const fab = document.getElementById('breakdown-fab');
    const breakdownModal = document.getElementById('breakdown-modal');
    const closeBreakdownModalBtn = document.getElementById('close-breakdown-modal');

    // Breakdown Display Elements
    const bdStartDate = document.getElementById('bd-start-date');
    const bdOb = document.getElementById('bd-ob');
    const bdSalaryBase = document.getElementById('bd-salary-base');
    const bdTotalMoney = document.getElementById('bd-total-money');
    const bdFamilyGoal = document.getElementById('bd-family-goal');
    const bdPoolTotal = document.getElementById('bd-pool-total');
    const bdSharesGoal = document.getElementById('bd-shares-goal');
    const bdSavingsGoal = document.getElementById('bd-savings-goal');
    const bdWalletGoal = document.getElementById('bd-wallet-goal');


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
        summaryEl.textContent = `${labels.sent}: ${formatCurrency(actual)} / ${labels.goal}: ${formatCurrency(goal)}`;
        pendingEl.textContent = `${labels.pending}: ${formatCurrency(pending)}`;
    };

    /**
     * --- NEW: Populates the Cycle Breakdown Modal ---
     */
    const populateBreakdownModal = (config, goals, poolData) => {
        const salaryBase = poolData.salaryBaseUsed;
        const pool = poolData.poolValue;
        const obValue = parseFloat(config.Current_Opening_Balance || 0);
        const totalMoney = salaryBase + obValue; // This is the correct Total Money In

        // Header Info
        bdStartDate.textContent = config.Cycle_Start_Date || 'N/A';

        // --- FIX: Now reads the correct OB value ---
        bdOb.textContent = formatCurrency(obValue);

        // --- FIX: Total Money is the sum of Salary + OB ---
        bdTotalMoney.textContent = formatCurrency(totalMoney);

        // Allocation Details
        bdFamilyGoal.textContent = formatCurrency(goals.goalFamily); // 60%
        bdPoolTotal.textContent = formatCurrency(pool); // 40% + OB (Correct)
        bdSharesGoal.textContent = formatCurrency(goals.goalShares); // 25%
        bdSavingsGoal.textContent = formatCurrency(goals.goalSavings); // 25%
        bdWalletGoal.textContent = formatCurrency(goals.goalExpenses); // 50%
    };


    /**
     * --- REWRITTEN: Updates the entire new dashboard UI ---
     */
    const updateUI = (data) => {
        const { config, goals, actuals, wallet } = data;

        // 1. Update NEW "Monthly Story" Card (Including Opening Balance)
        if (openingBalanceEl) {
            openingBalanceEl.textContent = formatCurrency(actuals.openingBalance);
            salaryReceivedEl.textContent = formatCurrency(actuals.salary);
            otherIncomeEl.textContent = formatCurrency(actuals.otherIncome);
        }

        // 2. Update Goal Progress Bars
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

        // 4. Update Wallet Breakdown
        if (breakdownPersonalEl) {
            breakdownPersonalEl.textContent = formatCurrency(actuals.personal);
            breakdownHouseholdEl.textContent = formatCurrency(actuals.household);
        }

        // 5. Populate the modal data when UI loads
        if (config) {
            populateBreakdownModal(config, goals, wallet.cycleBreakdown);
        }
    };

    /**
     * Main function to load dashboard data.
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

    // --- NEW: FAB and Modal Listeners ---
    if (fab) {
        fab.addEventListener('click', () => breakdownModal.classList.add('visible'));
    }
    if (closeBreakdownModalBtn) {
        closeBreakdownModalBtn.addEventListener('click', () => breakdownModal.classList.remove('visible'));
    }


    // Initial load
    if (balanceEl) { // Only run if we are on main.html
        loadDashboardData();
    }
});