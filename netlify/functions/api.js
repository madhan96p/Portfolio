const { GoogleSpreadsheet } = require('google-spreadsheet');

// Netlify Environment Variables
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
    return configRows.length > 0 ? configRows[0] : null;
}

/**
 * Gets all transactions from the start date to today.
 */
async function getCurrentCycleTransactions(doc, cycleStartDate) {
    if (!cycleStartDate) {
        return { transactions: [], totals: { family: 0, shares: 0, savings: 0, personal: 0, household: 0, salary: 0, otherIncome: 0, p2pIncoming: 0, p2pOutgoing: 0 } };
    }

    const transactionsSheet = doc.sheetsByTitle['Transactions'];
    if (!transactionsSheet) throw new Error("Sheet 'Transactions' not found.");

    const rows = await transactionsSheet.getRows();
    const startDate = new Date(cycleStartDate);
    const transactions = [];
    
    // Expanded totals to include P2P Tracer logic
    const totals = { family: 0, shares: 0, savings: 0, personal: 0, household: 0, salary: 0, otherIncome: 0, p2pIncoming: 0, p2pOutgoing: 0 };

    for (const row of rows) {
        const txDate = new Date(row.Date);
        if (txDate >= startDate) {
            transactions.push(row);
            const debit = parseFloat(row.Amount_DR || 0);
            const credit = parseFloat(row.Amount_CR || 0);

            switch (row.Category) {
                case 'Family Transfer':
                    totals.family += debit;
                    totals.p2pOutgoing += debit; // Log for Tracer
                    break;
                case 'Share Investment':
                    totals.shares += debit;
                    break;
                case 'Savings Transfer':
                    totals.savings += debit;
                    break;
                case 'Personal Spending':
                    totals.personal += debit;
                    break;
                case 'Household Spending':
                    totals.household += debit;
                    break;
                case 'Salary':
                    totals.salary += credit;
                    break;
                case 'Family Support':
                    totals.p2pIncoming += credit; // Log for Tracer
                    totals.otherIncome += credit;
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
            case 'getTrackerData': {
                const config = await getConfig(doc);
                let goals, actuals, wallet, configData;

                if (config === null) {
                    goals = { goalFamily: 0, goalShares: 0, goalSavings: 0, goalExpenses: 0 };
                    actuals = { family: 0, shares: 0, savings: 0, personal: 0, household: 0, salary: 0, otherIncome: 0, openingBalance: 0, p2pNet: 0 };
                    wallet = { balance: 0, totalAvailable: 0, totalSpent: 0, approxBankBalance: 0 };
                    configData = { Total_Salary: 0, Emp_Name: null, Net_Salary: 0, Cycle_Start_Date: null };
                } else {
                    const { totals } = await getCurrentCycleTransactions(doc, config.Cycle_Start_Date);
                    const salaryBase = totals.salary > 0 ? totals.salary : 0;
                    const openingBalance = parseFloat(config.Current_Opening_Balance || 0);

                    const goalFamily = salaryBase * 0.60;
                    const pool = (salaryBase * 0.40) + openingBalance;
                    const goalShares = pool * 0.25;
                    const goalSavings = pool * 0.25;
                    const goalExpenses = pool * 0.50;

                    const totalWalletSpent = totals.personal + totals.household;
                    const p2pNet = totals.p2pIncoming - totals.p2pOutgoing;

                    actuals = {
                        family: totals.family, shares: totals.shares, savings: totals.savings,
                        personal: totals.personal, household: totals.household,
                        salary: totals.salary, otherIncome: totals.otherIncome,
                        openingBalance, p2pNet // P2P Tracer Logic
                    };

                    wallet = {
                        balance: goalExpenses - totalWalletSpent,
                        totalAvailable: goalExpenses,
                        totalSpent: totalWalletSpent
                    };

                    const pendingFamily = Math.max(0, goalFamily - actuals.family);
                    const pendingShares = Math.max(0, goalShares - actuals.shares);
                    const pendingSavings = Math.max(0, goalSavings - actuals.savings);
                    
                    // Bank balance adjusted for "held" P2P money
                    wallet.approxBankBalance = wallet.balance + pendingFamily + pendingShares + pendingSavings + p2pNet;

                    wallet.cycleBreakdown = { salaryBaseUsed: salaryBase, poolValue: pool, goalFamily: goalFamily };
                    configData = { 
                        Emp_Name: config.Emp_Name, Net_Salary: config.Net_Salary, 
                        Current_Opening_Balance: config.Current_Opening_Balance, Cycle_Start_Date: config.Cycle_Start_Date 
                    };
                }
                responseData = { success: true, data: { config: configData, goals, actuals, wallet } };
                break;
            }

            case 'logTransaction': {
                const { amount, type, category, notes, transactionDate, paymentMode, entity, investment } = data;
                
                // 1. Log to Transactions Sheet (Main Log)
                const txSheet = doc.sheetsByTitle['Transactions'];
                await txSheet.addRow({
                    Date: transactionDate,
                    Category: category,
                    Amount_DR: type === 'debit' ? amount : '0',
                    Amount_CR: type === 'credit' ? amount : '0',
                    Notes: notes,
                    Payment_Mode: paymentMode,
                    Entity: entity || 'None', // Smart P2P/Share Entity
                    Time_stamp: new Date().toISOString()
                });

                // 2. Log to Portfolio Sheet (If applicable)
                if (category === 'Share Investment' && investment) {
                    const portSheet = doc.sheetsByTitle['Portfolio'];
                    if (portSheet) {
                        await portSheet.addRow({
                            'Date Invested': transactionDate,
                            'Share Symbol': investment.symbol,
                            'Units': investment.units,
                            'Avg. Buy Price': investment.buyPrice
                        });
                    }
                }
                responseData = { success: true };
                break;
            }

            case 'getHistoryAnalysis': {
                const { filter } = data;
                const txSheet = doc.sheetsByTitle['Transactions'];
                const rows = await txSheet.getRows();
                const now = new Date();
                let filterStartDate = new Date('1970-01-01');

                if (filter === '1D') { filterStartDate = new Date(now.setDate(now.getDate() - 1)); }
                else if (filter === '1W') { filterStartDate = new Date(now.setDate(now.getDate() - 7)); }
                else if (filter === '1M') {
                    const config = await getConfig(doc);
                    filterStartDate = config ? new Date(config.Cycle_Start_Date) : new Date(now.setDate(now.getDate() - 30));
                }

                const transactions = [];
                const debitSummary = {};
                let totalDebits = 0;

                for (const row of rows) {
                    const txDate = new Date(row.Date);
                    if (txDate >= filterStartDate) {
                        const debit = parseFloat(row.Amount_DR || 0);
                        transactions.push({ date: row.Date, category: row.Category, debit: row.Amount_DR, credit: row.Amount_CR, notes: row.Notes, paymentMode: row.Payment_Mode });
                        if (debit > 0) {
                            totalDebits += debit;
                            debitSummary[row.Category] = (debitSummary[row.Category] || 0) + debit;
                        }
                    }
                }
                transactions.reverse();
                responseData = { success: true, data: { transactions, debitChartData: { labels: Object.keys(debitSummary), values: Object.values(debitSummary), total: totalDebits } } };
                break;
            }

            // Case for Documents and other existing features remain unchanged...
            case 'getDocumentData': {
                const docSheet = doc.sheetsByTitle['Documents'];
                const rows = await docSheet.getRows();
                responseData = { success: true, data: rows.map(r => ({ fullName: r.Full_Name, docType: r.Document_Type, docNumber: r.Document_Number, link: r.Drive_Link })) };
                break;
            }
            
            case 'addDocument': {
                const docSheet = doc.sheetsByTitle['Documents'];
                await docSheet.addRow({ Full_Name: data.fullName, Document_Type: data.docType, Document_Number: data.docNumber, Drive_Link: data.driveLink });
                responseData = { success: true };
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