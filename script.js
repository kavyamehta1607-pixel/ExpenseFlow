
// ==========================================
// ExpenseFlow - Personal Expense Tracker
// ==========================================

const STORAGE_KEY = "expenseFlowTransactions";

const $ = (selector) => document.querySelector(selector);

const elements = {
    totalBalance: $("#totalBalance"),
    totalIncome: $("#totalIncome"),
    totalExpenses: $("#totalExpenses"),
    totalTransactions: $("#totalTransactions"),
    transactionList: $("#transactionList"),
    emptyState: $("#emptyState"),
    transactionCount: $("#transactionCount"),
    modal: $("#transactionModal"),
    form: $("#transactionForm"),
    title: $("#title"),
    amount: $("#amount"),
    type: $("#type"),
    category: $("#category"),
    date: $("#date"),
    searchInput: $("#searchInput"),
    filterType: $("#filterType"),
    categoryLegend: $("#categoryLegend"),
    clearAllBtn: $("#clearAllBtn"),
    toast: $("#toast")
};

let transactions = loadTransactions();
let overviewChart = null;
let categoryChart = null;
let toastTimer;

const categoryColors = [
    "#a78bfa",
    "#4ade80",
    "#60a5fa",
    "#fb7185",
    "#fbbf24",
    "#22d3ee",
    "#f472b6",
    "#818cf8",
    "#94a3b8"
];

// Format currency as Indian Rupees.
function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

// Return today's local date.
function getToday() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// Format date for the transaction table.
function formatDate(dateString) {
    if (!dateString) return "—";

    const parts = dateString.split("-");

    if (parts.length !== 3) return "—";

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Load saved transactions safely.
function loadTransactions() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) return [];

        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed)) return [];

        return parsed.filter((item) =>
            item &&
            typeof item.id === "string" &&
            typeof item.title === "string" &&
            typeof item.amount === "number" &&
            Number.isFinite(item.amount) &&
            item.amount > 0 &&
            ["income", "expense"].includes(item.type) &&
            typeof item.category === "string" &&
            typeof item.date === "string"
        );
    } catch (error) {
        console.error("Error loading transactions:", error);
        return [];
    }
}

// Save transactions to browser storage.
function saveTransactions() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(transactions)
        );

        return true;
    } catch (error) {
        console.error("Error saving transactions:", error);
        showToast("Unable to save data. Check browser storage.");
        return false;
    }
}

// Show a notification.
function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        elements.toast.classList.remove("show");
    }, 2800);
}

// Open the transaction form.
function openModal() {
    elements.form.reset();
    elements.date.value = getToday();
    elements.type.value = "expense";
    elements.category.value = "Food";

    elements.modal.classList.add("show");
    elements.title.focus();
}

// Close the transaction form.
function closeModal() {
    elements.modal.classList.remove("show");
}

// Calculate income, expenses, and balance.
function calculateTotals() {
    let income = 0;
    let expenses = 0;

    transactions.forEach((transaction) => {
        if (transaction.type === "income") {
            income += transaction.amount;
        } else {
            expenses += transaction.amount;
        }
    });

    return {
        income,
        expenses,
        balance: income - expenses
    };
}

// Update dashboard summary cards.
function updateSummary() {
    const totals = calculateTotals();

    elements.totalBalance.textContent =
        formatCurrency(totals.balance);

    elements.totalIncome.textContent =
        formatCurrency(totals.income);

    elements.totalExpenses.textContent =
        formatCurrency(totals.expenses);

    elements.totalTransactions.textContent =
        transactions.length;
}

// Create a table cell safely.
function createCell(className, text) {
    const cell = document.createElement("td");

    if (className) {
        cell.className = className;
    }

    cell.textContent = text;

    return cell;
}

