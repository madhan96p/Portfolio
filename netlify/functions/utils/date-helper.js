// netlify/functions/utils/date-helper.js
const getStartDate = (range) => {
    const today = new Date();
    let startDate;

    switch (range) {
        case '1d':
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 1);
            break;
        case '1w':
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 7);
            break;
        case '1m':
            startDate = new Date(today);
            startDate.setMonth(today.getMonth() - 1);
            break;
        case 'all':
            startDate = null; // No start date for 'all'
            break;
        default:
            startDate = null; // Default to all
    }

    return startDate;
};

const formatDate = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

module.exports = { getStartDate, formatDate };
