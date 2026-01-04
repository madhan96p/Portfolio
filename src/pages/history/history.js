import { API } from "../../core/api-client.js";

let allTransactions = [];
let filteredTransactions = []; // Store filtered result globally
let doughnutChart = null;
let trendChart = null;

// State
let state = {
  filter: "All",
  search: "",
  timeFrame: "ALL", // 1D, 1W, 1M, ALL
  page: 1,
  limit: 10, // Show 10 items initially to prevent crash
};

const getIcon = (category, entity) => {
  const text = (category + entity).toLowerCase();
  if (text.includes("food") || text.includes("zomato"))
    return "fa-utensils text-orange-400";
  if (text.includes("uber") || text.includes("fuel"))
    return "fa-car text-blue-400";
  if (text.includes("family")) return "fa-home text-pink-400";
  if (text.includes("share") || text.includes("sip"))
    return "fa-arrow-trend-up text-emerald-400";
  return "fa-wallet text-slate-400";
};

async function loadLedger() {
  try {
    // Fetch Real Data (Replace with API call)
    const response = await fetch("/api/get-transactions");
    allTransactions = await response.json();

    // Initial Render
    applyFilters();
  } catch (err) {
    console.error("Load Failed", err);
  }
}

// 🧠 FILTER & TIME LOGIC
function applyFilters() {
  // 1. Time Filter Logic
  const now = new Date();
  const timeLimit = new Date();

  if (state.timeFrame === "1D") timeLimit.setDate(now.getDate() - 1);
  if (state.timeFrame === "1W") timeLimit.setDate(now.getDate() - 7);
  if (state.timeFrame === "1M") timeLimit.setDate(now.getDate() - 30);
  if (state.timeFrame === "ALL") timeLimit.setFullYear(2000); // Way back

  // 2. Filter Array
  filteredTransactions = allTransactions.filter((t) => {
    const tDate = new Date(t.date);
    const inTime = tDate >= timeLimit;

    const matchesCat = state.filter === "All" || t.category === state.filter;
    const searchStr = (t.entity + t.notes).toLowerCase();
    const matchesSearch = searchStr.includes(state.search);

    return inTime && matchesCat && matchesSearch;
  });

  // 3. Reset Pagination on Filter Change
  state.page = 1;

  // 4. Update UI Components
  renderCharts(filteredTransactions);
  renderTotalExpense(filteredTransactions);
  renderList(true); // true = reset list
}

// 💰 TOTAL EXPENSE DISPLAY
function renderTotalExpense(txns) {
  const totalExp = txns.reduce((sum, t) => sum + (t.amountDR || 0), 0);
  document.getElementById(
    "chart-total-expense"
  ).innerText = `₹${totalExp.toLocaleString("en-IN")}`;
}