// Render the transaction table.
function renderTransactions() {
    const searchTerm = elements.searchInput.value
        .trim()
        .toLowerCase();

    const selectedType = elements.filterType.value;

    const filteredTransactions = [...transactions]
        .filter((transaction) => {
            const matchesSearch =
                transaction.title.toLowerCase().includes(searchTerm) ||
                transaction.category.toLowerCase().includes(searchTerm);

            const matchesType =
                selectedType === "all" ||
                transaction.type === selectedType;

            return matchesSearch && matchesType;
        })
        .sort((a, b) =>
            b.date.localeCompare(a.date) ||
            b.id.localeCompare(a.id)
        );

    elements.transactionList.replaceChildren();

    filteredTransactions.forEach((transaction) => {
        const row = document.createElement("tr");

        row.appendChild(
            createCell("transaction-name", transaction.title)
        );

        const categoryCell = document.createElement("td");
        const categoryBadge = document.createElement("span");

        categoryBadge.className = "transaction-category";
        categoryBadge.textContent = transaction.category;

        categoryCell.appendChild(categoryBadge);
        row.appendChild(categoryCell);

        row.appendChild(
            createCell("", formatDate(transaction.date))
        );

        const typeCell = document.createElement("td");
        const typeBadge = document.createElement("span");

        typeBadge.className =
            "type-badge " +
            (transaction.type === "income"
                ? "type-income"
                : "type-expense");

        typeBadge.textContent =
            transaction.type === "income" ? "Income" : "Expense";

        typeCell.appendChild(typeBadge);
        row.appendChild(typeCell);

        const amountText =
            (transaction.type === "income" ? "+" : "−") +
            formatCurrency(transaction.amount);

        row.appendChild(
            createCell(
                transaction.type === "income"
                    ? "amount-income"
                    : "amount-expense",
                amountText
            )
        );

        const actionCell = document.createElement("td");
        const deleteButton = document.createElement("button");

        deleteButton.type = "button";
        deleteButton.className = "delete-button";
        deleteButton.textContent = "Delete";

        deleteButton.setAttribute(
            "aria-label",
            `Delete transaction ${transaction.title}`
        );

        deleteButton.addEventListener("click", () => {
            deleteTransaction(transaction.id);
        });

        actionCell.appendChild(deleteButton);
        row.appendChild(actionCell);

        elements.transactionList.appendChild(row);
    });

    const hasTransactions = transactions.length > 0;
    const hasMatches = filteredTransactions.length > 0;

    elements.emptyState.style.display = hasMatches ? "none" : "block";

    $(".table-wrapper").style.display =
        hasMatches ? "block" : "none";

    elements.transactionCount.textContent =
        `Showing ${filteredTransactions.length} of ${transactions.length} transactions`;

    elements.clearAllBtn.style.visibility =
        hasTransactions ? "visible" : "hidden";

    const emptyHeading = elements.emptyState.querySelector("h3");
    const emptyMessage = elements.emptyState.querySelector("p");
    const emptyButton = $("#emptyAddBtn");

    if (!hasTransactions) {
        emptyHeading.textContent = "No transactions yet";
        emptyMessage.textContent =
            "Add your first transaction to start tracking your money.";

        emptyButton.style.display = "inline-flex";
    } else if (!hasMatches) {
        emptyHeading.textContent = "No matching transactions";
        emptyMessage.textContent =
            "Try another search term or transaction filter.";

        emptyButton.style.display = "none";
    }
}

// Delete a single transaction.
function deleteTransaction(id) {
    const previousTransactions = transactions;

    transactions = transactions.filter(
        (transaction) => transaction.id !== id
    );

    if (!saveTransactions()) {
        transactions = previousTransactions;
        return;
    }

    refreshDashboard();
    showToast("Transaction deleted successfully.");
}

