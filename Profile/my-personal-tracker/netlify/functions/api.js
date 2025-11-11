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
 * Returns an object with key-value pairs.
 */
async function getConfig(doc) {
    const configSheet = doc.sheetsByTitle['Config'];
    const configRows = await configSheet.getRows();
    const config = {};
    
    // We get the first row, which holds all our config values
    if (configRows.length > 0) {
        const firstRow = configRows[0];
        // Get all headers (e.g., "Total_Salary", "Current_Opening_Balance")
        const headers = configSheet.headerValues; 
        headers.forEach(header => {
            // Read the value for each header from the first row
            config[header] = firstRow[header];
        });
    }
    return config;
}

/**
 * Helper function to update values in the 'Config' tab.
 */
async function updateConfig(doc, updates) {
    const configSheet = doc.sheetsByTitle['Config'];
    const configRows = await configSheet.getRows();
    
    if (configRows.length > 0) {
        const firstRow = configRows[0];
        for (const key in updates) {
            if (firstRow.hasOwnProperty(key)) {
                firstRow[key] = updates[key];
            }
        }
        await firstRow.save();
    } else {
        // If no rows exist, create one with the updates
        await configSheet.addRow(updates);
    }
}


// --- Main API Handler ---

exports.handler = async function (event, context) {
    // Only allow POST requests for this function
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
                const configData = await getConfig(doc);
                responseData = { success: true, data: configData };
                break;
            }

            // --- ACTION 2: Log a New Expense ---
            case 'logExpense': {
                const { amount, category, notes } = data;
                
                // 1. Add to 'Expenses' sheet
                const expensesSheet = doc.sheetsByTitle['Expenses'];
                await expensesSheet.addRow({
                    Date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
                    Amount: amount,
                    Category: category,
                    Notes: notes,
                    Time_stamp: new Date().toISOString()
                });

                // 2. Update 'Config' sheet
                const config = await getConfig(doc);
                const currentSpent = parseFloat(config.Total_Spent_This_Month || 0);
                const newTotalSpent = currentSpent + parseFloat(amount);
                
                await updateConfig(doc, { 
                    Total_Spent_This_Month: newTotalSpent.toFixed(2),
                    Time_stamp: new Date().toISOString()
                });

                responseData = { success: true, newTotalSpent: newTotalSpent.toFixed(2) };
                break;
            }

            // --- ACTION 3: Run the Month-End Re-balancing ---
            case 'runMonthEnd': {
                // 1. Get current values
                const config = await getConfig(doc);
                const totalSalary = parseFloat(config.Total_Salary || 0);
                const availableSpend = parseFloat(config.Total_Available_Spend || 0);
                const spent = parseFloat(config.Total_Spent_This_Month || 0);

                // 2. Calculate leftover money
                const newOpeningBalance = availableSpend - spent;

                // 3. Calculate the new "40% Pool"
                const salaryBalance = totalSalary * 0.40;
                const pool = salaryBalance + newOpeningBalance;

                // 4. Calculate new allocations based on the pool
                // 30/40 (75%) of pool is for personal budget
                // 20/30 (2/3) of that is for expenses
                const newAvailableSpend = (pool * 0.75) * (2 / 3); 
                
                // 5. Update the Config sheet for the new month
                await updateConfig(doc, {
                    Current_Opening_Balance: newOpeningBalance.toFixed(2),
                    Total_Available_Spend: newAvailableSpend.toFixed(2),
                    Total_Spent_This_Month: 0, // Reset for new month
                    Time_stamp: new Date().toISOString()
                });
                
                // 6. Return the new config
                responseData = { 
                    success: true, 
                    data: {
                        ...config,
                        Current_Opening_Balance: newOpeningBalance.toFixed(2),
                        Total_Available_Spend: newAvailableSpend.toFixed(2),
                        Total_Spent_This_Month: 0
                    }
                };
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