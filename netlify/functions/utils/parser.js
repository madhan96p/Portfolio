const cleanCurrency = (value) => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    // Remove currency symbols (like ₹, $) and commas, then parse as float.
    return parseFloat(value.replace(/[^0-9.-]+/g, '')) || 0;
  }
  return 0; // Return 0 for other types or if parsing fails
};

module.exports = { cleanCurrency };
