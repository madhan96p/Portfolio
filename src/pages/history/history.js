import { API } from "../../core/api-client.js";

let allTransactions = [];
let chartInstance = null;
let currentState = { filter: "All", search: "" };

// 🎨 ICON MAPPING (The FAS Magic)
const getIcon = (category, entity) => {
  const text = (category + entity).toLowerCase();
  if (
    text.includes("food") ||
    text.includes("zomato") ||
    text.includes("swiggy")
  )
    return "fa-utensils text-orange-400";
  if (text.includes("uber") || text.includes("ola") || text.includes("fuel"))
    return "fa-car text-blue-400";
  if (text.includes("family")) return "fa-home text-pink-400";
  if (text.includes("share") || text.includes("invest"))
    return "fa-arrow-trend-up text-emerald-400";
  if (text.includes("bill") || text.includes("recharge"))
    return "fa-bolt text-yellow-400";
  if (text.includes("hospital") || text.includes("med"))
    return "fa-heart-pulse text-red-400";
  return "fa-wallet text-slate-400"; // Default
};

async function loadLedger() {
  try {
    // Mock Data for Demo (Replace with your actual fetch)
    // const response = await fetch('/api/get-transactions');
    // allTransactions = await response.json();

    // --- REMOVE THIS MOCK BLOCK IN PRODUCTION ---
    allTransactions = [
      {
        date: "2023-10-25",
        category: "Personal Spending",
        entity: "Zomato",
        notes: "Lunch",
        amountDR: 450,
        amountCR: 0,
        mode: "UPI",
      },
      {
        date: "2023-10-25",
        category: "Transport",
        entity: "Uber",
        notes: "Office",
        amountDR: 200,
        amountCR: 0,
        mode: "UPI",
      },
      {
        date: "2023-10-24",
        category: "Family Support",
        entity: "Dad",
        notes: "Medical",
        amountDR: 5000,
        amountCR: 0,
        mode: "UPI",
      },
      {
        date: "2023-10-23",
        category: "Share Investment",
        entity: "Zerodha",
        notes: "SIP",
        amountDR: 10000,
        amountCR: 0,
        mode: "UPI",
      },
      {
        date: "2023-10-23",
        category: "Income",
        entity: "Salary",
        notes: "Oct",
        amountDR: 0,
        amountCR: 85000,
        mode: "BANK",
      },
    ];
    // -------------------------------------------

    updateUI();
  } catch (err) {
    console.error("Load Failed", err);
  }
}

// 🧠 CORE LOGIC: Filter -> Sort -> Group
function updateUI() {
  // 1. Filter Data
  const filtered = allTransactions.filter((t) => {
    const matchesCat =
      currentState.filter === "All" || t.category === currentState.filter;
    const searchStr = (t.entity + t.notes + t.amountDR).toLowerCase();
    const matchesSearch = searchStr.includes(currentState.search);
    return matchesCat && matchesSearch;
  });

  // 2. Update Stats
  updateSummary(filtered);

  // 3. Render Chart (Only if 'All' is selected to show breakdown)
  if (currentState.filter === "All" && !currentState.search) {
    renderChart(filtered);
  }

  // 4. Render Timeline List
  renderTimeline(filtered);
}

function updateSummary(txns) {
  const income = txns.reduce((sum, t) => sum + (t.amountCR || 0), 0);
  const expense = txns.reduce((sum, t) => sum + (t.amountDR || 0), 0);
  const net = income - expense;

  document.getElementById("net-position").innerHTML = `
        <span class="${
          net >= 0 ? "text-emerald-400" : "text-rose-400"
        } font-bold">
            ${net >= 0 ? "+" : "-"}₹${Math.abs(net).toLocaleString("en-IN")}
        </span>
    `;
}

// 📊 CHART LOGIC (Interactive)
function renderChart(txns) {
  const ctx = document.getElementById("expenseChart").getContext("2d");

  // Group Expenses by Category
  const catTotals = {};
  txns.forEach((t) => {
    if (t.amountDR > 0) {
      catTotals[t.category] = (catTotals[t.category] || 0) + t.amountDR;
    }
  });

  const labels = Object.keys(catTotals);
  const data = Object.values(catTotals);

  if (chartInstance) chartInstance.destroy(); // Prevent memory leaks

  chartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: [
            "#3b82f6",
            "#ec4899",
            "#10b981",
            "#f59e0b",
            "#6366f1",
          ],
          borderWidth: 0,
          hoverOffset: 10,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right",
          labels: { color: "#94a3b8", boxWidth: 10, font: { size: 10 } },
        },
      },
      onClick: (e, elements) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          const selectedCategory = labels[index];
          // ✨ INTERACTIVE: Click Chart -> Filter List
          triggerFilter(selectedCategory);
        }
      },
    },
  });
}

