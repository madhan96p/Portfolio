// --- history.js ---
// Manages the Transaction History page (history.html)

document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let currentPage = 1;
    const PAGE_SIZE = 20;

    // --- DOM Elements ---
    const tableBody = document.getElementById('history-table-body');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageInfo = document.getElementById('page-info');

    /**
     * Renders a list of transactions to the table.
     * @param {Array} transactions - List of transaction objects from the API.
     */
    const renderHistory = (transactions) => {
        if (!transactions || transactions.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5">No transactions found.</td></tr>`;
            return;
        }

        tableBody.innerHTML = ''; // Clear loading row
        
        transactions.forEach(tx => {
            const tr = document.createElement('tr');
            
            const debit = tx.debit && tx.debit !== '0' ? formatCurrency(tx.debit) : '-';
            const credit = tx.credit && tx.credit !== '0' ? formatCurrency(tx.credit) : '-';

            tr.innerHTML = `
                <td>${tx.date || '-'}</td>
                <td><strong>${tx.category || 'N/A'}</strong><br><small>${tx.notes || '-'}</small></td>
                <td>${debit}</td>
                <td>${credit}</td>
                <td>${tx.paymentMode || '-'}</td>
            `;
            tableBody.appendChild(tr);
        });
    };

    /**
     * Fetches a specific page of transactions from the API.
     * @param {number} page - The page number to fetch.
     */
    const loadHistory = async (page) => {
        currentPage = page;
        const offset = (page - 1) * PAGE_SIZE;

        // The global `callApi` is from common.js
        const result = await callApi('getTransactionHistory', { limit: PAGE_SIZE, offset });

        if (result && result.data) {
            const { transactions, hasMore } = result.data;
            renderHistory(transactions);

            // Update page info and button states
            pageInfo.textContent = `Page ${currentPage}`;
            prevBtn.disabled = (currentPage === 1);
            nextBtn.disabled = !hasMore;
        } else {
            // Error is handled by callApi, but we should clear the table
            tableBody.innerHTML = `<tr><td colspan="5">Error loading history.</td></tr>`;
        }
    };

    // --- Event Listeners ---
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            loadHistory(currentPage - 1);
        }
    });

    nextBtn.addEventListener('click', () => {
        loadHistory(currentPage + 1);
    });

    // --- Initial Load ---
    loadHistory(currentPage);
});