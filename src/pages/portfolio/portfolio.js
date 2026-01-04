import { API } from "../../core/api-client.js";

async function initPortfolio() {
  try {
    const data = await API.getDashboard();
    console.log("DEBUG: Assets Received ->", data.holdings); // <-- ADD THIS
    renderStats(data);
    renderHoldings(data.holdings);
  } catch (err) {
    console.error("Wealth Sync Error:", err);
  }
}

function renderStats(data) {
  const ratio = parseFloat(data.summary.wealthToDebtRatio);
  document.getElementById("ratio-display").innerText = ratio.toFixed(2);
  document.getElementById(
    "total-assets"
  ).innerText = `₹${data.pool.shares.currentPortfolio.toLocaleString()}`;

  const progressWidth = Math.min((ratio / 1.5) * 100, 100);
  document.getElementById("ratio-progress").style.width = `${progressWidth}%`;
}

function renderHoldings(holdings) {
  const list = document.getElementById("portfolio-list");

  // Safety check: If no assets, show a placeholder
  if (!holdings || holdings.length === 0) {
    list.innerHTML = `<p class="text-app-muted text-center py-10">No active assets found.</p>`;
    return;
  }

  list.innerHTML = holdings
    .map((stock) => {
      const isProfit = stock.pnl >= 0;
      const colorClass = isProfit ? "text-emerald-400" : "text-rose-400";

      // Use stock.buyPrice * stock.units to avoid division by zero errors
      const investedAmount = stock.buyPrice * stock.units;
      const percent =
        investedAmount > 0
          ? ((stock.pnl / investedAmount) * 100).toFixed(1)
          : "0.0";

      return `
            <div class="bg-app-card border border-app-border p-4 rounded-2xl flex justify-between items-center transition-transform active:scale-[0.98]">
                <div>
                    <p class="text-[10px] text-app-sub font-bold uppercase tracking-widest">${
                      stock.symbol
                    }</p>
                    <p class="font-bold text-app-text">₹${(
                      stock.currentPrice || stock.buyPrice
                    ).toLocaleString()}</p>
                    <p class="text-[10px] text-app-muted font-mono">${
                      stock.units
                    } Units @ ₹${stock.buyPrice}</p>
                </div>
                <div class="text-right">
                    <p class="font-black ${colorClass}">${
        isProfit ? "+" : ""
      }₹${stock.pnl.toLocaleString()}</p>
                    <p class="text-[9px] ${
                      isProfit
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-rose-500/10 text-rose-500"
                    } px-2 py-1 rounded-full font-bold">
                        ${percent}%
                    </p>
                </div>
            </div>
        `;
    })
    .join("");
}

document.addEventListener("DOMContentLoaded", initPortfolio);
