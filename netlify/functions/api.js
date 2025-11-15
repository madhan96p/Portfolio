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
    
    if (configRows.length > 0) {
        // Return the first (and only) row's data
        return configRows[0];
    } else {
        // Default empty config if sheet is empty
        return { Total_Salary: "0", Current_Opening_Balance: "0" };
    }
}

/**
 * --- UPGRADED ---
 * Helper function to get transactions *for the current month only*.
 * Now calculates both DEBIT and CREDIT totals.
 */
async function getTransactions(doc) {
    const transactionsSheet = doc.sheetsByTitle['Transactions'];
    if (!transactionsSheet) throw new Error("Sheet 'Transactions' not found.");
    
    const rows = await transactionsSheet.getRows();
    
    // Split into two objects for clarity
    const debitActuals = { family: 0, shares: 0, savings: 0, expenses: 0 };
    const creditActuals = { salary: 0, otherIncome: 0 };
    
    const history = [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0 = January, 11 = December

    rows.forEach(row => {
        const rowDate = new Date(row.Date);
        if (rowDate.getFullYear() !== currentYear || rowDate.getMonth() !== currentMonth) {
            return; // Skip: not from the current month
        }

        // --- Calculate DEBITS (Amount_DR) ---
        const amount_dr = parseFloat(row.Amount_DR || 0);
        if (amount_dr > 0) {
            switch (row.Category) {
                case 'Family Transfer':
                    debitActuals.family += amount_dr;
                    break;
                case 'Share Investment':
                    debitActuals.shares += amount_dr;
                    break;
                case 'Savings Transfer':
                    debitActuals.savings += amount_dr;
                    break;
                case 'Personal Expense':
                    debitActuals.expenses += amount_dr;
                    break;
            }
        }

        // --- Calculate CREDITS (Amount_CR) ---
        const amount_cr = parseFloat(row.Amount_CR || 0);
        if (amount_cr > 0) {
            switch (row.Category) {
                case 'Salary':
                    creditActuals.salary += amount_cr;
                    break;
                case 'Gift / From Friend':
                case 'Other Income':
                    creditActuals.otherIncome += amount_cr;
                    break;
            }
        }
        
        // Add to history
        history.push({
            date: row.Date,
            category: row.Category,
            amount_dr: row.Amount_DR || '0',
            amount_cr: row.Amount_CR || '0',
            notes: row.Notes
        });
    });

    const recentHistory = history.slice(-15).reverse();
    return { debitActuals, creditActuals, history: recentHistory };
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
            
            // --- ACTION 1: Get All Tracker Data (Live Calculations) ---
            case 'getTrackerData': {
                const config = await getConfig(doc);
                // This now gets { debitActuals, creditActuals, history }
                const { debitActuals, history } = await getTransactions(doc); 

                const salary = parseFloat(config.Total_Salary || 0);
                const openingBalance = parseFloat(config.Current_Opening_Balance || 0);

                // Goals are calculated "live" based on config
                const goalFamily = salary * 0.60;
                const pool = (salary * 0.40) + openingBalance;
                const goalShares = pool * 0.25;
                const goalSavings = pool * 0.25;
                const goalExpenses = pool * 0.50;

                const goals = { goalFamily, goalShares, goalSavings, goalExpenses };
                
                // We pass debitActuals as 'actuals' to the frontend
                responseData = { success: true, data: { config, goals, actuals: debitActuals, history } };
                break;
            }

            // --- ACTION 2: Log a New Transaction (No change) ---
            case 'logTransaction': {
                const { amount, type, category, notes, transactionDate, paymentMode } = data;
                
                if (!transactionDate) {
                    throw new Error("Transaction date is required.");
                }

                const transactionsSheet = doc.sheetsByTitle['Transactions'];
                const newRow = {
                    Date: transactionDate,
                    Category: category,
                    Amount_DR: type === 'debit' ? amount : '0',
                    Amount_CR: type === 'credit' ? amount : '0',
                    Notes: notes,
                    Payment_Mode: paymentMode,
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
                    // This should not happen, but as a fallback
                    await configSheet.addRow({ Total_Salary: newSalary, Time_stamp: new Date().toISOString() });
                }
                
                responseData = { success: true };
                break;
            }

            // --- ACTION 4: Run the Month-End (HEAVILY UPGRADED) ---
            case 'runMonthEnd': {
                const config = await getConfig(doc);
                const { debitActuals, creditActuals } = await getTransactions(doc);

                // --- 1. Calculate this month's final numbers ---
                const salaryGoal = parseFloat(config.Total_Salary || 0);
                const openingBalance = parseFloat(config.Current_Opening_Balance || 0);
                const pool = (salaryGoal * 0.40) + openingBalance;
                const goalExpenses = pool * 0.50;

                // This is the rollover for the *next* month
                const closingBalance = goalExpenses - debitActuals.expenses;

                // --- 2. Get the new 'Monthly_Archive' sheet ---
                const archiveSheet = doc.sheetsByTitle['Monthly_Archive'];
                if (!archiveSheet) throw new Error("Sheet 'Monthly_Archive' not found.");

                const now = new Date();
                // Format: "11-2025" (Month is 0-indexed, so +1)
                const monthYear = `${now.getMonth() + 1}-${now.getFullYear()}`;

                // --- 3. Write new row to the Archive ---
                await archiveSheet.addRow({
                    Month_Year: monthYear,
                    Opening_Balance: openingBalance.toFixed(2),
                    Total_Salary_Received: creditActuals.salary.toFixed(2),
                    Total_Other_Income: creditActuals.otherIncome.toFixed(2),
                    Total_Spent_Family: debitActuals.family.toFixed(2),
                    Total_Spent_Shares: debitActuals.shares.toFixed(2),
                    Total_Spent_Savings: debitActuals.savings.toFixed(2),
                    Total_Spent_Personal: debitActuals.expenses.toFixed(2),
                    Closing_Balance: closingBalance.toFixed(2)
                });

                // --- 4. Update the Config sheet for next month ---
                // We can reuse 'config' as it's the 1-row object
                config.Current_Opening_Balance = closingBalance.toFixed(2);
                config.Time_stamp = new Date().toISOString();
                await config.save(); // Save the updated 1-row config
                
                responseData = { success: true, newOpeningBalance: closingBalance.toFixed(2) };
                break;
            }

            // --- ACTION 5: Get All Document Data (UPGRADED) ---
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
                    link: row.Drive_Link,
                    pdf: row.Uploded_Pdfs // <-- NEW: Added this column
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