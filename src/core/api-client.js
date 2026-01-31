export const API = {
    async getDashboard() {
        const response = await fetch('/api/get-dashboard');
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        return await response.json();
    },

    async getTransactions() {
        const response = await fetch('/api/get-transactions');
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        return await response.json();
    },

    async postTransaction(transaction) {
        const response = await fetch('/api/post-transaction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction)
        });
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        return await response.json();
    }
};