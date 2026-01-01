async function loadPortfolio() {
    try {
        const response = await fetch('/.netlify/functions/engine?sheet=Portfolio');
        const data = await response.json();

        const list = document.getElementById('portfolio-list');
        list.innerHTML = ''; // Clear loading state

        let totalInv = 0;
        let totalVal = 0;

        data.stocks.forEach(stock => {
            const pnlClass = stock.pnl >= 0 ? 'gain' : 'loss';
            totalInv += parseFloat(stock.avgBuy) * stock.units;
            totalVal += parseFloat(stock.currentPrice) * stock.units;

            list.innerHTML += `
                <div class="stock-card">
                    <div class="stock-info">
                        <strong>${stock.symbol}</strong>
                        <span>${stock.units} Units</span>
                    </div>
                    <div class="stock-values">
                        <span class="price">₹${stock.currentPrice}</span>
                        <span class="pnl ${pnlClass}">${stock.pnl >= 0 ? '+' : ''}${stock.pnl}</span>
                    </div>
                </div>
            `;
        });

        document.getElementById('invested-amt').innerText = `₹${totalInv.toFixed(2)}`;
        const netPnl = totalVal - totalInv;
        const pnlEl = document.getElementById('total-pnl');
        pnlEl.innerText = `₹${netPnl.toFixed(2)}`;
        pnlEl.className = netPnl >= 0 ? 'gain' : 'loss';

    } catch (error) {
        console.error("Portfolio Sync Failed:", error);
    }
}

window.addEventListener('DOMContentLoaded', loadPortfolio);