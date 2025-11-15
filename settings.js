// --- settings.js ---
// Manages the Settings (Profile) page (settings.html)

document.addEventListener('DOMContentLoaded', () => {
    // --- Page Elements ---
    const endMonthBtn = document.getElementById('end-month-btn');

    // --- New Modal Elements ---
    const modal = document.getElementById('profile-modal');
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const closeBtn = document.getElementById('close-modal-btn');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const profileForm = document.getElementById('profile-form');

    // --- New Form Input Elements ---
    const formName = document.getElementById('profile-form-name');
    const formId = document.getElementById('profile-form-id');
    const formPan = document.getElementById('profile-form-pan');
    const formPf = document.getElementById('profile-form-pf');
    const formUan = document.getElementById('profile-form-uan');
    const formGross = document.getElementById('profile-form-gross');
    const formDeductions = document.getElementById('profile-form-deductions');
    const formNet = document.getElementById('profile-form-net');

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
        document.getElementById('profile-name').textContent = profile.Emp_Name || 'Profile Not Set';
        document.getElementById('profile-emp-id').textContent = profile.Employee_No || '-';
        document.getElementById('profile-pan').textContent = profile.PAN_No || '-';
        document.getElementById('profile-pf').textContent = profile.PF_No || '-';
        document.getElementById('profile-uan').textContent = profile.UAN_No || '-';

        // Populate Salary Card
        document.getElementById('profile-gross').textContent = formatCurrency(profile.Gross_Salary || 0);
        document.getElementById('profile-deductions').textContent = formatCurrency(profile.Total_Deductions || 0);
        document.getElementById('profile-net').textContent = formatCurrency(profile.Net_Salary || 0);

        // --- NEW: Also fill the *form* with existing data ---
        formName.value = profile.Emp_Name || '';
        formId.value = profile.Employee_No || '';
        formPan.value = profile.PAN_No || '';
        formPf.value = profile.PF_No || '';
        formUan.value = profile.UAN_No || '';
        formGross.value = profile.Gross_Salary || '';
        formDeductions.value = profile.Total_Deductions || '';
        formNet.value = profile.Net_Salary || '';
    };

    // --- NEW: Modal Show/Hide Functions ---
    const showModal = () => modal.classList.add('visible');
    const hideModal = () => modal.classList.remove('visible');

    // --- NEW: Handle Profile Form Save ---
    const saveProfile = async (e) => {
        e.preventDefault(); // Stop form from reloading page

        // Collect data from the form
        const profileData = {
            Emp_Name: formName.value,
            Employee_No: formId.value,
            PAN_No: formPan.value,
            PF_No: formPf.value,
            UAN_No: formUan.value,
            Gross_Salary: parseFloat(formGross.value),
            Total_Deductions: parseFloat(formDeductions.value),
            Net_Salary: parseFloat(formNet.value)
        };

        // Validate
        if (!profileData.Emp_Name || !profileData.PAN_No || !profileData.Net_Salary) {
            alert('Please fill in at least Name, PAN, and Net Salary.');
            return;
        }

        saveProfileBtn.disabled = true;
        saveProfileBtn.textContent = 'Saving...';

        const result = await callApi('updateProfile', profileData);

        if (result && result.success) {
            alert('Profile Updated Successfully!');
            hideModal();
            loadProfileData(); // Reload the page data to show new values
        }

        saveProfileBtn.disabled = false;
        saveProfileBtn.textContent = 'Save Profile';
    };

    // --- Initialization and Event Handlers ---

    // 1. Load the profile data on page load
    loadProfileData();

    // 2. END OF MONTH Logic (This stays the same)
    if (endMonthBtn) {
        endMonthBtn.addEventListener('click', async () => {
            if (confirm('Are you SURE you want to end the month?')) {
                const result = await callApi('runMonthEnd');
                if (result && result.success) {
                    alert(`Success! Month archived.\nNew rollover: ${formatCurrency(result.newOpeningBalance)}`);
                    loadProfileData(); 
                }
            }
        });
    }

    // --- NEW: Event Listeners for Modal ---
    editProfileBtn.addEventListener('click', showModal);
    closeBtn.addEventListener('click', hideModal);
    profileForm.addEventListener('submit', saveProfile);
});