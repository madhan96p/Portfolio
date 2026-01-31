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

const ENTITY_TO_SUB_CAT_MAP = {
    'zomato': 'Food & Dining', 'swiggy': 'Food & Dining', 'restaurant': 'Food & Dining',
    'uber': 'Transport', 'ola': 'Transport', 'rapido': 'Transport', 'fuel': 'Transport',
    'electricity': 'Utilities', 'water': 'Utilities', 'internet': 'Utilities',
    'movie': 'Entertainment', 'netflix': 'Entertainment', 'spotify': 'Entertainment',
    'pharmacy': 'Medical', 'hospital': 'Medical', 'doctor': 'Medical',
    'amazon': 'Shopping', 'flipkart': 'Shopping', 'myntra': 'Shopping', 'groceries': 'Groceries',
    'rent': 'Rent', 'maintenance': 'Maintenance',
    'mom': 'Parental Support', 'dad': 'Parental Support',
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('date').valueAsDate = new Date();
    updateSubCategories();
    populateCleanEntities();

    document.getElementById('submit-new-btn').addEventListener('click', () => handleSubmit(false));
    document.getElementById('submit-close-btn').addEventListener('click', () => handleSubmit(true));
});

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
        const counts = txns.reduce((acc, t) => {
            acc[t.entity] = (acc[t.entity] || 0) + 1;
            return acc;
        }, {});
        const topEntities = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 15);
        document.getElementById('entity-list').innerHTML = topEntities.map(e => `<option value="${e}"></option>`).join('');
    } catch (e) { console.error("Entity Sync Failed"); }
}

document.getElementById('entity').addEventListener('input', (e) => {
    const entity = e.target.value.toLowerCase();
    for (const keyword in ENTITY_TO_SUB_CAT_MAP) {
        if (entity.includes(keyword)) {
            const subCategory = ENTITY_TO_SUB_CAT_MAP[keyword];
            for (const category in SUB_CATS) {
                if (SUB_CATS[category].includes(subCategory)) {
                    document.getElementById('category').value = category;
                    updateSubCategories();
                    document.getElementById('sub-category').value = subCategory;
                    return;
                }
            }
        }
    }
});

async function handleSubmit(shouldClose) {
    const form = document.getElementById('tx-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const btn = shouldClose ? document.getElementById('submit-close-btn') : document.getElementById('submit-new-btn');
    const originalBtnContent = btn.innerHTML;
    btn.innerHTML = '<span><i class="fas fa-spinner fa-spin"></i> Saving...</span>';
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
        if (shouldClose) {
            window.location.href = '../dashboard/index.html';
        } else {
            // Reset form but keep date
            document.getElementById('amount').value = '';
            document.getElementById('entity').value = '';
            document.getElementById('notes').value = '';
            document.getElementById('symbol').value = '';
            document.getElementById('units').value = '';
            document.getElementById('amount').focus();

            btn.innerHTML = '<span><i class="fas fa-check"></i> Saved!</span>';
            setTimeout(() => {
                btn.innerHTML = originalBtnContent;
                btn.disabled = false;
            }, 1500);
        }
    } catch (err) {
        btn.innerHTML = '<span><i class="fas fa-times"></i> Error</span>';
        setTimeout(() => {
            btn.innerHTML = originalBtnContent;
            btn.disabled = false;
        }, 2000);
    }
}
