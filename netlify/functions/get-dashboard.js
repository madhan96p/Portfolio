const { getAuthenticatedDoc } = require("./utils/google-auth");
const { calculateFinancials } = require("./utils/math-engine");
const { getStartDate, formatDate } = require("./utils/date-helper");

exports.handler = async (event) => {
  try {
    const doc = await getAuthenticatedDoc();
    const configSheet = doc.sheetsByTitle["Config"];
    const txSheet = doc.sheetsByTitle["Transactions"];
    const portfolioSheet = doc.sheetsByTitle["Portfolio"];

    const { range } = event.queryStringParameters || {};
    const startDate = getStartDate(range);

    const [configRows, txRows, portfolioRows] = await Promise.all([
      configSheet.getRows(),
      txSheet.getRows(),
      portfolioSheet.getRows(),
    ]);

    const filteredTxRows = startDate
      ? txRows.filter(r => new Date(r.Date) >= startDate)
      : txRows;

    const cleanTx = filteredTxRows.map((r) => ({
      Date: r.Date,
      Category: r.Category,
      Entity: r.Entity,
      Amount_DR: parseFloat(r.Amount_DR || 0),
      Amount_CR: parseFloat(r.Amount_CR || 0),
      Cycle_ID: r.Cycle_ID,
    }));

    // Inside netlify/functions/get-dashboard.js
    const cleanPortfolio = portfolioRows.map((r) => ({
      symbol: r["Share Symbol"] || "N/A", // Map "Share Symbol" to "symbol"
      units: parseFloat(r.Units || 0),
      buyPrice: parseFloat(r["Avg. Buy Price"] || 0),
      currentPrice: parseFloat(r["Current Price"] || 0),
      pnl: parseFloat(r["P&L"] || 0), // Map "P&L" to "pnl"
      totalValue: parseFloat(r["Total Value"] || 0),
    }));

    const analysis = calculateFinancials(
      configRows[0],
      cleanTx,
      cleanPortfolio
    );

    analysis.summary.cycleStartDate = configRows[0].Cycle_Start_Date;

    // Add the raw holdings for the Wealth page
    analysis.holdings = cleanPortfolio;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(analysis),
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
