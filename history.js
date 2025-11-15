// --- history.js ---
// Manages the Transaction History page (history.html)

document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let currentFilter = '1M';
    let currentViewMode = 'debit'; // 'debit' or 'credit'
    let allTransactions = []; // Stores all transactions for client-side search
    let apiData = {}; // Stores the full response from the API
    let historyChart; // Holds the Chart.js instance

    // --- DOM Elements ---
    const tableBody = document.getElementById('history-table-body');
    const filterButtons = document.getElementById('history-filters');
    const chartCanvas = document.getElementById('history-chart');
    const chartTotal = document.getElementById('chart-total');
    const searchNotes = document.getElementById('search-notes');
    const searchCategory = document.getElementById('search-category');
    
    // New Toggle Elements
    const analysisTitle = document.getElementById('analysis-title');
    const toggleExpenseBtn = document.getElementById('toggle-expense');
    const toggleIncomeBtn = document.getElementById('toggle-income');

    /**
     * Renders the Pie Chart with Chart.js based on the currentViewMode
     */
    const renderChart = () => {
        const chartData = (currentViewMode === 'debit') 
            ? apiData.debitChartData 
            : apiData.creditChartData;

        if (historyChart) {
            historyChart.destroy(); // Destroy old chart
        }
        
        // Update total
        chartTotal.querySelector('h4').textContent = formatCurrency(chartData.total);
        chartTotal.querySelector('p').textContent = (currentViewMode === 'debit') ? 'Total Spent' : 'Total Received';

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
                    backgroundColor: (currentViewMode === 'debit')
                        ? ['#f44336', '#f39c12', '#4a90e2', '#9b59b6', '#34495e', '#e74c3c']
                        : ['#4caf50', '#2ecc71', '#8e44ad', '#27ae60'],
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
     * Populates the category filter dropdown based on the currentViewMode.
     */
    const populateCategoryFilter = () => {
        const categories = new Set();
        const filterList = (currentViewMode === 'debit')
            ? allTransactions.filter(tx => parseFloat(tx.debit || 0) > 0)
            : allTransactions.filter(tx => parseFloat(tx.credit || 0) > 0);

        filterList.forEach(tx => categories.add(tx.category));
        
        searchCategory.innerHTML = '<option value="">All Categories</option>'; // Reset
        categories.forEach(cat => {
            searchCategory.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
    };

    /**
     * Renders transactions to the table, applying client-side filters
     * AND the new debit/credit view mode.
     */
    const renderTable = () => {
        const noteFilter = searchNotes.value.toLowerCase();
        const categoryFilter = searchCategory.value;

        const filteredTransactions = allTransactions.filter(tx => {
            // 1. Filter by View Mode (Debit/Credit)
            const isDebit = parseFloat(tx.debit || 0) > 0;
            const isCredit = parseFloat(tx.credit || 0) > 0;
            
            if (currentViewMode === 'debit' && !isDebit) return false;
            if (currentViewMode === 'credit' && !isCredit) return false;

            // 2. Filter by Search & Category
            const noteMatch = (tx.notes || '').toLowerCase().includes(noteFilter);
            const categoryMatch = (categoryFilter === '') || (tx.category === categoryFilter);
            
            return noteMatch && categoryMatch;
        });

        if (!filteredTransactions || filteredTransactions.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5">No transactions found.</td></tr>`;
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
            // Store all data
            apiData = result.data;
            allTransactions = result.data.transactions; 
            
            // Render the page based on the current state (default 'debit')
            renderPage();
        } else {
            tableBody.innerHTML = `<tr><td colspan="5">Error loading history.</td></tr>`;
        }
    };
    
    /**
     * Renders all components based on the currentViewMode
     */
    const renderPage = () => {
        if (!apiData.transactions) return; // Not loaded yet
        
        // Update titles and buttons
        analysisTitle.textContent = (currentViewMode === 'debit') ? 'Expense Analysis' : 'Income Analysis';
        toggleExpenseBtn.classList.toggle('active', currentViewMode === 'debit');
        toggleIncomeBtn.classList.toggle('active', currentViewMode === 'credit');

        // Re-render all components
        renderChart();
        populateCategoryFilter();
        renderTable();
    };

    // --- Event Listeners ---
    
    // 1. For top filter buttons (1D, 1W, etc.)
    filterButtons.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn') || e.target.closest('.filter-btn')) {
            const button = e.target.closest('.filter-btn');
            const filter = button.dataset.filter;
            if (filter !== currentFilter) {
                loadHistory(filter);
            }
        }
    });

    // 2. For client-side search (instant)
    searchNotes.addEventListener('input', renderTable);
    searchCategory.addEventListener('change', renderTable);

    // 3. For new Toggle Buttons
    toggleExpenseBtn.addEventListener('click', () => {
        if (currentViewMode !== 'debit') {
            currentViewMode = 'debit';
            renderPage();
        }
    });
    
    toggleIncomeBtn.addEventListener('click', () => {
        if (currentViewMode !== 'credit') {
            currentViewMode = 'credit';
            renderPage();
        }
    });

    // --- Initial Load ---
    loadHistory(currentFilter); // Load '1M' (This Cycle) by default
});