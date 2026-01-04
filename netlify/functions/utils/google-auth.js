const { GoogleSpreadsheet } = require('google-spreadsheet');
// require('dotenv').config();

async function getAuthenticatedDoc() {
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID);
    
    await doc.useServiceAccountAuth({
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        // Ensure private key handles newlines correctly
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });

    await doc.loadInfo();
    return doc;
}

// Ensure this is an OBJECT export
module.exports = { getAuthenticatedDoc };