import { API } from '../../core/api-client.js';

// 1. Fetch existing entities on load to populate the dropdown
async function populateEntityDropdown() {
    try {
        const response = await fetch('/api/get-transactions');
        const transactions = await response.json();
        
        // Get unique entity names, filtered and sorted
        const uniqueEntities = [...new Set(transactions.map(t => t.entity))]
            .filter(name => name && name.trim() !== "")
            .sort();

        const datalist = document.getElementById('entity-list');
        datalist.innerHTML = uniqueEntities
            .map(entity => `<option value="${entity}">`)
            .join('');
            
        console.log(`System: Loaded ${uniqueEntities.length} unique entities.`);
    } catch (err) {
        console.warn("Entity Sync Failed: Operating in manual mode.");
    }
}

// 2. Handle Category UI changes
document.getElementById('category').addEventListener('change', (e) => {
    const shareFields = document.getElementById('share-fields');
    shareFields.classList.toggle('hidden', e.target.value !== 'Share Investment');
    
    // Auto-prefix for Family to trigger "Backwards-Progress" logic if needed
    if (e.target.value === 'Family Support') {
        const entityInput = document.getElementById('entity');
        if (!entityInput.value) entityInput.placeholder = "Try 'Mom' or 'Dad'...";
    }
});

// 3. Handle Form Submission
document.getElementById('tx-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    btn.innerText = "Securing Transaction...";
    btn.disabled = true;

    const category = document.getElementById('category').value;
    const entity = document.getElementById('entity').value;

    const payload = {
        amount: parseFloat(document.getElementById('amount').value),
        category: category,
        entity: entity,
        notes: document.getElementById('notes').value,
        // LOGIC: If Category is Family and Entity is Mom/Dad, it's a Credit (Borrowing)
        // Otherwise, if Category is Salary, it's a Credit. All else are Debits.
        isCredit: category === 'Salary' || (category === 'Family Support' && (entity.includes('Mom') || entity.includes('Dad'))),
        symbol: document.getElementById('symbol').value,
        units: parseFloat(document.getElementById('units').value || 0)
    };

    try {
        const res = await fetch('/api/post-transaction', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            window.location.href = '../dashboard/index.html';
        }
    } catch (err) {
        alert("Integrity Failure: Check Network");
        btn.innerText = "Record Transaction";
        btn.disabled = false;
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', populateEntityDropdown);