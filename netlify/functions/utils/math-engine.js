/**
 * THE HIGH-INTEGRITY MATH ENGINE
 * Enforces the 60/40 Split and Backwards-Debt Logic
 */
const calculateFinancials = (config, transactions, portfolio) => {
  // 1. Identify Actual Salary (Transactions, not Config)
  const actualSalary = transactions
    .filter((t) => t.Category === "Salary")
    .reduce((sum, t) => sum + parseFloat(t.Amount_CR || 0), 0);

  const otherInflow = transactions
    .filter((t) => t.Category === "Other Income")
    .reduce((sum, t) => sum + parseFloat(t.Amount_CR || 0), 0);

  // 2. Family Commitment (60%) Logic
  const debtRollover = parseFloat(config.Family_Debt_Rollover || 0);
  const familyGoal = actualSalary * 0.6 + debtRollover;

  // Family Actual (Net): Sent - Borrowed (Mom/Dad)
  const familySent = transactions
    .filter((t) => t.Category === "Family Support")
    .reduce((sum, t) => sum + parseFloat(t.Amount_DR || 0), 0);

  const familyBorrowed = transactions
    .filter(
      (t) =>
        t.Category === "Family Support" &&
        (t.Entity.includes("Mom") || t.Entity.includes("Dad"))
    )
    .reduce((sum, t) => sum + parseFloat(t.Amount_CR || 0), 0);

  const familyNetActual = familySent - familyBorrowed;
  // New "backwards" goal - it GROWS with debt
  const newFamilyGoal = familyGoal + familyBorrowed;
  const familyRemainingDebt = newFamilyGoal - familyNetActual;

  // 3. The Pool (40% + Opening Balance)
  const openingBalance = parseFloat(config.Current_Opening_Balance || 0);
  const poolTotal = actualSalary * 0.4 + openingBalance + otherInflow;

  // Sub-Pools
  const walletGoal = poolTotal * 0.5;
  const savingsGoal = poolTotal * 0.25;
  const sharesGoal = poolTotal * 0.25;

  // Actuals
  const personalSpent = transactions
    .filter((t) => t.Category === "Personal Spending")
    .reduce((sum, t) => sum + parseFloat(t.Amount_DR || 0), 0);
  const householdSpent = transactions
    .filter((t) => t.Category === "Household Spending")
    .reduce((sum, t) => sum + parseFloat(t.Amount_DR || 0), 0);
  const savingsSpent = transactions
    .filter((t) => t.Category === "Savings")
    .reduce((sum, t) => sum + parseFloat(t.Amount_DR || 0), 0);
  const sharesSpent = transactions
    .filter((t) => t.Category === "Shares")
    .reduce((sum, t) => sum + parseFloat(t.Amount_DR || 0), 0);
    
  const lifestyleSpent = personalSpent + householdSpent;

  // Approx Bank Balance
  const approxBankBalance =
    walletGoal -
    lifestyleSpent +
    (savingsGoal - savingsSpent) +
    (sharesGoal - sharesSpent);

  // 4. Portfolio Integrity & Spending Breakdown
  const totalPortfolioValue = portfolio.reduce((sum, p) => {
    const price = parseFloat(p.currentPrice) || parseFloat(p.buyPrice) || 0;
    return sum + parseFloat(p.units) * price;
  }, 0);
  
  // Create a map of all spending
  const spendingBreakdown = new Map();
  spendingBreakdown.set("Personal", personalSpent);
  spendingBreakdown.set("Household", householdSpent);
  spendingBreakdown.set("Family", familySent); // Gross, not net
  spendingBreakdown.set("Savings", savingsSpent);
  spendingBreakdown.set("Shares", sharesSpent);
  
  // Find any other spending
  const knownCats = ["Personal Spending", "Household Spending", "Family Support", "Savings", "Shares", "Salary"];
  const uncategorizedSpent = transactions
      .filter(t => !knownCats.includes(t.Category) && parseFloat(t.Amount_DR || 0) > 0)
      .reduce((sum, t) => sum + parseFloat(t.Amount_DR || 0), 0);
  if(uncategorizedSpent > 0) spendingBreakdown.set("Uncategorized", uncategorizedSpent);


  return {
    summary: {
      openingBalance,
      otherInflow,
      actualSalary,
      approxBankBalance,
      wealthToDebtRatio:
        debtRollover > 0
          ? (totalPortfolioValue / debtRollover).toFixed(2)
          : "∞",
      netLiquidity:
        openingBalance + actualSalary - (lifestyleSpent + familySent),
    },
    family: {
      goal: newFamilyGoal, // Use the new goal
      actual: familyNetActual,
      progress: ((familyNetActual / newFamilyGoal) * 100).toFixed(1),
      remaining: familyRemainingDebt,
    },
    pool: {
      total: poolTotal,
      wallet: {
        goal: walletGoal,
        spent: lifestyleSpent,
        remaining: walletGoal - lifestyleSpent,
      },
      savings: { goal: savingsGoal, spent: savingsSpent },
      shares: {
        goal: sharesGoal,
        spent: sharesSpent,
        currentPortfolio: totalPortfolioValue,
      },
    },
    spendingBreakdown: Object.fromEntries(spendingBreakdown)
  };
};

module.exports = { calculateFinancials };

