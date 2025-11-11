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
    if (!configSheet) throw new Error("Sheet 'Config' not found.");
    const configRows = await configSheet.getRows();
    const config = {};
    if (configRows.length > 0) {
        const firstRow = configRows[0];
        const headers = configSheet.headerValues; 
        headers.forEach(header => {
            config[header] = firstRow[header];
        });
    } else {
        // Default empty config if sheet is empty
        return { Total_Salary: "0", Current_Opening_Balance: "0" };
    }
    return config;
}

/**
 * Helper function to get transactions and calculate totals.
 */
async function getTransactions(doc) {
    const transactionsSheet = doc.sheetsByTitle['Transactions'];
    if (!transactionsSheet) throw new Error("Sheet 'Transactions' not found.");
    
    const rows = await transactionsSheet.getRows();
    const actuals = { family: 0, shares: 0, savings: 0, expenses: 0 };
    const history = [];

    rows.forEach(row => {
        // Calculate totals based on 'Amount_DR'
        const amount = parseFloat(row.Amount_DR || 0);
        switch (row.Category) {
            case 'Family Transfer':
                actuals.family += amount;
                break;
            case 'Share Investment':
                actuals.shares += amount;
                break;
            case 'Savings Transfer':
                actuals.savings += amount;
                break;
            case 'Personal Expense':
                actuals.expenses += amount;
                break;
        }
        
        // Add to history (new DR/CR logic)
        history.push({
            date: row.Date,
            category: row.Category,
            amount_dr: row.Amount_DR || '0',
            amount_cr: row.Amount_CR || '0',
            notes: row.Notes
        });
    });

    // Return most recent 15 transactions
    const recentHistory = history.slice(-15).reverse();
    return { actuals, history: recentHistory };
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
            
            // --- ACTION 1: Get All Tracker Data (Upgraded) ---
            case 'getTrackerData': {
                const config = await getConfig(doc);
                const { actuals, history } = await getTransactions(doc);

                const salary = parseFloat(config.Total_Salary || 0);
                const openingBalance = parseFloat(config.Current_Opening_Balance || 0);

                // Calculate Goals based on your "Pool" logic
                const goalFamily = salary * 0.60;
                const pool = (salary * 0.40) + openingBalance;
                
                const goalShares = pool * 0.25;
                const goalSavings = pool * 0.25;
                const goalExpenses = pool * 0.50;

                const goals = { goalFamily, goalShares, goalSavings, goalExpenses };
                
                responseData = { success: true, data: { config, goals, actuals, history } };
                break;
            }

            // --- ACTION 2: Log a New Transaction (Upgraded for DR/CR) ---
            case 'logTransaction': {
                const { amount, type, category, notes } = data;
                
                const transactionsSheet = doc.sheetsByTitle['Transactions'];
                const newRow = {
                    Date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
                    Category: category,
                    Amount_DR: type === 'debit' ? amount : '0',
                    Amount_CR: type === 'credit' ? amount : '0',
                    Notes: notes,
                    Time_stamp: new Date().toISOString()
                };
                
                await transactionsSheet.addRow(newRow);
                responseData = { success: true };
                break;
            }

            // --- ACTION 3: Update Salary Goal (NEW) ---
            case 'updateSalaryGoal': {
                const { newSalary } = data;
                const configSheet = doc.sheetsByTitle['Config'];
                const configRows = await configSheet.getRows();
                
                if (configRows.length > 0) {
                    const firstRow = configRows[0];
                    firstRow.Total_Salary = newSalary;
                    firstRow.Time_stamp = new Date().toISOString();
                    await firstRow.save();
                } else {
                    // If no rows, create one
                    await configSheet.addRow({ Total_Salary: newSalary, Time_stamp: new Date().toISOString() });
                }
                
                responseData = { success: true };
                break;
            }

            // --- ACTION 4: Run the Month-End Re-balancing (Upgraded) ---
            case 'runMonthEnd': {
                const config = await getConfig(doc);
                const { actuals } = await getTransactions(doc);

                const salary = parseFloat(config.Total_Salary || 0);
                const openingBalance = parseFloat(config.Current_Opening_Balance || 0);
                const pool = (salary * 0.40) + openingBalance;
                const goalExpenses = pool * 0.50;

                const newOpeningBalance = goalExpenses - actuals.expenses;

                // Update the Config sheet
                const configSheet = doc.sheetsByTitle['Config'];
                const configRows = await configSheet.getRows();
                if (configRows.length > 0) {
                    const firstRow = configRows[0];
                    firstRow.Current_Opening_Balance = newOpeningBalance.toFixed(2);
                    firstRow.Time_stamp = new Date().toISOString();
                    await firstRow.save();
                }

                // Clear the Transactions sheet
                const transactionsSheet = doc.sheetsByTitle['Transactions'];
                await transactionsSheet.clear();
                await transactionsSheet.setHeaderRow(['Date', 'Category', 'Amount_DR', 'Amount_CR', 'Notes', 'Time_stamp']);
                
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