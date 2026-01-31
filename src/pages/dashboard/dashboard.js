import "../../assets/js/common.js";
import "../../core/theme-engine.js";
import { API } from "../../core/api-client.js";

async function initDashboard() {
  try {
    const data = await API.getDashboard();

    // 1. Render the visual UI
    renderDashboard(data);

    // 2. IMPORTANT: Attach the calculator/modal listeners now that data is ready
    setupCalculatorLogic(data);
  } catch (err) {
    console.error("Dashboard Crash:", err);
    document.getElementById("wallet-status").innerText =
      "Sync Error - Check Console";
  }
}

function renderDashboard(data) {
  if (!data) {
    console.error("Integrity Failure: No data provided to renderer.");
    return;
  }

  // --- 1. CONFIGURATION ---
  const now = new Date();
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate();
  const dayOfMonth = now.getDate();

  // --- 2. TOP GAUGE (Safe-to-Spend) ---
  // Using ?? 0 to prevent "undefined" errors
  const walletRemaining = data.pool?.wallet?.remaining ?? 0;
  const walletGoal = data.pool?.wallet?.goal ?? 1; // Avoid div by zero
  const walletSpent = data.pool?.wallet?.spent ?? 0;

  const walletRemainingEl = document.getElementById("wallet-remaining");
  if (walletRemainingEl) {
    walletRemainingEl.innerText = `₹${Math.abs(
      walletRemaining
    ).toLocaleString()}`;
    walletRemainingEl.classList.toggle("text-rose-500", walletRemaining < 0);
  }

  const walletBar = document.getElementById("wallet-progress-bar");
  if (walletBar) {
    const walletProgress = (walletSpent / walletGoal) * 100;
    walletBar.style.width = `${Math.min(walletProgress, 100)}%`;
  }

  // --- 3. THE MONTHLY STORY GRID (Safe Access) ---
  // Note: The keys here must match your API output exactly
  const summary = data.summary || {};

  const setSafeText = (id, value, prefix = "₹") => {
    const el = document.getElementById(id);
    if (el) el.innerText = `${prefix}${(value ?? 0).toLocaleString()}`;
  };

  // We use data.summary.openingBalance if it exists, otherwise use 0
  setSafeText("opening-balance", summary.openingBalance);
  setSafeText("salary-received", summary.actualSalary);
  setSafeText("other-income-received", summary.otherInflow);

  // --- 4. 60/40 PLAN (Family & Shares) ---
  const fam = data.family || {};
  setSafeText("family-pending", fam.remaining, "Pending: ₹");

  const famSummaryEl = document.getElementById("family-summary");
  if (famSummaryEl) {
    famSummaryEl.innerText = `Sent: ₹${(
      fam.actual ?? 0
    ).toLocaleString()} / Goal: ₹${(fam.goal ?? 0).toLocaleString()}`;
  }

  const famProgress = document.getElementById("family-progress");
  if (famProgress) {
    famProgress.style.width = `${Math.min(
      Math.max(0, fam.progress ?? 0),
      100
    )}%`;
  }

  const shr = data.pool?.shares || {};
  const shareGoal = shr.goal ?? 1;
  const shareSpent = shr.spent ?? 0;

  const shrSummaryEl = document.getElementById("shares-summary");
  if (shrSummaryEl) {
    shrSummaryEl.innerText = `Invested: ₹${shareSpent.toLocaleString()} / Goal: ₹${shareGoal.toLocaleString()}`;
  }
  
  const shrPendingEl = document.getElementById("shares-pending");
  if (shrPendingEl) {
    shrPendingEl.innerText = `Goal: 25%`;
  }

  const shrProgress = document.getElementById("shares-progress");
  if (shrProgress) {
    shrProgress.style.width = `${Math.min(
      (shareSpent / shareGoal) * 100,
      100
    )}%`;
  }
  
  const sav = data.pool?.savings || {};
  const savingsGoal = sav.goal ?? 1;
  const savingsSpent = sav.spent ?? 0;
  
  const savSummaryEl = document.getElementById("savings-summary");
  if (savSummaryEl) {
	savSummaryEl.innerText = `Saved: ₹${savingsSpent.toLocaleString()} / Goal: ₹${savingsGoal.toLocaleString()}`;
  }
  
  const savPendingEl = document.getElementById("savings-pending");
  if (savPendingEl) {
	savPendingEl.innerText = `Goal: 25%`;
  }
  
  const savProgress = document.getElementById("savings-progress");
  if (savProgress) {
	savProgress.style.width = `${Math.min(
      (savingsSpent / savingsGoal) * 100,
      100
    )}%`;
  }

  // --- 5. WALLET BREAKDOWN ---
  setSafeText("total-available", walletGoal);
  setSafeText("total-spent", walletSpent);

  // --- 6. WEALTH & MISC ---
  setSafeText("approx-bank-balance", data.summary.approxBankBalance);
  const wealthRatioEl = document.getElementById("wealth-ratio");
  if (wealthRatioEl) {
    wealthRatioEl.innerText = data.summary.wealthToDebtRatio;
  }
  const portfolioValEl = document.getElementById("portfolio-val");
  if (portfolioValEl) {
    portfolioValEl.innerText = `₹${(
      data.pool.shares.currentPortfolio ?? 0
    ).toLocaleString()}`;
  }

  // --- 7. SPENDING BREAKDOWN ---
  renderSpendingBreakdown(data.spendingBreakdown);

  // Update Integrity Status
  const statusEl = document.getElementById("integrity-status");
  if (statusEl) {
    if (walletRemaining < 0) {
      statusEl.innerText = "POOL BLEEDING";
      statusEl.className =
        "px-3 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-500 border border-rose-500/50";
    } else {
      statusEl.innerText = "SECURE";
      statusEl.className =
        "px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-500 border border-emerald-500/50";
    }
  }
}

