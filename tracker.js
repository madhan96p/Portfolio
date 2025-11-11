document.addEventListener('DOMContentLoaded', () => {
    // --- Get All DOM Elements ---
    const loader = document.getElementById('loader');

    // Action Center
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

    // Expense Wallet
    const balanceEl = document.getElementById('balance');
    const totalAvailableEl = document.getElementById('total-available');
    const totalSpentEl = document.getElementById('total-spent');

    // Transaction Form
    const logForm = document.getElementById('log-form');
    const amountInput = document.getElementById('amount');
    const categoryInput = document.getElementById('category');
    const notesInput = document.getElementById('notes');
    const logBtn = document.getElementById('log-btn');
    
    // Admin
    const endMonthBtn = document.getElementById('end-month-btn');

    // --- Helper Functions ---
    const showLoader = (show) => {
        loader.classList.toggle('visible', show);
    };

    const formatCurrency = (num) => `₹${Number(num).toFixed(2)}`;

    /**
     * Updates a progress bar element.
     */
    const updateProgressBar = (card, progressEl, summaryEl, pendingEl, actual, goal, labels) => {
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
     * Updates the entire UI based on data from the API.
     */
    const updateUI = (data) => {
        const { goals, actuals } = data;
        
        // 1. Update Action Center
        updateProgressBar(familyCard, familyProgress, familySummary, familyPending, 
            actuals.family, goals.goalFamily, 
            { sent: 'Sent', goal: 'Goal', pending: 'Pending' }
        );
        updateProgressBar(sharesCard, sharesProgress, sharesSummary, sharesPending, 
            actuals.shares, goals.goalShares, 
            { sent: 'Invested', goal: 'Goal', pending: 'Pending' }
        );
        updateProgressBar(savingsCard, savingsProgress, savingsSummary, savingsPending, 
            actuals.savings, goals.goalSavings, 
            { sent: 'Saved', goal: 'Goal', pending: 'Pending' }
        );
        
        // 2. Update Expense Wallet
        const balance = goals.goalExpenses - actuals.expenses;
        balanceEl.textContent = formatCurrency(balance);
        totalAvailableEl.textContent = formatCurrency(goals.goalExpenses);
        totalSpentEl.textContent = formatCurrency(actuals.expenses);
    };

    /**
     * Main API call function
     */
    const callApi = async (action, data = {}) => {
        showLoader(true);
        try {
            const response = await fetch('/.netlify/functions/api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, data }),
            });

            if (!response.ok) throw new Error('Network response was not ok');
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'API request failed');
            
            return result;

        } catch (error) {
            console.error('API Error:', error);
            alert(`Error: ${error.message}`);
        } finally {
            showLoader(false);
        }
    };

    // --- Event Handlers ---

    // 1. Load initial data on page load
    const loadDashboardData = async () => {
        const result = await callApi('getTrackerData');
        if (result && result.data) {
            updateUI(result.data);
        }
    };

    // 2. Handle transaction form submission
    logForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const amount = parseFloat(amountInput.value);
        const category = categoryInput.value;
        const notes = notesInput.value.trim();

        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount.');
            return;
        }

        logBtn.disabled = true;
        logBtn.textContent = 'Logging...';

        // Call the new 'logTransaction' action
        const result = await callApi('logTransaction', { amount, category, notes });
        
        if (result && result.success) {
            // Clear the form
            amountInput.value = '';
            notesInput.value = '';
            // Reload ALL data to show new progress
            await loadDashboardData();
        }

        logBtn.disabled = false;
        logBtn.textContent = 'Log Transaction';
    });

    // 3. Handle "End Month" button click
    endMonthBtn.addEventListener('click', async () => {
        const confirmEnd = confirm(
            'Are you SURE you want to end the month?\n\nThis will calculate your rollover and permanently clear all transactions.'
        );

        if (confirmEnd) {
            const result = await callApi('runMonthEnd');
            if (result && result.success) {
                alert(`Success! New month started.\nYour rollover balance is: ${formatCurrency(result.newOpeningBalance)}`);
                await loadDashboardData();
            }
        }
    });

    // --- Initialize ---
    loadDashboardData();
});