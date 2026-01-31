// src/components/filter-popup.js
document.addEventListener('DOMContentLoaded', () => {
    const filterPopup = document.createElement('div');
    filterPopup.id = 'filter-popup';

    filterPopup.innerHTML = `
        <div id="filter-icon">📅</div>
        <div id="filter-options">
            <button data-range="1d">1D</button>
            <button data-range="1w">1W</button>
            <button data-range="1m">1M</button>
            <button data-range="all">All</button>
            <button data-range="custom">Custom</button>
        </div>
    `;

    document.body.appendChild(filterPopup);

    const filterIcon = document.getElementById('filter-icon');
    const filterOptions = document.getElementById('filter-options');

    filterIcon.addEventListener('click', () => {
        filterOptions.style.display = filterOptions.style.display === 'flex' ? 'none' : 'flex';
    });

    filterOptions.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const range = e.target.dataset.range;
            localStorage.setItem('selectedDateRange', range);
            filterOptions.style.display = 'none';
            // Optional: Dispatch a custom event to notify other parts of the app
            window.dispatchEvent(new CustomEvent('dateRangeChanged', { detail: range }));
        }
    });
});
