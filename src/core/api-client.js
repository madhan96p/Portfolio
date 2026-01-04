export const API = {
    async getDashboard() {
        // We use the redirect prefix we just set in toml
        const response = await fetch('/api/get-dashboard');
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        return await response.json();
    }
};