document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Elements ---
    const loader = document.getElementById('loader');
    const balanceEl = document.getElementById('balance');
    const totalAvailableEl = document.getElementById('total-available');
    const totalSpentEl = document.getElementById('total-spent');

    const expenseForm = document.getElementById('expense-form');
    const amountInput = document.getElementById('amount');
    const categoryInput = document.getElementById('category');
    const notesInput = document.getElementById('notes');
    const logExpenseBtn = document.getElementById('log-expense-btn');
    
    const endMonthBtn = document.getElementById('end-month-btn');

    // --- State ---
    let currentData = {};

    // --- Helper Functions ---
    const showLoader = (show) => {
        loader.classList.toggle('visible', show);
    };

    const formatCurrency = (num) => `₹${Number(num).toFixed(2)}`;

    const updateUI = (data) => {
        currentData = data;
        const available = parseFloat(data.Total_Available_Spend || 0);
        const spent = parseFloat(data.Total_Spent_This_Month || 0);
        const balance = available - spent;

        balanceEl.textContent = formatCurrency(balance);
        totalAvailableEl.textContent = formatCurrency(available);
        totalSpentEl.textContent = formatCurrency(spent);
    };

    /**
     * Main API call function
     * @param {string} action - The API action to perform
     * @param {object} data - The data payload
     */
    const callApi = async (action, data = {}) => {
        showLoader(true);
        try {
            const response = await fetch('/.netlify/functions/api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action, data }),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'API request failed');
            }
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

    // 2. Handle expense form submission
    expenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const amount = parseFloat(amountInput.value);
        const category = categoryInput.value.trim();
        const notes = notesInput.value.trim();

        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount.');
            return;
        }
        if (!category) {
            alert('Please enter a category.');
            return;
        }

        logExpenseBtn.disabled = true;
        logExpenseBtn.textContent = 'Logging...';

        const result = await callApi('logExpense', { amount, category, notes });
        
        if (result && result.success) {
            // Optimistic update: Just update the "spent" amount
            const newSpent = parseFloat(result.newTotalSpent);
            updateUI({ ...currentData, Total_Spent_This_Month: newSpent });
            
            // Clear the form
            amountInput.value = '';
            categoryInput.value = '';
            notesInput.value = '';
        }

        logExpenseBtn.disabled = false;
        logExpenseBtn.textContent = 'Log Expense';
    });

    // 3. Handle "End Month" button click
    endMonthBtn.addEventListener('click', async () => {
        const confirmEnd = confirm(
            'Are you sure you want to end the month?\n\nThis will calculate your rollover and reset your "Spent" amount to zero.'
        );

        if (confirmEnd) {
            const result = await callApi('runMonthEnd');
            if (result && result.data) {
                alert('Success! Your new month has started.');
                updateUI(result.data);
            }
        }
    });

    // --- Initialize ---
    loadDashboardData();
});