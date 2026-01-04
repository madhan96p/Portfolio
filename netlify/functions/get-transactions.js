const { getAuthenticatedDoc } = require('./utils/google-auth');

exports.handler = async (event, context) => {
    try {
        const doc = await getAuthenticatedDoc();
        const sheet = doc.sheetsByTitle['Transactions'];
        const rows = await sheet.getRows();

        const transactions = rows.map(r => ({
            date: r.Date,
            category: r.Category,
            subCategory: r['Sub-Category'],
            amountDR: parseFloat(r.Amount_DR || 0),
            amountCR: parseFloat(r.Amount_CR || 0),
            entity: r.Entity,
            notes: r.Notes,
            mode: r.Payment_Mode,
            cycle: r.Cycle_ID
        })).reverse(); // Newest first

        return {
            statusCode: 200,
            body: JSON.stringify(transactions)
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};