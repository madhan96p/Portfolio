import "../../assets/js/common.js";
import "../../core/theme-engine.js";
import { API } from "../../core/api-client.js";

let allTransactions = [];
let filteredTransactions = [];
let doughnutChart = null;
let trendChart = null;

// State
let state = {
  filter: "All",
  search: "",
  timeFrame: "ALL", // 1D, 1W, 1M, ALL
  page: 1,
  limit: 10,
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
  return "fa-wallet text-app-sub";
};

const getThemeColors = () => {
  const styles = getComputedStyle(document.documentElement);
  return {
    accent: styles.getPropertyValue("--accent-blue").trim(),
    text: styles.getPropertyValue("--text-main").trim(),
    sub: styles.getPropertyValue("--text-sub").trim(),
    border: styles.getPropertyValue("--border-main").trim(),
  };
};

const hexToRgba = (hex, alpha = 1) => {
  const [r, g, b] = hex.match(/\w\w/g).map((x) => parseInt(x, 16));
  return `rgba(${r},${g},${b},${alpha})`;
};

async function loadLedger() {
  try {
    // Replace this with your actual API call
    const response = await fetch("/api/get-transactions");
    allTransactions = await response.json();

    // Initial Render
    applyFilters();
  } catch (err) {
    console.error("Load Failed", err);
    document.getElementById("net-position").innerText = "Error";
  }
}

// 🧠 CORE LOGIC
function applyFilters() {
  // 1. Time Filter
  const now = new Date();
  const timeLimit = new Date();

  if (state.timeFrame === "1D") timeLimit.setDate(now.getDate() - 1);
  if (state.timeFrame === "1W") timeLimit.setDate(now.getDate() - 7);
  if (state.timeFrame === "1M") timeLimit.setDate(now.getDate() - 30);
  if (state.timeFrame === "ALL") timeLimit.setFullYear(2000);

  // 2. Filter Logic
  filteredTransactions = allTransactions.filter((t) => {
    const tDate = new Date(t.date);
    const inTime = tDate >= timeLimit;

    const matchesCat = state.filter === "All" || t.category === state.filter;
    const searchStr = (t.entity + t.notes).toLowerCase();
    const matchesSearch = searchStr.includes(state.search);

    return inTime && matchesCat && matchesSearch;
  });

  state.page = 1; // Reset pagination

  // 3. Update ALL UI Components
  renderCharts(filteredTransactions);
  renderTotalExpense(filteredTransactions);
  renderNetPosition(filteredTransactions); // <--- ADDED THIS
  renderList(true);
}

// 💰 1. UPDATE HEADER NET POSITION (The Fix)
function renderNetPosition(txns) {
  const income = txns.reduce((sum, t) => sum + (t.amountCR || 0), 0);
  const expense = txns.reduce((sum, t) => sum + (t.amountDR || 0), 0);
  const net = income - expense;

  const el = document.getElementById("net-position");
  const colorClass = net >= 0 ? "text-emerald-400" : "text-rose-400";
  const sign = net >= 0 ? "+" : "-";

  // Render HTML inside the span
  el.innerHTML = `<span class="${colorClass} font-bold">${sign}₹${Math.abs(
    net
  ).toLocaleString("en-IN")}</span>`;
}

// 💰 2. UPDATE CHART CARD TOTAL
function renderTotalExpense(txns) {
  const totalExp = txns.reduce((sum, t) => sum + (t.amountDR || 0), 0);
  document.getElementById(
    "chart-total-expense"
  ).innerText = `₹${totalExp.toLocaleString("en-IN")}`;
}

// 📊 3. RENDER CHARTS
function renderCharts(txns) {
  const themeColors = getThemeColors();

  // Doughnut Data
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
            themeColors.accent,
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
      cutout: "70%",
    },
  });

  // Trend Data
  const dateTotals = {};
  txns.forEach((t) => {
    if (t.amountDR > 0) {
      const d = t.date.split("T")[0];
      dateTotals[d] = (dateTotals[d] || 0) + t.amountDR;
    }
  });

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
          data: trendData,
          borderColor: themeColors.accent,
          backgroundColor: hexToRgba(themeColors.accent, 0.1),
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointBackgroundColor: themeColors.accent,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false, grid: { color: themeColors.border } },
        y: { display: false, grid: { color: themeColors.border } },
      },
    },
  });
}

