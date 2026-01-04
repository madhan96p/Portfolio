/**
 * THE HIGH-INTEGRITY MATH ENGINE
 * Enforces the 60/40 Split and Backwards-Debt Logic
 */
const calculateFinancials = (config, transactions, portfolio) => {
  // 1. Identify Actual Salary (Transactions, not Config)
  const actualSalary = transactions
    .filter((t) => t.Category === "Salary")
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
  const familyRemainingDebt = familyGoal - familyNetActual;

  // 3. The Pool (40% + Opening Balance)
  const openingBalance = parseFloat(config.Current_Opening_Balance || 0);
  const poolTotal = actualSalary * 0.4 + openingBalance;

  // Sub-Pools
  const walletGoal = poolTotal * 0.5;
  const savingsGoal = poolTotal * 0.25;
  const sharesGoal = poolTotal * 0.25;

  // Actual Lifestyle Spending
  const lifestyleSpent = transactions
    .filter(
      (t) =>
        t.Category === "Personal Spending" ||
        t.Category === "Household Spending"
    )
    .reduce((sum, t) => sum + parseFloat(t.Amount_DR || 0), 0);

  // 4. Portfolio Integrity
  const totalPortfolioValue = portfolio.reduce((sum, p) => {
    const price = parseFloat(p.currentPrice) || parseFloat(p.buyPrice) || 0;
    return sum + parseFloat(p.units) * price;
  }, 0);

  return {
    summary: {
      actualSalary,
      wealthToDebtRatio:
        debtRollover > 0
          ? (totalPortfolioValue / debtRollover).toFixed(2)
          : "∞",
      netLiquidity:
        openingBalance + actualSalary - (lifestyleSpent + familySent),
    },
    family: {
      goal: familyGoal,
      actual: familyNetActual,
      progress: ((familyNetActual / familyGoal) * 100).toFixed(1),
      remaining: familyRemainingDebt,
    },
    pool: {
      total: poolTotal,
      wallet: {
        goal: walletGoal,
        spent: lifestyleSpent,
        remaining: walletGoal - lifestyleSpent,
      },
      savings: { goal: savingsGoal },
      shares: { goal: sharesGoal, currentPortfolio: totalPortfolioValue },
    },
  };
};

module.exports = { calculateFinancials };
