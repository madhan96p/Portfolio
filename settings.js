// --- settings.js ---
// Manages the Settings page (settings.html)

document.addEventListener('DOMContentLoaded', () => {
    // Settings Page Elements
    const settingsForm = document.getElementById('settings-form');
    const salaryInput = document.getElementById('salary-input'); // Renamed from salary-goal
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const endMonthBtn = document.getElementById('end-month-btn');

    /**
     * Loads just the config data needed for the settings page.
     */
    const loadSettings = async () => {
        const result = await callApi('getTrackerData');
        if (result && result.data) {
            if (salaryInput) {
                salaryInput.value = parseFloat(result.data.config.Total_Salary || 0);
            }
        }
    };

    // --- Initialization and Event Handlers ---

    // 1. SETTINGS PAGE Logic
    if (settingsForm) {
        loadSettings(); // Load current salary

        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newSalary = parseFloat(salaryInput.value);
            if (isNaN(newSalary) || newSalary < 0) {
                alert('Please enter a valid salary.');
                return;
            }

            saveSettingsBtn.disabled = true;
            saveSettingsBtn.textContent = 'Saving...';
            // The global `callApi` function is from common.js
            await callApi('updateSalaryGoal', { newSalary });
            saveSettingsBtn.disabled = false;
            saveSettingsBtn.textContent = 'Save Salary';
            alert('Salary updated!');
        });
    }

    // 2. END OF MONTH Logic
    if (endMonthBtn) {
        endMonthBtn.addEventListener('click', async () => {
            if (confirm('Are you SURE you want to end the month? This will archive your totals and reset the dashboard.')) {
                // The global `callApi` function is from common.js
                const result = await callApi('runMonthEnd');
                if (result && result.success) {
                    alert(`Success! Month archived.\nYour rollover balance for the new month is: ${formatCurrency(result.newOpeningBalance)}`);
                    loadSettings(); // Reload settings page to show new state (salary)
                }
            }
        });
    }
});