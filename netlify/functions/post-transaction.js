const { getAuthenticatedDoc } = require("./utils/google-auth");
const { getCurrentCycle } = require("./utils/date-helper");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST")
    return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const data = JSON.parse(event.body);
    const doc = await getAuthenticatedDoc();

    // 1. Write to Transactions Sheet
    const txSheet = doc.sheetsByTitle["Transactions"];
    const newTx = {
      Date: data.date, // Use the user's selected date
      Category: data.category,
      "Sub-Category": data.subCategory,
      Amount_DR: data.category === "Salary" ? 0 : data.amount,
      Amount_CR: data.category === "Salary" ? data.amount : 0,
      Entity: data.entity,
      Notes: data.notes,
      Payment_Mode: data.mode, // Now using the dropdown value
      Cycle_ID: getCurrentCycle(new Date(data.date)), // Detect cycle based on TX date
    };
    await txSheet.addRow(newTx);

    // 2. THE DUAL-WRITE RULE: Update Portfolio
    if (data.category === "Share Investment" && data.symbol) {
      const portfolioSheet = doc.sheetsByTitle["Portfolio"];
      await portfolioSheet.addRow({
        "Date Invested": newTx.Date,
        "Share Symbol": data.symbol,
        Units: data.units,
        "Avg. Buy Price": data.amount / data.units,
        "Total Value": data.amount,
      });
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
