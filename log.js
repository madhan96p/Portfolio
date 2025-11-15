// --- log.js ---
// Manages the Log Transaction page (log.html)

document.addEventListener('DOMContentLoaded', () => {
    // --- Define Categories ---
    const DEBIT_CATEGORIES = [ 'Personal Expense', 'Family Transfer', 'Share Investment', 'Savings Transfer', 'Other Debit' ];
    const CREDIT_CATEGORIES = [ 'Salary', 'Gift / From Friend', 'Other Income' ];

    // --- Get Log Page DOM Elements ---
    const logForm = document.getElementById('log-form');
    const amountInput = document.getElementById('amount');
    const transactionDateInput = document.getElementById('transaction-date');
    const transactionTypeInput = document.getElementById('transaction-type');
    const categoryInput = document.getElementById('category');
    const paymentModeInput = document.getElementById('payment-mode');
    const notesInput = document.getElementById('notes');
    const logBtn = document.getElementById('log-btn');

    /**
     * Populates the category dropdown based on transaction type.
     */
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

    // --- Initialization and Event Handlers ---
    if (logForm) {
        // Set default date to today
        if (transactionDateInput) transactionDateInput.valueAsDate = new Date();
        
        // Populate initial categories
        updateCategoryDropdown();
        
        // Add listener for type change
        transactionTypeInput.addEventListener('change', updateCategoryDropdown);

        // Add listener for form submission
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
            
            // The global `callApi` function is from common.js
            const result = await callApi('logTransaction', { amount, type, category, notes, transactionDate, paymentMode });
            
            if (result && result.success) {
                alert('Transaction logged successfully!');
                window.location.href = 'main.html'; // Redirect to Dashboard
            } else {
                // Error alert is already handled by callApi
                logBtn.disabled = false;
                logBtn.textContent = 'Log Transaction';
            }
        });
    }
});