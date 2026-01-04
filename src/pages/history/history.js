import { API } from "../../core/api-client.js";

let allTransactions = [];

async function loadLedger() {
  try {
    const response = await fetch("/api/get-transactions");
    allTransactions = await response.json();
    renderLedger(allTransactions);
  } catch (err) {
    console.error("Ledger Load Failed", err);
  }
}
function renderLedger(txns) {
  const list = document.getElementById("ledger-list");
  document.getElementById("tx-count").innerText = `${txns.length} TXNS`;

  if (txns.length === 0) {
    list.innerHTML = `<div class="p-10 text-center text-slate-500 text-sm">No transactions found matching your criteria.</div>`;
    return;
  }

  list.innerHTML = txns
    .map((t) => {
      const isDebit = t.amountDR > 0;
      const amount = isDebit ? t.amountDR : t.amountCR;
      const colorClass = isDebit ? "text-rose-400" : "text-emerald-400";
      const prefix = isDebit ? "-" : "+";

      // Fix 1: Format Date (e.g., "Oct 24")
      const dateObj = new Date(t.date);
      const dateStr = dateObj.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
      });

      return `
            <div class="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex justify-between items-center gap-3">
                <div class="flex flex-col min-w-0 flex-1">
                    <span class="text-[10px] text-slate-500 font-mono uppercase flex items-center gap-1">
                        <span>${dateStr}</span>
                        <span class="w-1 h-1 bg-slate-700 rounded-full"></span>
                        <span class="truncate">${t.category}</span>
                    </span>
                    
                    <span class="font-bold text-sm text-slate-200 tracking-tight truncate">${
                      t.entity
                    }</span>
                    
                    <span class="text-[11px] text-slate-400 italic truncate opacity-80">
                        ${t.notes || t.subCategory || "No notes"}
                    </span>
                </div>

                <div class="text-right shrink-0">
                    <div class="font-black ${colorClass} text-sm">
                        ${prefix}₹${amount.toLocaleString("en-IN")}
                    </div>
                    <div class="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">
                        ${t.mode}
                    </div>
                </div>
            </div>
        `;
    })
    .join("");
}

// Global State to track active filters
let state = {
  filter: "All",
  search: "",
};

function initEventListeners() {
  // 1. Handle Search Input
  document.getElementById("ledger-search").addEventListener("input", (e) => {
    state.search = e.target.value.toLowerCase();
    applyFilters();
  });

  // 2. Handle Filter Pills
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      // UI: Update Active State (Visuals)
      document.querySelectorAll(".filter-btn").forEach((b) => {
        b.classList.remove("bg-blue-600", "text-slate-50", "active"); // Remove active styles
        b.classList.add("bg-slate-900", "text-slate-400"); // Reset to inactive
      });

      // Set clicked button to active
      e.target.classList.remove("bg-slate-900", "text-slate-400");
      e.target.classList.add("bg-blue-600", "text-slate-50", "active");

      // Logic: Update State
      state.filter = e.target.getAttribute("data-filter");
      applyFilters();
    });
  });
}

function applyFilters() {
  const filtered = allTransactions.filter((t) => {
    // 1. Check Category (Exact Match or 'All')
    const matchesCategory =
      state.filter === "All" || t.category === state.filter;

    // 2. Check Search (Entity, Notes, or Amount)
    const matchesSearch =
      t.entity.toLowerCase().includes(state.search) ||
      (t.notes && t.notes.toLowerCase().includes(state.search)) ||
      t.amountDR.toString().includes(state.search) ||
      t.amountCR.toString().includes(state.search);

    return matchesCategory && matchesSearch;
  });

  renderLedger(filtered);
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadLedger();
  initEventListeners();
});
