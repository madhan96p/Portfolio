const { GoogleSpreadsheet } = require('google-spreadsheet');

// Netlify Environment Variables
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

/**
 * Helper to authenticate with Google Sheets
 */
async function getAuthenticatedDoc() {
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    await doc.useServiceAccountAuth({ client_email: CLIENT_EMAIL, private_key: PRIVATE_KEY });
    await doc.loadInfo();
    return doc;
}

/**
 * Helper to fetch the current configuration (Rollover & Start Date)
 */
async function getConfig(doc) {
    const sheet = doc.sheetsByTitle['Config'];
    const rows = await sheet.getRows();
    return rows.length > 0 ? rows[0] : null;
}

/**
 * Core Logic: Processes the 'Transactions' sheet to calculate cycle totals
 */
async function getCurrentCycleTotals(doc, cycleStartDate) {
    const sheet = doc.sheetsByTitle['Transactions'];
    const rows = await sheet.getRows();
    const startDate = new Date(cycleStartDate);
    
    const totals = { 
        family: 0, shares: 0, savings: 0, personal: 0, household: 0, 
        salary: 0, otherIncome: 0, p2pIn: 0, p2pOut: 0 
    };

    for (const row of rows) {
        if (new Date(row.Date) >= startDate) {
            const dr = parseFloat(row.Amount_DR || 0);
            const cr = parseFloat(row.Amount_CR || 0);

            switch (row.Category) {
                case 'Salary': totals.salary += cr; break;
                case 'Family Support': totals.p2pIn += cr; totals.otherIncome += cr; break;
                case 'Family Transfer': totals.family += dr; totals.p2pOut += dr; break;
                case 'Share Investment': totals.shares += dr; break;
                case 'Savings Transfer': totals.savings += dr; break;
                case 'Personal Spending': totals.personal += dr; break;
                case 'Household Spending': totals.household += dr; break;
                case 'Other Income': totals.otherIncome += cr; break;
            }
        }
    }
    return totals;
}

exports.handler = async function (event) {
    if (event.httpMethod !== 'POST') return { statusCode: 405 };
    
    const { action, data } = JSON.parse(event.body);
    const doc = await getAuthenticatedDoc();
    let responseData = { success: true };

    try {
        switch (action) {
            case 'getTrackerData': {
                const config = await getConfig(doc);
                const totals = await getCurrentCycleTotals(doc, config.Cycle_Start_Date);
                
                const salaryBase = totals.salary;
                const openingBal = parseFloat(config.Current_Opening_Balance || 0);
                
                // 1. Calculate Goals (60/40 Rule)
                const goalFamily = salaryBase * 0.60;
                const pool = (salaryBase * 0.40) + openingBal;
                
                const walletGoal = pool * 0.50; // 20% Personal Wallet
                const walletSpent = totals.personal + totals.household;
                const p2pNet = totals.p2pIn - totals.p2pOut; // Social Tracer Logic

                // 2. Determine Pending Amounts for Bank Balance Calculation
                const pendingFamily = Math.max(0, goalFamily - totals.family);
                const pendingShares = Math.max(0, (pool * 0.25) - totals.shares);
                const pendingSavings = Math.max(0, (pool * 0.25) - totals.savings);

                responseData.data = {
                    config: { startDate: config.Cycle_Start_Date, openingBal },
                    goals: { 
                        family: goalFamily, 
                        shares: pool * 0.25, 
                        savings: pool * 0.25, 
                        wallet: walletGoal 
                    },
                    actuals: { ...totals, p2pNet },
                    wallet: { 
                        balance: walletGoal - walletSpent,
                        totalSpent: walletSpent,
                        // Bank balance includes remaining wallet + all pending goal money + held P2P funds
                        approxBankBalance: (walletGoal - walletSpent) + pendingFamily + pendingShares + pendingSavings + p2pNet
                    }
                };
                break;
            }

            case 'logTransaction': {
                const txSheet = doc.sheetsByTitle['Transactions'];
                await txSheet.addRow({
                    Date: data.transactionDate,
                    Category: data.category,
                    Amount_DR: data.type === 'debit' ? data.amount : 0,
                    Amount_CR: data.type === 'credit' ? data.amount : 0,
                    Entity: data.entity || 'None',
                    Notes: data.notes,
                    Payment_Mode: data.paymentMode,
                    Cycle_ID: data.transactionDate.substring(0, 7), // Auto-tags cycle (YYYY-MM)
                    Time_stamp: new Date().toISOString()
                });

                // NEW: Mirror Share Investments to Sheet 2
                if (data.category === 'Share Investment' && data.investment) {
                    const portSheet = doc.sheetsByTitle['Portfolio'];
                    await portSheet.addRow({
                        'Date Invested': data.transactionDate,
                        'Share Symbol': data.investment.symbol,
                        'Units': data.investment.units,
                        'Avg. Buy Price': data.investment.buyPrice
                    });
                }
                break;
            }

            case 'runMonthEnd': {
                const currentConfig = await getConfig(doc);
                const finalTotals = await getCurrentCycleTotals(doc, currentConfig.Cycle_Start_Date);
                
                const poolFinal = (finalTotals.salary * 0.40) + parseFloat(currentConfig.Current_Opening_Balance);
                const closingBal = (poolFinal * 0.50) - (finalTotals.personal + finalTotals.household);

                // Archive data to Sheet 3
                const archiveSheet = doc.sheetsByTitle['Monthly_Archive'];
                await archiveSheet.addRow({
                    Month_Year: currentConfig.Cycle_Start_Date.substring(0, 7),
                    Opening_Balance: currentConfig.Current_Opening_Balance,
                    Total_Salary_Received: finalTotals.salary,
                    Closing_Balance: closingBal.toFixed(2)
                });

                // Update Config for new month rollover
                currentConfig.Current_Opening_Balance = closingBal.toFixed(2);
                currentConfig.Cycle_Start_Date = new Date().toISOString().split('T')[0];
                await currentConfig.save();
                break;
            }

            case 'getHistoryAnalysis': {
                const txSheet = doc.sheetsByTitle['Transactions'];
                const rows = await txSheet.getRows();
                responseData.data = rows.map(r => ({
                    date: r.Date, category: r.Category, dr: r.Amount_DR, cr: r.Amount_CR, notes: r.Notes
                })).reverse();
                break;
            }
        }
        return { statusCode: 200, body: JSON.stringify(responseData) };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
    }
};