// 📜 4. RENDER LIST
function renderList(reset = false) {
  const list = document.getElementById("ledger-list");
  const loadBtn = document.getElementById("load-more-btn");

  if (reset) list.innerHTML = "";

  const start = 0;
  const end = state.page * state.limit;
  const visibleTxns = filteredTransactions.slice(start, end);

  if (visibleTxns.length === 0) {
    list.innerHTML = `<div class="text-center text-slate-500 py-10">No transactions found</div>`;
    loadBtn.classList.add("hidden");
    return;
  }

  const grouped = visibleTxns.reduce((acc, t) => {
    const date = t.date.split("T")[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(t);
    return acc;
  }, {});

  list.innerHTML = Object.keys(grouped)
    .map((date) => {
      const dayTxns = grouped[date];
      const dayTotal = dayTxns.reduce((sum, t) => sum + (t.amountDR || 0), 0);

      let html = `
            <div class="sticky top-[72px] bg-app-bg/90 backdrop-blur z-10 py-2 px-2 flex justify-between items-end border-b border-app-border mb-2">
                <span class="text-[11px] font-bold text-app-sub uppercase tracking-widest">${new Date(
                  date
                ).toDateString()}</span>
                <span class="text-[10px] text-app-muted font-mono">Total: -₹${dayTotal.toLocaleString(
                  "en-IN"
                )}</span>
            </div>
        `;

      html += dayTxns
        .map((t) => {
          const isDebit = t.amountDR > 0;
          const amount = isDebit ? t.amountDR : t.amountCR;
          const colorClass = isDebit ? "text-rose-400" : "text-emerald-400";
          const prefix = isDebit ? "-" : "+";

          return `
                <div class="flex items-center gap-3 p-3 mb-2 bg-app-card border border-app-border rounded-xl">
                    <div class="w-8 h-8 rounded-full bg-app-input border border-app-border flex items-center justify-center shrink-0">
                        <i class="fas ${getIcon(
                          t.category,
                          t.entity
                        )} text-xs"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between">
                            <h3 class="text-xs font-bold text-app-text truncate">${
                              t.entity
                            }</h3>
                            <span class="${colorClass} text-xs font-bold">${prefix}₹${amount.toLocaleString(
            "en-IN"
          )}</span>
                        </div>
                        <div class="text-[10px] text-app-muted truncate">${
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

  if (end < filteredTransactions.length) {
    loadBtn.classList.remove("hidden");
    loadBtn.innerText = `Load More (${
      filteredTransactions.length - end
    } remaining)`;
  } else {
    loadBtn.classList.add("hidden");
  }
}

// 🎮 EVENTS
function initListeners() {
  document.getElementById("ledger-search").addEventListener("input", (e) => {
    state.search = e.target.value.toLowerCase();
    applyFilters();
  });

  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".filter-btn").forEach((b) => {
        b.classList.remove("bg-app-accent", "text-app-text", "active");
        b.classList.add("bg-app-card", "text-app-sub");
      });
      e.target.classList.remove("bg-app-card", "text-app-sub");
      e.target.classList.add("bg-app-accent", "text-app-text", "active");
      state.filter = e.target.dataset.filter;
      applyFilters();
    });
  });

  document.querySelectorAll(".time-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".time-btn").forEach((b) => {
        b.classList.remove("bg-app-accent", "text-app-text");
        b.classList.add("text-app-sub");
      });
      e.target.classList.remove("text-app-sub");
      e.target.classList.add("bg-app-accent", "text-app-text", "rounded");
      state.timeFrame = e.target.dataset.time;
      applyFilters();
    });
  });

  document.getElementById("load-more-btn").addEventListener("click", () => {
    state.page++;
    renderList(false);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadLedger();
  initListeners();

  window.addEventListener("theme-changed", () => {
    // Re-render charts with current data to apply new theme colors
    renderCharts(filteredTransactions);
  });
});
