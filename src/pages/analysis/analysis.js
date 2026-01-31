import { API } from "../../core/api-client.js";

const spendingPieChartEl = document.getElementById("spending-chart");
const spendingBarChartEl = document.getElementById("spending-bar-chart");

const renderCharts = (data) => {
  const textColor = getComputedStyle(document.body).getPropertyValue("--app-text");

  new Chart(spendingPieChartEl, {
    type: "pie",
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: textColor,
          },
        },
        title: {
          display: true,
          text: "Spending Overview",
          color: textColor,
          font: {
            size: 16,
          },
        },
      },
    },
  });

  new Chart(spendingBarChartEl, {
    type: "bar",
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: true,
          text: "Category Spending Breakdown",
          color: textColor,
          font: {
            size: 16,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: textColor,
          },
          grid: {
            color: getComputedStyle(document.body).getPropertyValue(
              "--app-border"
            ),
          },
        },
        x: {
          ticks: {
            color: textColor,
          },
          grid: {
            display: false,
          },
        },
      },
    },
  });
};

const processTransactions = (transactions) => {
  const spending = {};
  const incomeCategories = [
    "Salary",
    "P2P Inflow",
    "Gifts",
    "Rewards",
    "Refund",
    "Primary Salary",
    "Bonus/Transfer",
    "Savings",
  ];

  transactions.forEach((transaction) => {
    if (
      !incomeCategories.includes(transaction.category) &&
      transaction.amountDR > 0
    ) {
      if (spending[transaction.category]) {
        spending[transaction.category] += transaction.amountDR;
      } else {
        spending[transaction.category] = transaction.amountDR;
      }
    }
  });

  // Sort categories by spending amount
  const sortedSpending = Object.entries(spending).sort(([, a], [, b]) => b - a);

  const labels = sortedSpending.map(([category]) => category);
  const data = sortedSpending.map(([, amount]) => amount);

  const generateColors = (numColors) => {
    const colors = [];
    for (let i = 0; i < numColors; i++) {
      const hue = (i * (360 / numColors) * 0.6 + 200) % 360;
      colors.push(`hsl(${hue}, 70%, 50%)`);
    }
    return colors;
  };

  const backgroundColors = generateColors(labels.length);

  return {
    labels: labels,
    datasets: [
      {
        label: "Spending",
        data: data,
        backgroundColor: backgroundColors,
      },
    ],
  };
};

const init = async () => {
  try {
    const transactions = await API.getTransactions();
    const chartData = processTransactions(transactions);
    renderCharts(chartData);
  } catch (error) {
    console.error("Error fetching or processing transactions:", error);
  }
};

init();
