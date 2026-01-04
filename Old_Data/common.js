// --- common.js ---
// This file contains shared functions used by all other JS files.

/**
 * Shows or hides the global loading spinner.
 * @param {boolean} show - True to show, false to hide.
 */
const showLoader = (show) => {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.classList.toggle('visible', show);
    }
};

/**
 * Formats a number into Indian Rupee currency.
 * @param {number} num - The number to format.
 * @returns {string} - e.g., "₹50,000.00"
 */
const formatCurrency = (num) => {
    return Number(num).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

/**
 * A centralized API helper function.
 * Shows loader, makes the call, and handles errors.
 * @param {string} action - The API action to perform.
 * @param {object} data - The data payload to send.
 * @returns {Promise<object | null>} - The result from the API or null on failure.
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
        return result; // Returns the full result object (e.g., { success: true, data: ... })
    } catch (error) {
        console.error('API Error:', error);
        alert(`Error: ${error.message}`);
        return null; // Return null to signal a failure
    } finally {
        showLoader(false);
    }
};