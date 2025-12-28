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
 * Gets all transactions from the start date to today and calculates totals.
 */
async function getCurrentCycleTransactions(doc, cycleStartDate) {
    if (!cycleStartDate) {
        return { transactions: [], totals: { family: 0, shares: 0, savings: 0, personal: 0, household: 0, salary: 0, otherIncome: 0, p2pIncoming: 0, p2pOutgoing: 0 } };
    }

    const transactionsSheet = doc.sheetsByTitle['Transactions'];
    if (!transactionsSheet) throw new Error("Sheet 'Transactions' not found.");

    const rows = await transactionsSheet.getRows();
    const startDate = new Date(cycleStartDate);
    
    // Logic: Expanded totals to include P2P Tracer logic for "From Me / From Them"
    const totals = { family: 0, shares: 0, savings: 0, personal: 0, household: 0, salary: 0, otherIncome: 0, p2pIncoming: 0, p2pOutgoing: 0 };

    for (const row of rows) {
        const txDate = new Date(row.Date);
        if (txDate >= startDate) {
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
    return { totals };
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
                if (config === null) {
                    responseData = { success: false, error: 'Config not found.' };
                } else {
                    const { totals } = await getCurrentCycleTransactions(doc, config.Cycle_Start_Date);
                    
                    // Logic: Use actual Salary Received from the sheet as the base
                    const salaryBase = totals.salary > 0 ? totals.salary : 0;
                    const openingBalance = parseFloat(config.Current_Opening_Balance || 0);

                    // 60-40 Budget Allocation Logic
                    const goalFamily = salaryBase * 0.60;
                    const pool = (salaryBase * 0.40) + openingBalance;
                    const goalShares = pool * 0.25;
                    const goalSavings = pool * 0.25;
                    const goalExpenses = pool * 0.50; // 20% Wallet

                    const totalWalletSpent = totals.personal + totals.household;
                    const p2pNet = totals.p2pIncoming - totals.p2pOutgoing; // The "Perfect Tracer"

                    const wallet = {
                        balance: goalExpenses - totalWalletSpent,
                        totalAvailable: goalExpenses,
                        totalSpent: totalWalletSpent
                    };

                    const pendingFamily = Math.max(0, goalFamily - totals.family);
                    const pendingShares = Math.max(0, goalShares - totals.shares);
                    const pendingSavings = Math.max(0, goalSavings - totals.savings);
                    
                    // Logic: Bank balance adjusted for "held" P2P money and pending goals
                    wallet.approxBankBalance = wallet.balance + pendingFamily + pendingShares + pendingSavings + p2pNet;

                    responseData = { 
                        success: true, 
                        data: { 
                            config: { Cycle_Start_Date: config.Cycle_Start_Date, Emp_Name: config.Emp_Name },
                            goals: { goalFamily, goalShares, goalSavings, goalExpenses },
                            actuals: { ...totals, openingBalance, p2pNet },
                            wallet
                        } 
                    };
                }
                break;
            }

            case 'logTransaction': {
                const { amount, type, category, notes, transactionDate, paymentMode, entity, investment } = data;
                
                // 1. Log to Transactions Sheet (Cash Flow Record)
                const txSheet = doc.sheetsByTitle['Transactions'];
                await txSheet.addRow({
                    Date: transactionDate,
                    Category: category,
                    Amount_DR: type === 'debit' ? amount : '0',
                    Amount_CR: type === 'credit' ? amount : '0',
                    Notes: notes,
                    Payment_Mode: paymentMode,
                    Entity: entity || 'None', // Person or Share Ticker
                    Time_stamp: new Date().toISOString()
                });

                // 2. Log to Portfolio Sheet (Wealth Building Record)
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
                
                // Filtering Logic based on Date
                const now = new Date();
                let filterStartDate = new Date(0);
                if (filter === '1D') filterStartDate = new Date(now.setDate(now.getDate() - 1));
                else if (filter === '1W') filterStartDate = new Date(now.setDate(now.getDate() - 7));
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
                        transactions.push({ date: row.Date, category: row.Category, debit: row.Amount_DR, credit: row.Amount_CR, notes: row.Notes, mode: row.Payment_Mode });
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

            case 'getDocumentData': {
                const docSheet = doc.sheetsByTitle['Documents'];
                const rows = await docSheet.getRows();
                responseData = { success: true, data: rows.map(r => ({ fullName: r.Full_Name, docType: r.Document_Type, docNumber: r.Document_Number, link: r.Drive_Link })) };
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