function renderSpendingBreakdown(breakdown) {
  const container = document.getElementById("spending-breakdown-list");
  if (!container || !breakdown) return;

  container.innerHTML = ""; // Clear old data

  const iconMap = {
    Personal: "fa-user",
    Household: "fa-store",
    Family: "fa-users",
    Savings: "fa-piggy-bank",
    Shares: "fa-chart-line",
    Uncategorized: "fa-question-circle",
  };

  for (const [category, amount] of Object.entries(breakdown)) {
    if (amount <= 0) continue; // Don't show empty categories

    const item = document.createElement("div");
    item.className =
      "flex justify-between items-center text-xs p-2 rounded-lg bg-app-bg";
    item.innerHTML = `
      <div class="flex items-center gap-3">
        <i class="fas ${
          iconMap[category] || "fa-dollar-sign"
        } text-app-muted w-4 text-center"></i>
        <span class="font-bold">${category}</span>
      </div>
      <span class="font-mono text-rose-500 font-semibold">₹${amount.toLocaleString()}</span>
    `;
    container.appendChild(item);
  }
}

// Add this inside your initDashboard or as a separate function
function setupCalculatorLogic(data) {
  const fab = document.getElementById("breakdown-fab");
  const modal = document.getElementById("breakdown-modal");
  const closeBtn = document.getElementById("close-breakdown-modal");

  if (!fab || !modal) return;

  // 1. OPEN MODAL
  fab.onclick = () => {
    populateModalData(data);
    modal.classList.add("visible");
  };

  // 2. CLOSE MODAL
  closeBtn.onclick = () => modal.classList.remove("visible");

  // Close if clicking outside the card
  modal.onclick = (e) => {
    if (e.target === modal) modal.classList.remove("visible");
  };
}

function populateModalData(data) {
  // Mapping API data to Modal IDs
  document.getElementById("bd-start-date").innerText = "01-Jan-2026"; // Or from Config
  document.getElementById(
    "bd-ob"
  ).innerText = `₹${data.summary.openingBalance.toLocaleString()}`;
  document.getElementById(
    "bd-salary-base"
  ).innerText = `₹${data.summary.actualSalary.toLocaleString()}`;

  const totalPool = data.summary.openingBalance + data.summary.actualSalary;
  document.getElementById(
    "bd-total-money"
  ).innerText = `₹${totalPool.toLocaleString()}`;

  // Allocation Math
  document.getElementById(
    "bd-family-goal"
  ).innerText = `₹${data.family.goal.toLocaleString()}`;
  document.getElementById(
    "bd-shares-goal"
  ).innerText = `₹${data.pool.shares.goal.toLocaleString()}`;
  document.getElementById(
    "bd-savings-goal"
  ).innerText = `₹${data.pool.savings.goal.toLocaleString()}`;
  document.getElementById(
    "bd-wallet-goal"
  ).innerText = `₹${data.pool.wallet.goal.toLocaleString()}`;
}

// Call this inside your existing initDashboard() after getting the data:
// setupCalculatorLogic(data);

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    if (!localStorage.theme) {
      // Only if user hasn't manually locked a theme
      if (e.matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  });
// Start the Pulse
document.addEventListener("DOMContentLoaded", initDashboard);