// 📜 TIMELINE RENDERER
function renderTimeline(txns) {
  const list = document.getElementById("ledger-list");
  if (txns.length === 0) {
    list.innerHTML = `<div class="p-10 text-center text-slate-500 italic">No transactions found.</div>`;
    return;
  }

  // Group by Date
  const grouped = txns.reduce((acc, t) => {
    const date = t.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(t);
    return acc;
  }, {});

  list.innerHTML = Object.keys(grouped)
    .map((date) => {
      const dayTxns = grouped[date];
      const dayTotal = dayTxns.reduce((sum, t) => sum + (t.amountDR || 0), 0);

      // Header
      let html = `
            <div class="sticky top-[72px] bg-slate-950/90 backdrop-blur z-10 py-2 px-2 flex justify-between items-end border-b border-slate-900 mb-2">
                <span class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">${new Date(
                  date
                ).toDateString()}</span>
                <span class="text-[10px] text-slate-500 font-mono">Total: -₹${dayTotal.toLocaleString(
                  "en-IN"
                )}</span>
            </div>
        `;

      // Items
      html += dayTxns
        .map((t) => {
          const isDebit = t.amountDR > 0;
          const amount = isDebit ? t.amountDR : t.amountCR;
          const colorClass = isDebit ? "text-rose-400" : "text-emerald-400";
          const iconClass = getIcon(t.category, t.entity);

          return `
                <div class="group relative flex items-center gap-3 p-3 mb-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-all">
                    <div class="w-10 h-10 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 shadow-inner">
                        <i class="fas ${iconClass} text-sm"></i>
                    </div>

                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-baseline mb-0.5">
                            <h3 class="text-sm font-bold text-slate-200 truncate pr-2">${
                              t.entity
                            }</h3>
                            <span class="font-black ${colorClass} text-sm whitespace-nowrap">
                                ${isDebit ? "-" : "+"}₹${amount.toLocaleString(
            "en-IN"
          )}
                            </span>
                        </div>
                        <div class="flex justify-between items-center text-[11px] text-slate-500">
                            <span class="truncate pr-2">${
                              t.notes || t.category
                            }</span>
                            <span class="font-mono bg-slate-950 px-1.5 py-0.5 rounded text-[9px] border border-slate-800">${
                              t.mode
                            }</span>
                        </div>
                    </div>
                </div>
            `;
        })
        .join("");

      return `<div class="mb-6">${html}</div>`;
    })
    .join("");
}

// 🎮 EVENTS
function initListeners() {
  // Search
  document.getElementById("ledger-search").addEventListener("input", (e) => {
    currentState.search = e.target.value.toLowerCase();
    updateUI();
  });

  // Filters
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      triggerFilter(e.target.dataset.filter, e.target);
    });
  });
}

// Helper to switch active filter programmatically
function triggerFilter(filterName, btnElement = null) {
  currentState.filter = filterName;

  // Update UI Buttons
  document.querySelectorAll(".filter-btn").forEach((b) => {
    b.classList.remove("active", "bg-blue-600", "text-slate-50");
    b.classList.add("bg-slate-900", "text-slate-400");
    if (b.dataset.filter === filterName) {
      b.classList.add("active", "bg-blue-600", "text-slate-50");
      b.classList.remove("bg-slate-900", "text-slate-400");
    }
  });

  // If triggered from chart (no button click), we might need to find the button manually
  if (!btnElement) {
    const targetBtn = document.querySelector(
      `.filter-btn[data-filter="${filterName}"]`
    );
    if (targetBtn) {
      targetBtn.classList.remove("bg-slate-900", "text-slate-400");
      targetBtn.classList.add("active", "bg-blue-600", "text-slate-50");
    }
  }

  updateUI();
}

// Expose reset to global scope for the HTML button
window.resetFilters = () => triggerFilter("All");

document.addEventListener("DOMContentLoaded", () => {
  loadLedger();
  initListeners();
});
