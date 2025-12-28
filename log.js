// --- log.js ---
// Manages the Log Transaction page (log.html) with Smart P2P and Investment logic

document.addEventListener('DOMContentLoaded', () => {
    // --- Define Categories ---
    const DEBIT_CATEGORIES = ['Personal Spending', 'Household Spending', 'Family Transfer', 'Share Investment', 'Savings Transfer', 'Other Debit'];
    const CREDIT_CATEGORIES = ['Salary', 'Family Support', 'Gift / From Friend', 'Other Income'];

    // --- Get DOM Elements ---
    const logForm = document.getElementById('log-form');
    const amountInput = document.getElementById('amount');
    const transactionDateInput = document.getElementById('transaction-date');
    const transactionTypeInput = document.getElementById('transaction-type');
    const categoryInput = document.getElementById('category');
    const paymentModeInput = document.getElementById('payment-mode');
    const notesInput = document.getElementById('notes');
    const logBtn = document.getElementById('log-btn');
    const logNewBtn = document.getElementById('log-new-btn');

    // --- NEW: Investment Specific Elements ---
    const invFields = document.getElementById('investment-fields');
    const shareSymbolInput = document.getElementById('share-symbol');
    const shareUnitsInput = document.getElementById('share-units');
    const shareBuyPriceInput = document.getElementById('share-buy-price');

    /**
     * Populates the category dropdown and toggles Investment UI.
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
        toggleInvestmentUI();
    };

    /**
     * Shows/Hides the investment detail fields based on category.
     */
    const toggleInvestmentUI = () => {
        if (categoryInput.value === 'Share Investment') {
            invFields.style.display = 'block';
            shareSymbolInput.required = true;
            shareUnitsInput.required = true;
            shareBuyPriceInput.required = true;
        } else {
            invFields.style.display = 'none';
            shareSymbolInput.required = false;
            shareUnitsInput.required = false;
            shareBuyPriceInput.required = false;
        }
    };

    /**
     * Smart Parser: Extracts Entity name from Notes (e.g., "To Amma" -> "Amma")
     */
    const extractEntity = (category, notes) => {
        if (category.includes('Family') || category.includes('Gift')) {
            const match = notes.match(/(?:To|From|For)\s+([a-zA-Z]+)/i);
            return match ? match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase() : 'Family';
        }
        if (category === 'Share Investment') {
            return shareSymbolInput.value.replace('NSE:', '').replace('BSE:', '').toUpperCase() || 'Investment';
        }
        return 'None';
    };

    const clearFormForNew = () => {
        amountInput.value = '';
        notesInput.value = '';
        shareSymbolInput.value = '';
        shareUnitsInput.value = '';
        shareBuyPriceInput.value = '';
        amountInput.focus();
    };

    /**
     * Handles the logging logic and API communication.
     */
    /**
     * Handles the logging logic and API communication.
     * Includes automated Sub-Category mapping to match the 9-column schema.
     */
    const handleLogSubmission = async (redirectOnSuccess) => {
        const amount = parseFloat(amountInput.value);
        const type = transactionTypeInput.value;
        const category = categoryInput.value;
        const notes = notesInput.value.trim();
        const transactionDate = transactionDateInput.value;
        const paymentMode = paymentModeInput.value;

        if (isNaN(amount) || amount <= 0) { alert('Enter valid amount'); return; }
        if (!transactionDate) { alert('Select valid date'); return; }

        // --- NEW: Automated Sub-Category Mapping Logic ---
        let subCategory = 'Misc';
        const n = notes.toLowerCase();
        
        if (n.includes('metro') || n.includes('bus') || n.includes('train')) {
            subCategory = 'Transport';
        } else if (n.includes('food') || n.includes('zomato') || n.includes('snack') || n.includes('chocolate') || n.includes('cookies')) {
            subCategory = 'Food & Dining';
        } else if (n.includes('recharge') || n.includes('electricity') || n.includes('water')) {
            subCategory = 'Utilities';
        } else if (n.includes('milk') || n.includes('vegetable') || n.includes('market') || n.includes('grossories')) {
            subCategory = 'Groceries';
        } else if (category === 'Share Investment') {
            subCategory = 'Equity';
        } else if (category.includes('Family')) {
            subCategory = 'P2P';
        }

        // Capture Investment Data if applicable
        const investment = (category === 'Share Investment') ? {
            symbol: shareSymbolInput.value.toUpperCase(),
            units: parseFloat(shareUnitsInput.value),
            buyPrice: parseFloat(shareBuyPriceInput.value)
        } : null;

        // Perform Smart Entity Extraction
        const entity = extractEntity(category, notes);

        // Disable UI
        logBtn.disabled = true;
        logNewBtn.disabled = true;
        const logBtnOriginalText = logBtn.textContent;
        logBtn.textContent = 'Logging...';

        // Updated Payload with Sub-Category
        const payload = { 
            amount, 
            type, 
            category, 
            subCategory, // Matches new schema
            notes, 
            transactionDate, 
            paymentMode, 
            entity, 
            investment 
        };

        const result = await callApi('logTransaction', payload);
        
        if (result && result.success) {
            alert('Transaction logged successfully!');
            if (redirectOnSuccess) {
                window.location.href = 'main.html';
            } else {
                clearFormForNew();
            }
        } 
        
        logBtn.disabled = false;
        logNewBtn.disabled = false;
        logBtn.textContent = logBtnOriginalText;
    };

    // --- Initialization ---
    if (logForm) {
        if (transactionDateInput) transactionDateInput.valueAsDate = new Date();
        updateCategoryDropdown();
        
        transactionTypeInput.addEventListener('change', updateCategoryDropdown);
        categoryInput.addEventListener('change', toggleInvestmentUI);

        logForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleLogSubmission(true);
        });

        logNewBtn.addEventListener('click', async () => {
            await handleLogSubmission(false);
        });
    }
});