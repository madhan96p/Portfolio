import "../../assets/js/common.js";
import "../../core/theme-engine.js";
import { API } from '../../core/api-client.js';

let transactionType = 'debit'; // 'debit' or 'credit'

const DEBIT_CATEGORIES = {
    "Personal Spending": ["Food & Dining", "Transport", "Utilities", "Entertainment", "Medical", "Shopping", "P2P Outflow", "Gifts", "Bank Charges", "Misc"],
    "Household Spending": ["Groceries", "Rent", "Maintenance", "Supplies", "Utilities", "Food & Dining", "Shopping", "Misc"],
    "Family Transfer": ["Parental Support", "Debt Repayment"],
    "Share Investment": ["Equity", "Mutual Funds", "Gold"],
    "Savings Transfer": ["Savings"],
};

const CREDIT_CATEGORIES = {
    "Salary": ["Primary Salary", "Freelance", "Bonus/Transfer"],
    "Other Income": ["Rewards", "Investments", "Refund", "Misc"],
    "Family Support": ["P2P Inflow"],
    "Share Investment": ["Refund"],
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
    setupEventListeners();
    updateCategories();
    populateCleanEntities();
});

function setupEventListeners() {
    document.getElementById('debit-btn').addEventListener('click', () => setTransactionType('debit'));
    document.getElementById('credit-btn').addEventListener('click', () => setTransactionType('credit'));

    document.getElementById('category').addEventListener('change', () => {
        updateSubCategories();
        const isShare = document.getElementById('category').value === 'Share Investment';
        document.getElementById('share-units-box').classList.toggle('hidden', !isShare);
        document.getElementById('share-symbol-box').classList.toggle('hidden', !isShare);
    });

    document.getElementById('entity').addEventListener('input', (e) => {
        const entity = e.target.value.toLowerCase();
        for (const keyword in ENTITY_TO_SUB_CAT_MAP) {
            if (entity.includes(keyword)) {
                const subCategory = ENTITY_TO_SUB_CAT_MAP[keyword];
                const categories = transactionType === 'debit' ? DEBIT_CATEGORIES : CREDIT_CATEGORIES;
                for (const category in categories) {
                    if (categories[category].includes(subCategory)) {
                        document.getElementById('category').value = category;
                        updateCategories();
                        document.getElementById('sub-category').value = subCategory;
                        return;
                    }
                }
            }
        }
    });
    
    document.getElementById('submit-new-btn').addEventListener('click', (e) => {
        e.preventDefault();
        handleSubmit(false)
    });
    document.getElementById('submit-close-btn').addEventListener('click', () => handleSubmit(true));
}

function setTransactionType(type) {
    transactionType = type;
    const debitBtn = document.getElementById('debit-btn');
    const creditBtn = document.getElementById('credit-btn');

    if (type === 'debit') {
        debitBtn.classList.add('bg-app-accent', 'text-white');
        debitBtn.classList.remove('text-app-muted');
        creditBtn.classList.remove('bg-app-accent', 'text-white');
        creditBtn.classList.add('text-app-muted');
    } else {
        creditBtn.classList.add('bg-app-accent', 'text-white');
        creditBtn.classList.remove('text-app-muted');
        debitBtn.classList.remove('bg-app-accent', 'text-white');
        debitBtn.classList.add('text-app-muted');
    }
    updateCategories();
}

function updateCategories() {
    const categorySelect = document.getElementById('category');
    const categories = transactionType === 'debit' ? DEBIT_CATEGORIES : CREDIT_CATEGORIES;
    
    // Group categories for better readability
    const categoryGroups = {
        'Income': ['Salary', 'Other Income', 'Family Support'],
        'Expenses': ['Personal Spending', 'Household Spending'],
        'Transfers': ['Family Transfer', 'Savings Transfer'],
        'Investments': ['Share Investment']
    };

    let html = '';
    for (const groupName in categoryGroups) {
        const groupCategories = categoryGroups[groupName].filter(cat => categories[cat]);
        if (groupCategories.length > 0) {
            html += `<optgroup label="${groupName}">`;
            html += groupCategories.map(cat => `<option value="${cat}">${getCategoryDisplayName(cat)}</option>`).join('');
            html += `</optgroup>`;
        }
    }
    
    categorySelect.innerHTML = html;
    updateSubCategories();
}

function getCategoryDisplayName(category) {
    const names = {
        'Personal Spending': 'Personal Spending',
        'Household Spending': 'Household Spending',
        'Family Support': 'Family Support',
        'Family Transfer': 'Family Transfer',
        'Share Investment': 'Shares & MFs',
        'Salary': 'Salary',
        'Other Income': 'Other Income',
        'Savings Transfer': 'Self Transfer'
    };
    return names[category] || category;
}


function updateSubCategories() {
    const cat = document.getElementById('category').value;
    const subSelect = document.getElementById('sub-category');
    const categories = transactionType === 'debit' ? DEBIT_CATEGORIES : CREDIT_CATEGORIES;
    const subCategories = categories[cat] || [];
    subSelect.innerHTML = subCategories.map(s => `<option value="${s}">${s}</option>`).join('');
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

    const amount = parseFloat(document.getElementById('amount').value);
    const payload = {
        date: document.getElementById('date').value,
        category: document.getElementById('category').value,
        subCategory: document.getElementById('sub-category').value,
        amount_dr: transactionType === 'debit' ? amount : 0,
        amount_cr: transactionType === 'credit' ? amount : 0,
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