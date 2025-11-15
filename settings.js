// --- settings.js ---
// Manages the Settings (Profile) page (settings.html)

document.addEventListener('DOMContentLoaded', () => {
    // --- Page Elements ---
    const endMonthBtn = document.getElementById('end-month-btn');

    /**
     * Loads profile and salary data to display on the page.
     */
    const loadProfileData = async () => {
        const result = await callApi('getTrackerData');

        if (!result || !result.data || !result.data.config) {
            document.getElementById('profile-name').textContent = "Error loading data.";
            return;
        }

        const profile = result.data.config;

        // Populate Profile Card
        document.getElementById('profile-name').textContent = profile.Emp_Name || 'N/A';
        document.getElementById('profile-emp-id').textContent = profile.Employee_No || '-';
        document.getElementById('profile-pan').textContent = profile.PAN_No || '-';
        document.getElementById('profile-pf').textContent = profile.PF_No || '-';
        document.getElementById('profile-uan').textContent = profile.UAN_No || '-';

        // Populate Salary Card (using formatCurrency from common.js)
        document.getElementById('profile-gross').textContent = formatCurrency(profile.Gross_Salary || 0);
        document.getElementById('profile-deductions').textContent = formatCurrency(profile.Total_Deductions || 0);
        document.getElementById('profile-net').textContent = formatCurrency(profile.Net_Salary || 0);
    };

    // --- Initialization and Event Handlers ---

    // 1. Load the profile data on page load
    loadProfileData();

    // 2. END OF MONTH Logic (This stays the same)
    if (endMonthBtn) {
        endMonthBtn.addEventListener('click', async () => {
            if (confirm('Are you SURE you want to end the month? This will archive your totals and reset the dashboard.')) {

                const result = await callApi('runMonthEnd');
                if (result && result.success) {
                    alert(`Success! Month archived.\nYour rollover balance for the new month is: ${formatCurrency(result.newOpeningBalance)}`);
                    loadProfileData(); 
                }
            }
        });
    }
});