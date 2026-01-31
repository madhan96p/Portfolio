import "../../assets/js/common.js";
import "../../core/theme-engine.js";
import { API } from '../../core/api-client.js';

const SUB_CATS = {
    "Personal Spending": ["Food & Dining", "Transport", "Utilities", "Entertainment", "Medical", "Shopping"],
    "Household Spending": ["Groceries", "Rent", "Maintenance", "Supplies"],
    "Family Support": ["Debt Repayment", "Parental Support", "P2P Outflow"],
    "Share Investment": ["Equity", "Mutual Funds", "Gold"],
    "Salary": ["Primary Salary", "Freelance", "Bonus"]
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. Default Date to Today
    document.getElementById('date').valueAsDate = new Date();
    
    // 2. Initialize Sub-Categories
    updateSubCategories();
    populateCleanEntities();
});

// Logic: Map Category to Sub-Category
document.getElementById('category').addEventListener('change', () => {
    updateSubCategories();
    const isShare = document.getElementById('category').value === 'Share Investment';
    document.getElementById('share-units-box').classList.toggle('hidden', !isShare);
    document.getElementById('share-symbol-box').classList.toggle('hidden', !isShare);
});

function updateSubCategories() {
    const cat = document.getElementById('category').value;
    const subSelect = document.getElementById('sub-category');
    subSelect.innerHTML = SUB_CATS[cat].map(s => `<option value="${s}">${s}</option>`).join('');
}

async function populateCleanEntities() {
    try {
        const txns = await API.getTransactions();
        
        // Data Fatigue Fix: Count frequency and take top 15 unique
        const counts = txns.reduce((acc, t) => {
            acc[t.entity] = (acc[t.entity] || 0) + 1;
            return acc;
        }, {});

        const topEntities = Object.keys(counts)
            .sort((a, b) => counts[b] - counts[a])
            .slice(0, 15);

        document.getElementById('entity-list').innerHTML = topEntities
            .map(e => `<option value="${e}">`).join('');
    } catch (e) { console.error("Entity Sync Failed"); }
}

document.getElementById('tx-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    btn.innerText = "VERIFYING...";
    btn.disabled = true;

    const payload = {
        date: document.getElementById('date').value,
        category: document.getElementById('category').value,
        subCategory: document.getElementById('sub-category').value,
        amount: parseFloat(document.getElementById('amount').value),
        entity: document.getElementById('entity').value,
        mode: document.getElementById('mode').value,
        notes: document.getElementById('notes').value,
        symbol: document.getElementById('symbol').value,
        units: parseFloat(document.getElementById('units').value || 0)
    };

    try {
        await API.postTransaction(payload);
        window.location.href = '../dashboard/index.html';
    } catch (err) {
        btn.innerText = "ERROR - RETRY";
        btn.disabled = false;
    }
});