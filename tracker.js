document.addEventListener('DOMContentLoaded', () => {
    // --- Define Categories ---
    const DEBIT_CATEGORIES = [
        'Personal Expense', 
        'Family Transfer', 
        'Share Investment', 
        'Savings Transfer',
        'Other Debit'
    ];
    const CREDIT_CATEGORIES = [
        'Salary', 
        'Gift / From Friend', 
        'Other Income'
    ];

    // --- Get All DOM Elements ---
    const loader = document.getElementById('loader');

    // Settings
    const settingsForm = document.getElementById('settings-form');
    const salaryGoalInput = document.getElementById('salary-goal');
    const saveSettingsBtn = document.getElementById('save-settings-btn');

    // Transaction Form
    const logForm = document.getElementById('log-form');
    const amountInput = document.getElementById('amount');
    const transactionTypeInput = document.getElementById('transaction-type');
    const categoryInput = document.getElementById('category');
    const notesInput = document.getElementById('notes');
    const logBtn = document.getElementById('log-btn');

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

    // History Table
    const historyTableBody = document.getElementById('history-table-body');
    
    // Admin
    const endMonthBtn = document.getElementById('end-month-btn');

    // --- Helper Functions ---
    const showLoader = (show) => loader.classList.toggle('visible', show);
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
     * Updates the category dropdown based on transaction type.
     */
    const updateCategoryDropdown = () => {
        const type = transactionTypeInput.value;
        const categories = (type === 'credit') ? CREDIT_CATEGORIES : DEBIT_CATEGORIES;
        
        categoryInput.innerHTML = ''; // Clear existing options
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categoryInput.appendChild(option);
        });
    };

    /**
     * Renders the transaction history table.
     */
    const renderHistory = (history) => {
        historyTableBody.innerHTML = ''; // Clear old history
        if (history.length === 0) {
            historyTableBody.innerHTML = '<tr><td colspan="4">No transactions yet.</td></tr>';
            return;
        }
        
        history.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.date || ''}</td>
                <td>${row.category || ''}</td>
                <td>${row.amount_dr !== '0' ? formatCurrency(row.amount_dr) : '-'}</td>
                <td>${row.amount_cr !== '0' ? formatCurrency(row.amount_cr) : '-'}</td>
            `;
            historyTableBody.appendChild(tr);
        });
    };

    /**
     * Updates the entire UI based on data from the API.
     */
    const updateUI = (data) => {
        const { config, goals, actuals, history } = data;
        
        // 1. Update Settings Card
        salaryGoalInput.value = parseFloat(config.Total_Salary || 0);

        // 2. Update Action Center
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
        
        // 3. Update Expense Wallet
        const balance = goals.goalExpenses - actuals.expenses;
        balanceEl.textContent = formatCurrency(balance);
        totalAvailableEl.textContent = formatCurrency(goals.goalExpenses);
        totalSpentEl.textContent = formatCurrency(actuals.expenses);

        // 4. Update History Table
        renderHistory(history);
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

    // 2. Handle transaction type change
    transactionTypeInput.addEventListener('change', updateCategoryDropdown);

    // 3. Handle settings form submission
    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newSalary = parseFloat(salaryGoalInput.value);
        if (isNaN(newSalary) || newSalary < 0) {
            alert('Please enter a valid salary goal.');
            return;
        }

        saveSettingsBtn.disabled = true;
        saveSettingsBtn.textContent = 'Saving...';
        
        await callApi('updateSalaryGoal', { newSalary });
        
        saveSettingsBtn.disabled = false;
        saveSettingsBtn.textContent = 'Save Goal';
        
        alert('Salary goal updated!');
        await loadDashboardData(); // Reload data with new goal
    });

    // 4. Handle transaction form submission
    logForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const amount = parseFloat(amountInput.value);
        const type = transactionTypeInput.value;
        const category = categoryInput.value;
        const notes = notesInput.value.trim();

        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount.');
            return;
        }

        logBtn.disabled = true;
        logBtn.textContent = 'Logging...';
        
        await callApi('logTransaction', { amount, type, category, notes });
        
        // Clear the form
        amountInput.value = '';
        notesInput.value = '';
        logBtn.disabled = false;
        logBtn.textContent = 'Log Transaction';
        
        await loadDashboardData(); // Reload all data
    });

    // 5. Handle "End Month" button click
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
    updateCategoryDropdown(); // Set initial category options
    loadDashboardData();
});