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
        return null; // Return null if the sheet is empty
    }
}

/**
 * --- NEW HELPER ---
 * Gets all transactions from the start date to today.
 * This is the new "brain" of the app.
 */
async function getCurrentCycleTransactions(doc, cycleStartDate) {
    if (!cycleStartDate) {
        return { transactions: [], totals: { family: 0, shares: 0, savings: 0, personal: 0, household: 0, salary: 0, otherIncome: 0 } };
    }

    const transactionsSheet = doc.sheetsByTitle['Transactions'];
    if (!transactionsSheet) throw new Error("Sheet 'Transactions' not found.");

    const rows = await transactionsSheet.getRows();
    
    // We must manually filter by date
    const startDate = new Date(cycleStartDate);
    
    const transactions = [];
    const totals = { family: 0, shares: 0, savings: 0, personal: 0, household: 0, salary: 0, otherIncome: 0 };

    for (const row of rows) {
        const txDate = new Date(row.Date);
        
        // Filter for transactions within the current cycle
        if (txDate >= startDate) {
            transactions.push(row);
            
            // Calculate totals on-the-fly
            const debit = parseFloat(row.Amount_DR || 0);
            const credit = parseFloat(row.Amount_CR || 0);

            switch (row.Category) {
                // --- Debits ---
                case 'Family Transfer':
                    totals.family += debit;
                    break;
                case 'Share Investment':
                    totals.shares += debit;
                    break;
                case 'Savings Transfer':
                    totals.savings += debit;
                    break;
                // Both new categories map to "personal wallet"
                case 'Personal Spending':
                    totals.personal += debit;
                    break;
                case 'Household Spending':
                    totals.household += debit;
                    break;
                
                // --- Credits ---
                case 'Salary':
                    totals.salary += credit;
                    break;
                case 'Gift / From Friend':
                case 'Other Income':
                    totals.otherIncome += credit;
                    break;
            }
        }
    }
    
    return { transactions, totals };
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

            // --- ACTION 1: Get All Tracker Data (REWRITTEN) ---
            case 'getTrackerData': {
                const config = await getConfig(doc);
                let goals, actuals, wallet, configData;

                if (config === null) {
                    // --- Config is empty, send a default "zeroed-out" state ---
                    goals = { goalFamily: 0, goalShares: 0, goalSavings: 0, goalExpenses: 0 };
                    actuals = { family: 0, shares: 0, savings: 0, personal: 0, household: 0, salary: 0, otherIncome: 0 };
                    wallet = { balance: 0, totalAvailable: 0, totalSpent: 0 };
                    configData = { Total_Salary: 0, Emp_Name: null, Net_Salary: 0 }; // Simplified
                    
                } else {
                    // --- Config exists, calculate everything ---
                    const salary = parseFloat(config.Total_Salary || 0); // This is the PLAN
                    const openingBalance = parseFloat(config.Current_Opening_Balance || 0);

                    // 1. Get Goals (from the Plan)
                    const goalFamily = salary * 0.60;
                    const pool = (salary * 0.40) + openingBalance;
                    const goalShares = pool * 0.25;
                    const goalSavings = pool * 0.25;
                    const goalExpenses = pool * 0.50; // This is the 20% wallet
                    goals = { goalFamily, goalShares, goalSavings, goalExpenses };

                    // 2. Get Actuals (Calculated from Transactions)
                    const { totals } = await getCurrentCycleTransactions(doc, config.Cycle_Start_Date);
                    
                    const totalWalletSpent = totals.personal + totals.household;
                    
                    actuals = {
                        family: totals.family,
                        shares: totals.shares,
                        savings: totals.savings,
                        personal: totals.personal,     // For the new breakdown card
                        household: totals.household,   // For the new breakdown card
                        salary: totals.salary,         // For the income card
                        otherIncome: totals.otherIncome  // For the income card
                    };

                    // 3. Get Wallet (Goals vs. Actuals)
                    wallet = {
                        balance: goalExpenses - totalWalletSpent,
                        totalAvailable: goalExpenses,
                        totalSpent: totalWalletSpent
                    };

                    // 4. Get Config Data (for Settings page, etc.)
                    configData = {
                        Total_Salary: config.Total_Salary,
                        Emp_Name: config.Emp_Name,
                        Employee_No: config.Employee_No,
                        PAN_No: config.PAN_No,
                        PF_No: config.PF_No,
                        UAN_No: config.UAN_No,
                        Gross_Salary: config.Gross_Salary,
                        Total_Deductions: config.Total_Deductions,
                        Net_Salary: config.Net_Salary
                        // All the 'Current_' fields are gone!
                    };
                }

                responseData = { success: true, data: { config: configData, goals, actuals, wallet } };
                break;
            }

            // --- ACTION 2: Log a New Transaction (REWRITTEN) ---
            case 'logTransaction': {
                // This function is now MUCH simpler.
                // Its only job is to add a row to 'Transactions'.
                
                const { amount, type, category, notes, transactionDate, paymentMode } = data;

                // 1. Check if profile is set up. This is still important.
                const config = await getConfig(doc);
                if (!config) {
                    throw new Error("Cannot log transaction. Please set up your profile in Settings first.");
                }

                // 2. Add the transaction.
                const transactionsSheet = doc.sheetsByTitle['Transactions'];
                await transactionsSheet.addRow({
                    Date: transactionDate,
                    Category: category,
                    Amount_DR: type === 'debit' ? amount : '0',
                    Amount_CR: type === 'credit' ? amount : '0',
                    Notes: notes,
                    Payment_Mode: paymentMode,
                    Time_stamp: new Date().toISOString()
                });

                // 3. That's it. No more updating Config.
                
                responseData = { success: true };
                break;
            }

            // --- ACTION 3: Update Salary Goal (Unchanged) ---
            case 'updateSalaryGoal': {
                const config = await getConfig(doc);
                config.Total_Salary = data.newSalary;
                config.Time_stamp = new Date().toISOString();
                await config.save();
                responseData = { success: true };
                break;
            }

            // --- ACTION 4: Run the Month-End (REWRITTEN) ---
            case 'runMonthEnd': {
                const config = await getConfig(doc);
                if (!config) {
                    throw new Error("Cannot run month-end. Profile is not set up.");
                }

                // 1. Get all totals for the cycle that is *ending*.
                const { totals } = await getCurrentCycleTransactions(doc, config.Cycle_Start_Date);

                // 2. Calculate the closing balance.
                const salary = parseFloat(config.Total_Salary || 0); // The Plan
                const openingBalance = parseFloat(config.Current_Opening_Balance || 0);
                const pool = (salary * 0.40) + openingBalance;
                const goalExpenses = pool * 0.50; // The 20% wallet goal
                const totalWalletSpent = totals.personal + totals.household;
                const closingBalance = goalExpenses - totalWalletSpent;

                // 3. Archive this cycle's data.
                const archiveSheet = doc.sheetsByTitle['Monthly_Archive'];
                if (!archiveSheet) throw new Error("Sheet 'Monthly_Archive' not found.");
                
                const now = new Date(config.Cycle_Start_Date); // Use cycle start date to get correct month
                const monthYear = `${now.toLocaleString('default', { month: 'short' })}-${now.getFullYear()}`;
                
                await archiveSheet.addRow({
                    Month_Year: monthYear,
                    Opening_Balance: openingBalance.toFixed(2),
                    Total_Salary_Received: totals.salary.toFixed(2),
                    Total_Other_Income: totals.otherIncome.toFixed(2),
                    Total_Spent_Family: totals.family.toFixed(2),
                    Total_Spent_Shares: totals.shares.toFixed(2),
                    Total_Spent_Savings: totals.savings.toFixed(2),
                    Total_Spent_Personal: (totals.personal + totals.household).toFixed(2), // Total wallet spent
                    Closing_Balance: closingBalance.toFixed(2)
                });

                // 4. Reset the Config sheet for the *new* cycle.
                config.Current_Opening_Balance = closingBalance.toFixed(2);
                config.Cycle_Start_Date = new Date().toISOString().split('T')[0]; // Set new start date to today
                config.Time_stamp = new Date().toISOString();
                
                // All the 'Current_' fields are gone! No need to reset them.
                await config.save();

                responseData = { success: true, newOpeningBalance: closingBalance.toFixed(2) };
                break;
            }

            // --- ACTION 5: Get All Document Data (Unchanged) ---
            case 'getDocumentData': {
                // ... (no changes to this case) ...
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

            // --- ACTION 6: Get Transaction History (Unchanged) ---
            case 'getTransactionHistory': {
                // ... (no changes to this case) ...
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

            // --- ACTION 7: Update Profile (REWRITTEN) ---
            case 'updateProfile': {
                const profileData = data;
                profileData.Total_Salary = profileData.Net_Salary; // Your plan
                profileData.Time_stamp = new Date().toISOString();

                let config = await getConfig(doc);

                if (config === null) {
                    // --- FIRST TIME setup ---
                    const configSheet = doc.sheetsByTitle['Config'];
                    if (!configSheet) throw new Error("Sheet 'Config' not found.");

                    // Initialize the *new* required fields
                    profileData.Current_Opening_Balance = 0;
                    profileData.Cycle_Start_Date = new Date().toISOString().split('T')[0]; // Set start date to today

                    // We no longer add any 'Current_' fields
                    await configSheet.addRow(profileData);

                } else {
                    // --- Normal UPDATE ---
                    config.Emp_Name = profileData.Emp_Name;
                    config.Employee_No = profileData.Employee_No;
                    config.PAN_No = profileData.PAN_No;
                    config.PF_No = profileData.PF_No;
                    config.UAN_No = profileData.UAN_No;
                    config.Gross_Salary = profileData.Gross_Salary;
                    config.Total_Deductions = profileData.Total_Deductions;
                    config.Net_Salary = profileData.Net_Salary;
                    config.Total_Salary = profileData.Total_Salary;
                    config.Time_stamp = profileData.Time_stamp;
                    
                    await config.save();
                }

                responseData = { success: true };
                break;
            }

            // --- ACTION 8: Get Unique Notes (Unchanged) ---
            case 'getUniqueNotes': {
                // ... (no changes to this case) ...
                const transactionsSheet = doc.sheetsByTitle['Transactions'];
                if (!transactionsSheet) throw new Error("Sheet 'Transactions' not found.");
                const rows = await transactionsSheet.getRows();
                const notesSet = new Set();
                rows.forEach(row => {
                    const note = row.Notes;
                    if (note && note.trim() !== '') {
                        notesSet.add(note.trim());
                    }
                });
                const uniqueNotes = Array.from(notesSet);
                responseData = { success: true, data: uniqueNotes };
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