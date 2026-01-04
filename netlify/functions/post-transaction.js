const { getAuthenticatedDoc } = require('./utils/google-auth');
const { getCurrentCycle } = require('./utils/date-helper');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    try {
        const data = JSON.parse(event.body);
        const doc = await getAuthenticatedDoc();
        
        // 1. Write to Transactions Sheet
        const txSheet = doc.sheetsByTitle['Transactions'];
        const newTx = {
            Date: new Date().toISOString().split('T')[0],
            Category: data.category,
            'Sub-Category': data.subCategory || 'General',
            Amount_DR: data.isCredit ? 0 : data.amount,
            Amount_CR: data.isCredit ? data.amount : 0,
            Entity: data.entity,
            Notes: data.notes,
            Payment_Mode: 'UPI',
            Cycle_ID: getCurrentCycle()
        };
        await txSheet.addRow(newTx);

        // 2. THE DUAL-WRITE RULE: Update Portfolio
        if (data.category === 'Share Investment' && data.symbol) {
            const portfolioSheet = doc.sheetsByTitle['Portfolio'];
            await portfolioSheet.addRow({
                'Date Invested': newTx.Date,
                'Share Symbol': data.symbol,
                'Units': data.units,
                'Avg. Buy Price': data.amount / data.units,
                'Total Value': data.amount
            });
        }

        return { statusCode: 200, body: JSON.stringify({ success: true }) };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};