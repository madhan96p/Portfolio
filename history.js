// --- history.js ---
// Manages the Transaction History page (history.html)

document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let currentFilter = '1M';
    let allTransactions = []; // Stores all transactions for client-side search
    let historyChart; // Holds the Chart.js instance

    // --- DOM Elements ---
    const tableBody = document.getElementById('history-table-body');
    const filterButtons = document.getElementById('history-filters');
    const chartCanvas = document.getElementById('history-chart');
    const chartTotal = document.getElementById('chart-total');
    const searchNotes = document.getElementById('search-notes');
    const searchCategory = document.getElementById('search-category');

    /**
     * Renders the Pie Chart with Chart.js
     */
    const renderChart = (chartData) => {
        if (historyChart) {
            historyChart.destroy(); // Destroy old chart
        }
        
        // Update total spent
        chartTotal.querySelector('h4').textContent = formatCurrency(chartData.totalDebits);

        if (chartData.labels.length === 0) {
            chartCanvas.style.display = 'none';
            return;
        }
        chartCanvas.style.display = 'block';

        const ctx = chartCanvas.getContext('2d');
        historyChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartData.labels,
                datasets: [{
                    data: chartData.values,
                    backgroundColor: ['#4a90e2', '#f39c12', '#f44336', '#4caf50', '#9b59b6', '#34495e'],
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { boxWidth: 12 }
                    }
                }
            }
        });
    };

    /**
     * Populates the category filter dropdown from the loaded transactions.
     */
    const populateCategoryFilter = () => {
        const categories = new Set();
        allTransactions.forEach(tx => categories.add(tx.category));
        
        searchCategory.innerHTML = '<option value="">All Categories</option>'; // Reset
        categories.forEach(cat => {
            searchCategory.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
    };

    /**
     * Renders transactions to the table, applying client-side filters.
     */
    const renderTable = () => {
        const noteFilter = searchNotes.value.toLowerCase();
        const categoryFilter = searchCategory.value;

        const filteredTransactions = allTransactions.filter(tx => {
            const noteMatch = (tx.notes || '').toLowerCase().includes(noteFilter);
            const categoryMatch = (categoryFilter === '') || (tx.category === categoryFilter);
            return noteMatch && categoryMatch;
        });

        if (!filteredTransactions || filteredTransactions.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5">No transactions found for these filters.</td></tr>`;
            return;
        }

        tableBody.innerHTML = ''; // Clear
        
        filteredTransactions.forEach(tx => {
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
     * Fetches and renders all data for a specific filter.
     */
    const loadHistory = async (filter) => {
        currentFilter = filter;
        tableBody.innerHTML = `<tr><td colspan="5">Loading history...</td></tr>`;
        
        // Update active button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        // Reset search
        searchNotes.value = '';
        searchCategory.value = '';

        // Call the new API action
        const result = await callApi('getHistoryAnalysis', { filter });

        if (result && result.data) {
            const { transactions, chartData } = result.data;
            allTransactions = transactions; // Store for client-side search
            
            renderChart(chartData);
            populateCategoryFilter();
            renderTable(); // First render
        } else {
            tableBody.innerHTML = `<tr><td colspan="5">Error loading history.</td></tr>`;
        }
    };

    // --- Event Listeners ---
    
    // 1. For top filter buttons (1D, 1W, etc.)
    filterButtons.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            const filter = e.target.dataset.filter;
            if (filter !== currentFilter) {
                loadHistory(filter);
            }
        }
    });

    // 2. For client-side search (instant)
    searchNotes.addEventListener('input', renderTable);
    searchCategory.addEventListener('change', renderTable);

    // --- Initial Load ---
    loadHistory(currentFilter); // Load '1M' (This Cycle) by default
});