const form = document.getElementById('transaction-form');
const notesInput = document.getElementById('notes');
const preview = document.getElementById('logic-preview');

// Keyword Mapping Logic
const keywordMap = {
    'bus': { cat: 'Personal Spending', sub: 'Transport' },
    'metro': { cat: 'Personal Spending', sub: 'Transport' },
    'food': { cat: 'Personal Spending', sub: 'Food & Dining' },
    'mom': { cat: 'Family Support', sub: 'P2P Inflow', entity: 'Mom' },
    'dad': { cat: 'Family Support', sub: 'P2P Inflow', entity: 'Dad' },
    'share': { cat: 'Share Investment', sub: 'Equity' }
};

notesInput.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    for (let key in keywordMap) {
        if (val.includes(key)) {
            const match = keywordMap[key];
            document.getElementById('category').value = match.cat;
            preview.innerText = `Detected: ${match.sub} (${match.entity || 'Personal'})`;
            preview.style.color = match.cat === 'Family Support' ? '#ef4444' : '#10b981';
            break;
        }
    }
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    btn.innerText = "Transmitting...";
    
    const payload = {
        amount: parseFloat(document.getElementById('amount').value),
        category: document.getElementById('category').value,
        notes: notesInput.value,
        mode: document.getElementById('payment-mode').value,
        date: new Date().toISOString().split('T')[0]
    };

    try {
        const response = await fetch('/.netlify/functions/engine', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            window.location.href = '/pages/dashboard.html';
        }
    } catch (err) {
        alert("Transmission Failed: " + err);
        btn.innerText = "Authorize Transaction";
    }
});