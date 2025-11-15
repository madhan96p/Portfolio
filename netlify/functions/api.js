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
 * --- CHANGED ---
 * Helper function to get transactions *for the current month only*.
 */
async function getTransactions(doc) {
    const transactionsSheet = doc.sheetsByTitle['Transactions'];
    if (!transactionsSheet) throw new Error("Sheet 'Transactions' not found.");
    
    const rows = await transactionsSheet.getRows();
    const actuals = { family: 0, shares: 0, savings: 0, expenses: 0 };
    const history = [];

    // Get current year and month to filter
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0 = January, 11 = December

    rows.forEach(row => {
        // --- NEW: Date Filtering Logic ---
        // GSheet might return dates as strings; parse them reliably.
        const rowDate = new Date(row.Date);
        if (rowDate.getFullYear() !== currentYear || rowDate.getMonth() !== currentMonth) {
            return; // Skip this row, it's not from the current month
        }
        // --- END: Date Filtering Logic ---

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

    // Return most recent 15 transactions *from this month*
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
            
            // --- ACTION 1: Get All Tracker Data (Now filters by month) ---
            case 'getTrackerData': {
                const config = await getConfig(doc);
                // --- CHANGED: This now only gets CURRENT MONTH data ---
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

            // --- ACTION 2: Log a New Transaction (Upgraded with new fields) ---
            case 'logTransaction': {
                // --- CHANGED: Added transactionDate & paymentMode ---
                const { amount, type, category, notes, transactionDate, paymentMode } = data;
                
                if (!transactionDate) {
                    throw new Error("Transaction date is required.");
                }

                const transactionsSheet = doc.sheetsByTitle['Transactions'];
                const newRow = {
                    Date: transactionDate, // --- CHANGED: Uses date from frontend
                    Category: category,
                    Amount_DR: type === 'debit' ? amount : '0',
                    Amount_CR: type === 'credit' ? amount : '0',
                    Notes: notes,
                    Payment_Mode: paymentMode, // --- ADDED ---
                    Time_stamp: new Date().toISOString()
                };
                
                await transactionsSheet.addRow(newRow);
                responseData = { success: true };
                break;
            }

            // --- ACTION 3: Update Salary Goal (No change) ---
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
                    await configSheet.addRow({ Total_Salary: newSalary, Time_stamp: new Date().toISOString() });
                }
                
                responseData = { success: true };
                break;
            }

            // --- ACTION 4: Run the Month-End (CHANGED: NO LONGER DELETES) ---
            case 'runMonthEnd': {
                const config = await getConfig(doc);
                // --- CHANGED: This gets *current month* totals to calculate rollover ---
                const { actuals } = await getTransactions(doc);

                const salary = parseFloat(config.Total_Salary || 0);
                const openingBalance = parseFloat(config.Current_Opening_Balance || 0);
                const pool = (salary * 0.40) + openingBalance;
                const goalExpenses = pool * 0.50;

                // This is the rollover
                const newOpeningBalance = goalExpenses - actuals.expenses;

                // Update the Config sheet for the *next* month
                const configSheet = doc.sheetsByTitle['Config'];
                const configRows = await configSheet.getRows();
                if (configRows.length > 0) {
                    const firstRow = configRows[0];
                    firstRow.Current_Opening_Balance = newOpeningBalance.toFixed(2);
                    firstRow.Time_stamp = new Date().toISOString();
                    await firstRow.save();
                }

                // --- REMOVED ---
                // We no longer clear the transactions sheet.
                // It is now a permanent archive.
                
                responseData = { success: true, newOpeningBalance: newOpeningBalance.toFixed(2) };
                break;
            }

            // --- ACTION 5: Get All Document Data (NEW) ---
            case 'getDocumentData': {
                const docSheet = doc.sheetsByTitle['Documents'];
                if (!docSheet) throw new Error("Sheet 'Documents' not found.");
                
                const rows = await docSheet.getRows();
                const documents = rows.map(row => ({
                    fullName: row.Full_Name,
                    docType: row.Document_Type,
                    docNumber: row.Document_Number,
                    issued: row.Issued_Date,
                    expiry: row.Expiry_Date,
                    link: row.Drive_Link
                }));
                
                responseData = { success: true, data: documents };
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