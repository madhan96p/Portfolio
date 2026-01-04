const { getAuthenticatedDoc } = require('./utils/google-auth');
const { calculateFinancials } = require('./utils/math-engine');

exports.handler = async (event) => {
    try {
        const doc = await getAuthenticatedDoc();
        const configSheet = doc.sheetsByTitle['Config'];
        const txSheet = doc.sheetsByTitle['Transactions'];
        const portfolioSheet = doc.sheetsByTitle['Portfolio'];

        const [configRows, txRows, portfolioRows] = await Promise.all([
            configSheet.getRows(),
            txSheet.getRows(),
            portfolioSheet.getRows()
        ]);

        const cleanTx = txRows.map(r => ({
            Category: r.Category,
            Entity: r.Entity,
            Amount_DR: parseFloat(r.Amount_DR || 0),
            Amount_CR: parseFloat(r.Amount_CR || 0),
            Cycle_ID: r.Cycle_ID
        }));

        const cleanPortfolio = portfolioRows.map(r => ({
            symbol: r['Share Symbol'],
            units: parseFloat(r.Units || 0),
            buyPrice: parseFloat(r['Avg. Buy Price'] || 0),
            currentPrice: parseFloat(r['Current Price'] || 0),
            pnl: parseFloat(r['P&L'] || 0)
        }));

        const analysis = calculateFinancials(configRows[0], cleanTx, cleanPortfolio);
        
        // Add the raw holdings for the Wealth page
        analysis.holdings = cleanPortfolio;

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(analysis)
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};