export const NavBar = {
  init() {
    const navContainer = document.getElementById("nav-container");
    if (!navContainer) return;

    // Detect current page
    const path = window.location.pathname;
    const isDashboard = path.includes("dashboard");
    const isAnalysis = path.includes("analysis");
    const isHistory = path.includes("history");
    const isPortfolio = path.includes("portfolio");
    const isAdd = path.includes("add-transaction");

    // HTML Template
    navContainer.innerHTML = `
      <nav class="fixed bottom-0 w-full bg-app-card/90 border-t border-app-border backdrop-blur-lg flex justify-around p-4 z-50">
        <a href="../dashboard/index.html" class="flex flex-col items-center ${
          isDashboard ? "text-amber-500" : "text-app-muted"
        } transition-colors">
            <i class="fas fa-chart-pie text-xl mb-1"></i>
            <span class="text-[10px] font-bold uppercase tracking-wide">Dash</span>
        </a>

        <a href="../analysis/index.html" class="flex flex-col items-center ${
          isAnalysis ? "text-amber-500" : "text-app-muted"
        } transition-colors">
            <i class="fas fa-chart-line text-xl mb-1"></i>
            <span class="text-[10px] font-bold uppercase tracking-wide">Analysis</span>
        </a>
        
        <a href="../add-transaction/index.html" class="flex flex-col items-center ${
          isAdd ? "text-amber-500" : "text-app-muted"
        } transition-colors">
            <div class="bg-app-accent/10 p-2 rounded-full -mt-6 border border-app-accent/50 shadow-lg shadow-app-accent/20">
                <i class="fas fa-plus text-app-accent text-xl"></i>
            </div>
        </a>

        <a href="../history/index.html" class="flex flex-col items-center ${
          isHistory ? "text-amber-500" : "text-app-muted"
        } transition-colors">
             <i class="fas fa-list text-xl mb-1"></i>
            <span class="text-[10px] font-bold uppercase tracking-wide">History</span>
        </a>

        <a href="../portfolio/index.html" class="flex flex-col items-center ${
          isPortfolio ? "text-amber-500" : "text-app-muted"
        } transition-colors">
            <i class="fas fa-wallet text-xl mb-1"></i>
            <span class="text-[10px] font-bold uppercase tracking-wide">Wealth</span>
        </a>
      </nav>
    `;
  },
};
