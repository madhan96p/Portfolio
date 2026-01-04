import { API } from '../../core/api-client.js';

let allTransactions = [];

async function loadLedger() {
    try {
        const response = await fetch('/api/get-transactions');
        allTransactions = await response.json();
        renderLedger(allTransactions);
    } catch (err) {
        console.error("Ledger Load Failed", err);
    }
}

function renderLedger(txns) {
    const list = document.getElementById('ledger-list');
    document.getElementById('tx-count').innerText = `${txns.length} TXNS`;
    
    list.innerHTML = txns.map(t => {
        const isDebit = t.amountDR > 0;
        const amount = isDebit ? t.amountDR : t.amountCR;
        const colorClass = isDebit ? 'text-rose-400' : 'text-emerald-400';
        const prefix = isDebit ? '-' : '+';

        return `
            <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex justify-between items-center active:bg-slate-800 transition-colors">
                <div class="flex flex-col">
                    <span class="text-[10px] text-slate-500 font-mono uppercase">${t.date} • ${t.category}</span>
                    <span class="font-bold text-sm tracking-tight">${t.entity}</span>
                    <span class="text-xs text-slate-400 italic">${t.notes || t.subCategory}</span>
                </div>
                <div class="text-right">
                    <div class="font-black ${colorClass}">${prefix}₹${amount.toLocaleString()}</div>
                    <div class="text-[9px] text-slate-600 font-bold uppercase tracking-widest">${t.mode}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Search & Filter Logic
document.getElementById('ledger-search').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allTransactions.filter(t => 
        t.entity.toLowerCase().includes(term) || 
        t.notes.toLowerCase().includes(term)
    );
    renderLedger(filtered);
});

document.addEventListener('DOMContentLoaded', loadLedger);