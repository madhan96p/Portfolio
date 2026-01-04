// --- auth.js ---
// This script runs immediately and blocks the page
(function() {
    // We get the stored password from the browser's session storage
    const isAuthenticated = sessionStorage.getItem('tracker-auth');
    
    // IMPORTANT: Change this! This password is VISIBLE to anyone.
    const correctPassword = 'Madhan@1482'; 

    if (isAuthenticated === 'true') {
        // If they are already authenticated in this session, do nothing.
        return;
    }

    // If not authenticated, show the password prompt
    const password = prompt("Enter Password to Access Tracker:", "");

    if (password === correctPassword) {
        // If password is correct, store this info for the session
        alert("Access Granted!");
        sessionStorage.setItem('tracker-auth', 'true');
    } else {
        // If password is wrong, block access and redirect them
        alert("Incorrect Password. Access Denied.");
        // Redirect to your main portfolio
        window.location.href = "https://pragadeeshfolio.netlify.app"; 
    }
})();