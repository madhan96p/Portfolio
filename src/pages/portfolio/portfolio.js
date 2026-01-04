import { API } from '../../core/api-client.js';

async function initPortfolio() {
    try {
        const data = await API.getDashboard();
        renderStats(data);
        renderHoldings(data.holdings);
    } catch (err) {
        console.error("Wealth Sync Error:", err);
    }
}

function renderStats(data) {
    const ratio = parseFloat(data.summary.wealthToDebtRatio);
    document.getElementById('ratio-display').innerText = ratio.toFixed(2);
    document.getElementById('total-assets').innerText = `₹${data.pool.shares.currentPortfolio.toLocaleString()}`;
    
    const progressWidth = Math.min((ratio / 1.5) * 100, 100); 
    document.getElementById('ratio-progress').style.width = `${progressWidth}%`;
}

function renderHoldings(holdings) {
    const list = document.getElementById('portfolio-list');
    
    list.innerHTML = holdings.map(stock => {
        const isProfit = stock.pnl >= 0;
        const colorClass = isProfit ? 'text-emerald-400' : 'text-rose-400';
        const percent = ((stock.pnl / (stock.buyPrice * stock.units)) * 100).toFixed(1);

        return `
            <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex justify-between items-center">
                <div>
                    <p class="text-[10px] text-slate-500 font-bold">${stock.symbol}</p>
                    <p class="font-bold text-sm">₹${stock.currentPrice || stock.buyPrice}</p>
                    <p class="text-[10px] text-slate-400">${stock.units} Units @ ₹${stock.buyPrice}</p>
                </div>
                <div class="text-right">
                    <p class="font-black ${colorClass}">${isProfit ? '+' : ''}₹${stock.pnl || 0}</p>
                    <p class="text-[10px] ${isProfit ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'} px-2 py-0.5 rounded-full font-bold">
                        ${percent}%
                    </p>
                </div>
            </div>
        `;
    }).join('');
}

document.addEventListener('DOMContentLoaded', initPortfolio);