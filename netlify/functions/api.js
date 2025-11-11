const { GoogleSpreadsheet } = require('google-spreadsheet');

// These will be set in your Netlify Environment Variables
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

/**
 * Helper function to authenticate and load the Google Sheet.
 */
async function getAuthenticatedDoc() {
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    await doc.useServiceAccountAuth({
        client_email: CLIENT_EMAIL,
        private_key: PRIVATE_KEY,
    });
    await doc.loadInfo();
    return doc;
}

/**
 * Helper function to read all values from the 'Config' tab.
 */
async function getConfig(doc) {
    const configSheet = doc.sheetsByTitle['Config'];
    const configRows = await configSheet.getRows();
    const config = {};
    if (configRows.length > 0) {
        const firstRow = configRows[0];
        const headers = configSheet.headerValues; 
        headers.forEach(header => {
            config[header] = firstRow[header];
        });
    }
    return config;
}

/**
 * Helper function to get all transactions and sum them by category.
 * This is the new "brain" for your dashboard.
 */
async function getTransactionTotals(doc) {
    const transactionsSheet = doc.sheetsByTitle['Transactions'];
    const rows = await transactionsSheet.getRows();

    const totals = {
        family: 0,
        shares: 0,
        savings: 0,
        expenses: 0
    };

    rows.forEach(row => {
        const amount = parseFloat(row.Amount || 0);
        switch (row.Category) {
            case 'Family Transfer':
                totals.family += amount;
                break;
            case 'Share Investment':
                totals.shares += amount;
                break;
            case 'Savings Transfer':
                totals.savings += amount;
                break;
            case 'Personal Expense':
                totals.expenses += amount;
                break;
        }
    });
    return totals;
}


// --- Main API Handler ---

exports.handler = async function (event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    let action, data;
    try {
        const body = JSON.parse(event.body);
        action = body.action;
        data = body.data;
    } catch (error) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    try {
        const doc = await getAuthenticatedDoc();
        let responseData = {};

        switch (action) {
            
            // --- ACTION 1: Get All Tracker Data (The new "Dashboard") ---
            case 'getTrackerData': {
                const config = await getConfig(doc);
                const actuals = await getTransactionTotals(doc);

                // Get master numbers
                const salary = parseFloat(config.Total_Salary || 0);
                const openingBalance = parseFloat(config.Current_Opening_Balance || 0);

                // Calculate Goals based on your "Pool" logic
                const goalFamily = salary * 0.60;
                const pool = (salary * 0.40) + openingBalance;
                
                const goalShares = pool * 0.25;  // 1/4 of the pool
                const goalSavings = pool * 0.25; // 1/4 of the pool
                const goalExpenses = pool * 0.50; // 2/4 of the pool

                const goals = { goalFamily, goalShares, goalSavings, goalExpenses };
                
                responseData = { success: true, data: { goals, actuals } };
                break;
            }

            // --- ACTION 2: Log a New Transaction (Simpler) ---
            case 'logTransaction': {
                const { amount, category, notes } = data;
                
                const transactionsSheet = doc.sheetsByTitle['Transactions'];
                await transactionsSheet.addRow({
                    Date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
                    Amount: amount,
                    Category: category,
                    Notes: notes,
                    Time_stamp: new Date().toISOString()
                });
                // We no longer need to update Config sheet here.
                // The app will just reload data.
                responseData = { success: true };
                break;
            }

            // --- ACTION 3: Run the Month-End Re-balancing ---
            case 'runMonthEnd': {
                // 1. Get current config and totals
                const config = await getConfig(doc);
                const actuals = await getTransactionTotals(doc);

                // 2. Calculate the "Expense Pot" goal
                const salary = parseFloat(config.Total_Salary || 0);
                const openingBalance = parseFloat(config.Current_Opening_Balance || 0);
                const pool = (salary * 0.40) + openingBalance;
                const goalExpenses = pool * 0.50;

                // 3. Calculate the new opening balance (leftover expense money)
                const newOpeningBalance = goalExpenses - actuals.expenses;

                // 4. Update the Config sheet for the new month
                const configSheet = doc.sheetsByTitle['Config'];
                const configRows = await configSheet.getRows();
                if (configRows.length > 0) {
                    const firstRow = configRows[0];
                    firstRow.Current_Opening_Balance = newOpeningBalance.toFixed(2);
                    firstRow.Time_stamp = new Date().toISOString();
                    // We reset these old fields just in case, but don't use them
                    firstRow.Total_Available_Spend = "0";
                    firstRow.Total_Spent_This_Month = "0";
                    await firstRow.save();
                }

                // 5. Clear the Transactions sheet for the new month
                const transactionsSheet = doc.sheetsByTitle['Transactions'];
                await transactionsSheet.clear();
                await transactionsSheet.setHeaderRow(['Date', 'Amount', 'Category', 'Notes', 'Time_stamp']);
                
                responseData = { success: true, newOpeningBalance: newOpeningBalance.toFixed(2) };
                break;
            }

            default:
                responseData = { success: false, error: 'Invalid action.' };
                break;
        }

        return { statusCode: 200, body: JSON.stringify(responseData) };

    } catch (error) {
        console.error('API Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};