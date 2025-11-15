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
 * Helper function to read the 'Config' tab (1 row).
 */
async function getConfig(doc) {
    const configSheet = doc.sheetsByTitle['Config'];
    if (!configSheet) throw new Error("Sheet 'Config' not found.");
    const configRows = await configSheet.getRows();
    
    if (configRows.length > 0) {
        return configRows[0]; // Return the first (and only) row object
    } else {
        throw new Error("Config sheet is empty. Please initialize it with one row of data.");
    }
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
            
            // --- ACTION 1: Get All Tracker Data ---
            case 'getTrackerData': {
                const config = await getConfig(doc); // Reads 1 row

                const salary = parseFloat(config.Total_Salary || 0);
                const openingBalance = parseFloat(config.Current_Opening_Balance || 0);

                const goalFamily = salary * 0.60;
                const pool = (salary * 0.40) + openingBalance;
                const goalShares = pool * 0.25;
                const goalSavings = pool * 0.25;
                const goalExpenses = pool * 0.50;
                const goals = { goalFamily, goalShares, goalSavings, goalExpenses };

                const actualExpenses = parseFloat(config.Current_Expenses || 0);
                const actuals = {
                    family: parseFloat(config.Current_Family || 0),
                    shares: parseFloat(config.Current_Shares || 0),
                    savings: parseFloat(config.Current_Savings || 0),
                    expenses: actualExpenses
                };
                
                const wallet = {
                    balance: goalExpenses - actualExpenses,
                    totalAvailable: goalExpenses,
                    totalSpent: actualExpenses
                };

                responseData = { success: true, data: { config, goals, actuals, wallet } };
                break;
            }

            // --- ACTION 2: Log a New Transaction ---
            case 'logTransaction': {
                const { amount, type, category, notes, transactionDate, paymentMode } = data;
                
                const transactionsSheet = doc.sheetsByTitle['Transactions'];
                await transactionsSheet.addRow({
                    Date: transactionDate,
                    Category: category,
                    Amount_DR: type === 'debit' ? amount : '0',
                    Amount_CR: type === 'credit' ? amount : '0', // <<< --- THIS LINE IS NOW FIXED
                    Notes: notes,
                    Payment_Mode: paymentMode,
                    Time_stamp: new Date().toISOString()
                });

                const config = await getConfig(doc);
                const numAmount = parseFloat(amount);

                if (type === 'debit') {
                    switch (category) {
                        case 'Family Transfer':
                            config.Current_Family = (parseFloat(config.Current_Family || 0) + numAmount).toFixed(2);
                            break;
                        case 'Share Investment':
                            config.Current_Shares = (parseFloat(config.Current_Shares || 0) + numAmount).toFixed(2);
                            break;
                        case 'Savings Transfer':
                            config.Current_Savings = (parseFloat(config.Current_Savings || 0) + numAmount).toFixed(2);
                            break;
                        case 'Personal Expense':
                            config.Current_Expenses = (parseFloat(config.Current_Expenses || 0) + numAmount).toFixed(2);
                            break;
                    }
                } else { // Credit
                    switch (category) {
                        case 'Salary':
                            config.Current_Salary_In = (parseFloat(config.Current_Salary_In || 0) + numAmount).toFixed(2);
                            break;
                        case 'Gift / From Friend':
                        case 'Other Income':
                            config.Current_Other_In = (parseFloat(config.Current_Other_In || 0) + numAmount).toFixed(2);
                            break;
                    }
                }
                
                config.Time_stamp = new Date().toISOString();
                await config.save();
                
                responseData = { success: true };
                break;
            }

            // --- ACTION 3: Update Salary Goal ---
            case 'updateSalaryGoal': {
                const config = await getConfig(doc);
                config.Total_Salary = data.newSalary;
                config.Time_stamp = new Date().toISOString();
                await config.save();
                responseData = { success: true };
                break;
            }

            // --- ACTION 4: Run the Month-End ---
            case 'runMonthEnd': {
                const config = await getConfig(doc);
                const salaryGoal = parseFloat(config.Total_Salary || 0);
                const openingBalance = parseFloat(config.Current_Opening_Balance || 0);
                const pool = (salaryGoal * 0.40) + openingBalance;
                const goalExpenses = pool * 0.50;
                const actualExpenses = parseFloat(config.Current_Expenses || 0);
                const closingBalance = goalExpenses - actualExpenses;

                const archiveSheet = doc.sheetsByTitle['Monthly_Archive'];
                if (!archiveSheet) throw new Error("Sheet 'Monthly_Archive' not found.");
                const now = new Date();
                const monthYear = `${now.getMonth() + 1}-${now.getFullYear()}`;
                await archiveSheet.addRow({
                    Month_Year: monthYear,
                    Opening_Balance: openingBalance.toFixed(2),
                    Total_Salary_Received: parseFloat(config.Current_Salary_In || 0).toFixed(2),
                    Total_Other_Income: parseFloat(config.Current_Other_In || 0).toFixed(2),
                    Total_Spent__Family: parseFloat(config.Current_Family || 0).toFixed(2),
                    Total_Spent_Shares: parseFloat(config.Current_Shares || 0).toFixed(2),
                    Total_Spent_Savings: parseFloat(config.Current_Savings || 0).toFixed(2),
                    Total_Spent_Personal: actualExpenses.toFixed(2),
                    Closing_Balance: closingBalance.toFixed(2)
                });

                config.Current_Opening_Balance = closingBalance.toFixed(2);
                config.Current_Family = "0";
                config.Current_Shares = "0";
                config.Current_Savings = "0";
                config.Current_Expenses = "0";
                config.Current_Salary_In = "0";
                config.Current_Other_In = "0";
                config.Time_stamp = new Date().toISOString();
                await config.save();
                
                responseData = { success: true, newOpeningBalance: closingBalance.toFixed(2) };
                break;
            }

            // --- ACTION 5: Get All Document Data ---
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
                    pdf: row.Uploded_Pdfs
                }));
                
                responseData = { success: true, data: documents };
                break;
            }

            // --- ACTION 6: Get Transaction History ---
            case 'getTransactionHistory': {
                const { limit = 20, offset = 0 } = data;
                const numLimit = parseInt(limit, 10);
                const numOffset = parseInt(offset, 10);

                const transactionsSheet = doc.sheetsByTitle['Transactions'];
                if (!transactionsSheet) throw new Error("Sheet 'Transactions' not found.");
                
                const rows = await transactionsSheet.getRows({ limit: numLimit + 1, offset: numOffset });
                
                const hasMore = rows.length > numLimit;
                if (hasMore) {
                    rows.pop(); 
                }

                const transactions = rows.map(row => ({
                    date: row.Date,
                    category: row.Category,
                    debit: row.Amount_DR,
                    credit: row.Amount_CR,
                    notes: row.Notes,
                    paymentMode: row.Payment_Mode
                }));

                responseData = { success: true, data: { transactions, hasMore } };
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