// Update both charts.
function updateCharts() {
    if (typeof Chart === "undefined") {
        console.warn(
            "Chart.js is unavailable. Check your internet connection."
        );
        return;
    }

    const totals = calculateTotals();

    // Income vs. expenses chart.
    if (overviewChart) {
        overviewChart.destroy();
    }

    overviewChart = new Chart($("#overviewChart"), {
        type: "bar",

        data: {
            labels: ["Income", "Expenses"],
            datasets: [{
                label: "Amount",
                data: [totals.income, totals.expenses],
                backgroundColor: ["#a78bfa", "#fb7185"],
                borderRadius: 8,
                borderSkipped: false,
                maxBarThickness: 65
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: false
                },

                tooltip: {
                    callbacks: {
                        label: (context) =>
                            formatCurrency(context.parsed.y)
                    }
                }
            },

            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: "#9292a7"
                    },
                    border: {
                        display: false
                    }
                },

                y: {
                    beginAtZero: true,

                    grid: {
                        color: "#292936"
                    },

                    ticks: {
                        color: "#9292a7",
                        callback: (value) =>
                            "₹" + Number(value).toLocaleString("en-IN")
                    },

                    border: {
                        display: false
                    }
                }
            }
        }
    });

    // Calculate expense totals by category.
    const categoryTotals = {};

    transactions
        .filter((transaction) => transaction.type === "expense")
        .forEach((transaction) => {
            categoryTotals[transaction.category] =
                (categoryTotals[transaction.category] || 0) +
                transaction.amount;
        });

    const categories = Object.keys(categoryTotals);
    const amounts = categories.map(
        (category) => categoryTotals[category]
    );

    if (categoryChart) {
        categoryChart.destroy();
    }

    categoryChart = new Chart($("#categoryChart"), {
        type: "doughnut",

        data: {
            labels: categories.length ? categories : ["No expenses"],

            datasets: [{
                data: categories.length ? amounts : [1],

                backgroundColor: categories.length
                    ? categories.map(
                        (_, index) =>
                            categoryColors[index % categoryColors.length]
                    )
                    : ["#292936"],

                borderColor: "#15151f",
                borderWidth: 4,
                hoverOffset: 5
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "72%",

            plugins: {
                legend: {
                    display: false
                },

                tooltip: {
                    enabled: categories.length > 0,

                    callbacks: {
                        label: (context) =>
                            `${context.label}: ${formatCurrency(context.parsed)}`
                    }
                }
            }
        }
    });

    // Update category legend.
    elements.categoryLegend.replaceChildren();

    if (categories.length === 0) {
        const message = document.createElement("p");

        message.className = "empty-legend";
        message.textContent =
            "Add expenses to see your breakdown.";

        elements.categoryLegend.appendChild(message);
        return;
    }

    categories.forEach((category, index) => {
        const item = document.createElement("div");
        item.className = "legend-item";

        const dot = document.createElement("span");
        dot.className = "legend-dot";
        dot.style.backgroundColor =
            categoryColors[index % categoryColors.length];

        const name = document.createElement("span");
        name.className = "legend-name";
        name.textContent = category;

        const amount = document.createElement("span");
        amount.className = "legend-amount";
        amount.textContent = formatCurrency(categoryTotals[category]);

        item.append(dot, name, amount);
        elements.categoryLegend.appendChild(item);
    });
}

// Refresh the entire dashboard.
function refreshDashboard() {
    updateSummary();
    renderTransactions();
    updateCharts();
}

// Handle transaction submission.
elements.form.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = elements.title.value.trim();
    const amount = Number(elements.amount.value);
    const type = elements.type.value;
    const category = elements.category.value;
    const date = elements.date.value;

    if (!title) {
        showToast("Please enter a transaction name.");
        elements.title.focus();
        return;
    }

    if (
        !Number.isFinite(amount) ||
        amount <= 0 ||
        amount > 1000000000
    ) {
        showToast("Enter a valid amount greater than zero.");
        elements.amount.focus();
        return;
    }

    if (!["income", "expense"].includes(type)) {
        showToast("Please select a valid transaction type.");
        return;
    }

    if (!category || !date || date > getToday()) {
        showToast("Please enter a valid date and category.");
        return;
    }

    const newTransaction = {
        id: (
            window.crypto &&
            typeof window.crypto.randomUUID === "function"
        )
            ? window.crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`,

        title,
        amount,
        type,
        category,
        date
    };

    transactions.push(newTransaction);

    if (!saveTransactions()) {
        transactions.pop();
        return;
    }

    closeModal();
    refreshDashboard();

    showToast(
        type === "income"
            ? "Income added successfully!"
            : "Expense added successfully!"
    );
});

// Open and close form buttons.
$("#openFormBtn").addEventListener("click", openModal);
$("#emptyAddBtn").addEventListener("click", openModal);
$("#closeFormBtn").addEventListener("click", closeModal);
$("#cancelFormBtn").addEventListener("click", closeModal);

// Close modal when clicking the background.
elements.modal.addEventListener("click", (event) => {
    if (event.target === elements.modal) {
        closeModal();
    }
});

// Close modal with Escape.
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeModal();
    }
});

// Search and filter transactions.
elements.searchInput.addEventListener(
    "input",
    renderTransactions
);

elements.filterType.addEventListener(
    "change",
    renderTransactions
);

// Delete all transactions.
elements.clearAllBtn.addEventListener("click", () => {
    if (transactions.length === 0) return;

    const confirmed = window.confirm(
        "Delete all transactions? This cannot be undone."
    );

    if (!confirmed) return;

    const previousTransactions = transactions;
    transactions = [];

    if (!saveTransactions()) {
        transactions = previousTransactions;
        return;
    }

    refreshDashboard();
    showToast("All transactions cleared.");
});

// Highlight active navigation item.
document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
        document.querySelectorAll(".nav-item").forEach((link) => {
            link.classList.remove("active");
        });

        item.classList.add("active");
    });
});

// Initial setup.
elements.date.value = getToday();
refreshDashboard();