// 📊 DUAL CHART RENDERER
function renderCharts(txns) {
  // --- Chart 1: Category Breakdown (Doughnut) ---
  const catTotals = {};
  txns.forEach((t) => {
    if (t.amountDR > 0)
      catTotals[t.category] = (catTotals[t.category] || 0) + t.amountDR;
  });

  if (doughnutChart) doughnutChart.destroy();
  doughnutChart = new Chart(document.getElementById("expenseChart"), {
    type: "doughnut",
    data: {
      labels: Object.keys(catTotals),
      datasets: [
        {
          data: Object.values(catTotals),
          backgroundColor: [
            "#3b82f6",
            "#ec4899",
            "#10b981",
            "#f59e0b",
            "#6366f1",
          ],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
    },
  });

  // --- Chart 2: Time Trend (Line) ---
  const dateTotals = {};
  txns.forEach((t) => {
    if (t.amountDR > 0) {
      // Group by Date (YYYY-MM-DD)
      const d = t.date.split("T")[0];
      dateTotals[d] = (dateTotals[d] || 0) + t.amountDR;
    }
  });

  // Sort dates
  const sortedDates = Object.keys(dateTotals).sort();
  const trendData = sortedDates.map((d) => dateTotals[d]);

  if (trendChart) trendChart.destroy();
  trendChart = new Chart(document.getElementById("trendChart"), {
    type: "line",
    data: {
      labels: sortedDates.map((d) =>
        new Date(d).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        })
      ),
      datasets: [
        {
          label: "Expense",
          data: trendData,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          fill: true,
          tension: 0.4,
          pointRadius: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: { display: false }, // Minimal look
      },
    },
  });
}

// 📜 LIST RENDERER (With Pagination)
function renderList(reset = false) {
  const list = document.getElementById("ledger-list");
  const loadBtn = document.getElementById("load-more-btn");

  if (reset) list.innerHTML = "";

  // Slice Data for Pagination
  const start = 0;
  const end = state.page * state.limit;
  const visibleTxns = filteredTransactions.slice(start, end);

  // Render Logic (Same as before but using visibleTxns)
  if (visibleTxns.length === 0) {
    list.innerHTML = `<div class="text-center text-slate-500 py-10">No transactions found</div>`;
    loadBtn.classList.add("hidden");
    return;
  }

  // Grouping Logic
  const grouped = visibleTxns.reduce((acc, t) => {
    const date = t.date.split("T")[0]; // Simple date key
    if (!acc[date]) acc[date] = [];
    acc[date].push(t);
    return acc;
  }, {});

  list.innerHTML = Object.keys(grouped)
    .map((date) => {
      const dayTxns = grouped[date];
      const dayTotal = dayTxns.reduce((sum, t) => sum + (t.amountDR || 0), 0);

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

      html += dayTxns
        .map((t) => {
          const isDebit = t.amountDR > 0;
          const amount = isDebit ? t.amountDR : t.amountCR;
          const colorClass = isDebit ? "text-rose-400" : "text-emerald-400";

          return `
                <div class="flex items-center gap-3 p-3 mb-2 bg-slate-900 border border-slate-800 rounded-xl">
                    <div class="w-8 h-8 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                        <i class="fas ${getIcon(
                          t.category,
                          t.entity
                        )} text-xs"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between">
                            <h3 class="text-xs font-bold text-slate-200 truncate">${
                              t.entity
                            }</h3>
                            <span class="${colorClass} text-xs font-bold">${
            isDebit ? "-" : "+"
          }₹${amount}</span>
                        </div>
                        <div class="text-[10px] text-slate-500 truncate">${
                          t.notes || t.category
                        }</div>
                    </div>
                </div>
            `;
        })
        .join("");
      return `<div class="mb-4">${html}</div>`;
    })
    .join("");

  // Handle Load More Button Visibility
  if (end < filteredTransactions.length) {
    loadBtn.classList.remove("hidden");
    loadBtn.innerText = `Load More (${
      filteredTransactions.length - end
    } remaining)`;
  } else {
    loadBtn.classList.add("hidden");
  }
}

// 🎮 EVENT LISTENERS
function initListeners() {
  // 1. Search
  document.getElementById("ledger-search").addEventListener("input", (e) => {
    state.search = e.target.value.toLowerCase();
    applyFilters();
  });

  // 2. Filters (Category)
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      // Visual Update
      document.querySelectorAll(".filter-btn").forEach((b) => {
        b.classList.remove("bg-blue-600", "text-slate-50", "active");
        b.classList.add("bg-slate-900", "text-slate-400");
      });
      e.target.classList.remove("bg-slate-900", "text-slate-400");
      e.target.classList.add("bg-blue-600", "text-slate-50", "active");

      // Logic
      state.filter = e.target.dataset.filter;
      applyFilters();
    });
  });

  // 3. Time Filters (1D, 1W...)
  document.querySelectorAll(".time-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      // Visual Update
      document.querySelectorAll(".time-btn").forEach((b) => {
        b.classList.remove("bg-blue-600", "text-white");
        b.classList.add("text-slate-400");
      });
      e.target.classList.remove("text-slate-400");
      e.target.classList.add("bg-blue-600", "text-white", "rounded");

      // Logic
      state.timeFrame = e.target.dataset.time;
      applyFilters();
    });
  });

  // 4. Load More
  document.getElementById("load-more-btn").addEventListener("click", () => {
    state.page++;
    renderList(false); // false = append, don't clear
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadLedger();
  initListeners();
});
