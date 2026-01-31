import { apiClient } from "../../core/api-client.js";
import { stateManager } from "../../core/state-manager.js";

const spendingChartEl = document.getElementById("spending-chart");

const MOCK_DATA = {
  labels: [
    "Equity",
    "Misc",
    "Transport",
    "P2P Inflow",
    "P2P Outflow",
    "Food & Dining",
    "Utilities",
    "Groceries",
    "Bank Charges",
    "Salary",
  ],
  datasets: [
    {
      label: "Spending",
      data: [1200, 1900, 300, 500, 200, 3000, 1500, 800, 100, 5000],
      backgroundColor: [
        "#FF6384",
        "#36A2EB",
        "#FFCE56",
        "#4BC0C0",
        "#9966FF",
        "#FF9F40",
        "#C9CBCF",
        "#7C6E_F3",
        "#00A8E0",
        "#E0A000",
      ],
    },
  ],
};

const renderChart = (data) => {
  new Chart(spendingChartEl, {
    type: "doughnut",
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: getComputedStyle(document.body).getPropertyValue(
              "--app-text"
            ),
          },
        },
      },
    },
  });
};

const init = async () => {
  renderChart(MOCK_DATA);
};

init();
