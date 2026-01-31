import { API } from "../../core/api-client.js";

const spendingChartEl = document.getElementById("spending-chart");

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
    if (!incomeCategories.includes(transaction.Category)) {
      if (spending[transaction.Category]) {
        spending[transaction.Category] += transaction.Amount;
      } else {
        spending[transaction.Category] = transaction.Amount;
      }
    }
  });

  const labels = Object.keys(spending);
  const data = Object.values(spending);

  // Function to generate random colors
  const generateColors = (numColors) => {
    const colors = [];
    for (let i = 0; i < numColors; i++) {
      colors.push(`#${Math.floor(Math.random() * 16777215).toString(16)}`);
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
    renderChart(chartData);
  } catch (error) {
    console.error("Error fetching or processing transactions:", error);
    // Optionally, display an error message to the user
  }
};

init();
