async function refreshEngine() {
    try {
        // Calling your Netlify Function
        const response = await fetch('/.netlify/functions/engine');
        const data = await response.json();

        // Update UI elements
        document.getElementById('family-debt-display').innerText = `₹${data.familyGoal.toFixed(2)}`;
        document.getElementById('wallet-display').innerText = `₹${(data.salary * 0.4).toFixed(2)}`;
        
        // Update Progress Bar
        const fill = document.getElementById('progress-bar-fill');
        const percentText = document.getElementById('progress-percent');
        
        const currentProgress = Math.min(data.progress, 100);
        fill.style.width = `${currentProgress}%`;
        percentText.innerText = `${currentProgress.toFixed(1)}%`;

        // Logic Visual Feedback: If progress is low due to debt, make it red
        fill.style.backgroundColor = currentProgress < 30 ? '#ef4444' : '#10b981';

    } catch (error) {
        console.error("Engine Sync Failed:", error);
    }
}

// Run on load
window.onload = refreshEngine;