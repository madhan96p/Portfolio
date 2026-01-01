const { GoogleSpreadsheet } = require('google-spreadsheet');

exports.handler = async (event, context) => {
  try {
    // 1. Authenticate using the variables you just linked
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID);
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
    await doc.loadInfo();

    // 2. Load Config (Sheet 1) and Transactions (Sheet 2)
    const configSheet = doc.sheetsByTitle['Config'];
    const transSheet = doc.sheetsByTitle['Transactions'];
    
    const configRows = await configSheet.getRows();
    const latestConfig = configRows[configRows.length - 1]; // Get latest state

    // 3. Logic Paradigm: The 60/40 Split
    const salary = parseFloat(latestConfig.Total_Salary) || 0;
    const debtRollover = parseFloat(latestConfig.Family_Debt_Rollover) || 0;
    
    // Non-Negotiable Debt Calculation
    let familyGoal = (salary * 0.60) + debtRollover; 

    // 4. Peer-to-Peer (P2P) Logic
    const transactions = await transSheet.getRows();
    let actualPaidToFamily = 0;
    let parentalInflow = 0;

    transactions.forEach(row => {
      // Check for payments made to Family
      if (row.Category === 'Family Transfer') {
        actualPaidToFamily += parseFloat(row.Amount_DR) || 0;
      }
      // "Backwards-Moving" Logic: Money from Mom/Dad increases the Goal
      if (row.Entity === 'Mom' || row.Entity === 'Dad') {
        parentalInflow += parseFloat(row.Amount_CR) || 0;
      }
    });

    const adjustedGoal = familyGoal + parentalInflow;
    const shortfall = adjustedGoal - actualPaidToFamily;

    // 5. Return the "Truth" to the Frontend
    return {
      statusCode: 200,
      body: JSON.stringify({
        salary,
        familyGoal: adjustedGoal,
        paid: actualPaidToFamily,
        shortfall: shortfall,
        progress: (actualPaidToFamily / adjustedGoal) * 100
      }),
    };
  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};