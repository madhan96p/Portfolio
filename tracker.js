document.addEventListener('DOMContentLoaded', () => {
    // --- Define Categories ---
    const DEBIT_CATEGORIES = [ 'Personal Expense', 'Family Transfer', 'Share Investment', 'Savings Transfer', 'Other Debit' ];
    const CREDIT_CATEGORIES = [ 'Salary', 'Gift / From Friend', 'Other Income' ];

    // --- Get All DOM Elements (Use conditional checks later) ---
    const loader = document.getElementById('loader');
    
    // Settings Page Elements
    const settingsForm = document.getElementById('settings-form');
    const salaryGoalInput = document.getElementById('salary-goal');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const endMonthBtn = document.getElementById('end-month-btn');

    // Log Page Elements
    const logForm = document.getElementById('log-form');
    const amountInput = document.getElementById('amount');
    const transactionDateInput = document.getElementById('transaction-date');
    const transactionTypeInput = document.getElementById('transaction-type');
    const categoryInput = document.getElementById('category');
    const paymentModeInput = document.getElementById('payment-mode');
    const notesInput = document.getElementById('notes');
    const logBtn = document.getElementById('log-btn');

    // Dashboard Page Elements (from main.html)
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

    const balanceEl = document.getElementById('balance');
    const totalAvailableEl = document.getElementById('total-available');
    const totalSpentEl = document.getElementById('total-spent');

    const historyTableBody = document.getElementById('history-table-body');


    // --- Helper Functions ---
    const showLoader = (show) => {
        if (loader) loader.classList.toggle('visible', show);
    };

    const formatCurrency = (num) => `₹${Number(num).toFixed(2)}`;
    
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

    const updateCategoryDropdown = () => {
        if (!transactionTypeInput || !categoryInput) return;
        const type = transactionTypeInput.value;
        const categories = (type === 'credit') ? CREDIT_CATEGORIES : DEBIT_CATEGORIES;
        
        categoryInput.innerHTML = ''; 
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categoryInput.appendChild(option);
        });
    };

    const renderHistory = (history) => {
        if (!historyTableBody) return;
        historyTableBody.innerHTML = ''; 
        if (history.length === 0) {
            historyTableBody.innerHTML = '<tr><td colspan="4">No transactions for this month yet.</td></tr>';
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
    
    const updateUI = (data) => {
        const { config, goals, actuals, history } = data;
        
        // Update Settings (if present)
        if (salaryGoalInput) salaryGoalInput.value = parseFloat(config.Total_Salary || 0);

        // Update Dashboard (if present)
        updateProgressBar(familyCard, familyProgress, familySummary, familyPending, 
            actuals.family, goals.goalFamily, { sent: 'Sent', goal: 'Goal', pending: 'Pending' });
        
        updateProgressBar(sharesCard, sharesProgress, sharesSummary, sharesPending, 
            actuals.shares, goals.goalShares, { sent: 'Invested', goal: 'Goal', pending: 'Pending' });
        
        updateProgressBar(savingsCard, savingsProgress, savingsSummary, savingsPending, 
            actuals.savings, goals.goalSavings, { sent: 'Saved', goal: 'Goal', pending: 'Pending' });
        
        if (balanceEl) {
            const balance = goals.goalExpenses - actuals.expenses;
            balanceEl.textContent = formatCurrency(balance);
            totalAvailableEl.textContent = formatCurrency(goals.goalExpenses);
            totalSpentEl.textContent = formatCurrency(actuals.expenses);
        }

        renderHistory(history);
    };
    
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
            if (action !== 'getTrackerData') alert(`Error: ${error.message}`);
        } finally {
            showLoader(false);
        }
    };

    // --- Event Handlers & Initialization ---

    const loadDashboardData = async () => {
        const result = await callApi('getTrackerData');
        if (result && result.data) {
            updateUI(result.data); 
        }
    };

    // 1. LOG PAGE Logic
    if (logForm) {
        if (transactionDateInput) transactionDateInput.valueAsDate = new Date();
        updateCategoryDropdown();
        transactionTypeInput.addEventListener('change', updateCategoryDropdown);

        logForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const amount = parseFloat(amountInput.value);
            const type = transactionTypeInput.value;
            const category = categoryInput.value;
            const notes = notesInput.value.trim();
            const transactionDate = transactionDateInput.value;
            const paymentMode = paymentModeInput.value;

            if (isNaN(amount) || amount <= 0) { alert('Enter valid amount'); return; }
            if (!transactionDate) { alert('Select valid date'); return; }

            logBtn.disabled = true;
            logBtn.textContent = 'Logging...';
            
            const result = await callApi('logTransaction', { amount, type, category, notes, transactionDate, paymentMode });
            
            if (result && result.success) {
                alert('Transaction logged successfully!');
                // --- THIS IS THE KEY CHANGE ---
                window.location.href = 'main.html'; // Redirect to Dashboard
            } else {
                logBtn.disabled = false;
                logBtn.textContent = 'Log Transaction';
            }
        });
    }

    // 2. SETTINGS PAGE Logic
    if (settingsForm) {
        loadDashboardData();
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newSalary = parseFloat(salaryGoalInput.value);
            if (isNaN(newSalary) || newSalary < 0) return;

            saveSettingsBtn.disabled = true;
            saveSettingsBtn.textContent = 'Saving...';
            await callApi('updateSalaryGoal', { newSalary });
            saveSettingsBtn.disabled = false;
            saveSettingsBtn.textContent = 'Save Goal';
            alert('Salary goal updated!');
        });
    }
    if (endMonthBtn) {
        endMonthBtn.addEventListener('click', async () => {
            if(confirm('Are you sure you want to End Month?')) {
                const result = await callApi('runMonthEnd');
                if (result && result.success) {
                    alert(`New month started. Rollover: ${formatCurrency(result.newOpeningBalance)}`);
                    loadDashboardData(); 
                }
            }
        });
    }

    // 3. DASHBOARD PAGE Logic (main.html)
    if (historyTableBody) {
        loadDashboardData();
    }
});