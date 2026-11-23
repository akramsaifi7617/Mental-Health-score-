
const API_URL = "/predict";

// IMPORTANT:
// This assumes your model score is on a 0-100 scale.
// Change this if your target variable uses a different scale.
const MAX_SCORE = 100;

const form = document.getElementById("predictionForm");
const predictBtn = document.getElementById("predictBtn");
const errorMessage = document.getElementById("errorMessage");
const dashboard = document.getElementById("dashboard");

let historyChart = null;

// ========================================
// 1. RANGE SLIDERS
// ========================================

const sliders = [
    ["usage", "usageValue"],
    ["study", "studyValue"],
    ["activity", "activityValue"],
    ["sleep", "sleepValue"]
];

sliders.forEach(([sliderId, outputId]) => {

    const slider = document.getElementById(sliderId);
    const output = document.getElementById(outputId);

    slider.addEventListener("input", () => {
        output.textContent = slider.value;
    });

});

// ========================================
// 2. GET FORM DATA
// ========================================

function getFormData() {

    return {

        age: Number(document.getElementById("age").value),

        gender: document.getElementById("gender").value,

        country: document.getElementById("country").value.trim(),

        academic_level:
            document.getElementById("academic_level").value,

        most_used_platform:
            document.getElementById("platform").value,

        purpose_of_use:
            document.getElementById("purpose").value,

        avg_daily_usage_hours:
            Number(document.getElementById("usage").value),

        daily_unlocks:
            Number(document.getElementById("unlocks").value),

        study_hours:
            Number(document.getElementById("study").value),

        physical_activity_hours:
            Number(document.getElementById("activity").value),

        sleep_hours_per_night:
            Number(document.getElementById("sleep").value),

        stress_level:
            document.getElementById("stress").value

    };

}

// ========================================
// 3. ERROR HANDLING
// ========================================

function showError(message) {

    errorMessage.textContent = message;

}

function clearError() {

    errorMessage.textContent = "";

}

// ========================================
// 4. GET HISTORY FROM LOCAL STORAGE
// ========================================

function getHistory() {

    try {

        return JSON.parse(
            localStorage.getItem("mindspace_history")
        ) || [];

    }

    catch (error) {

        console.error("History loading error:", error);

        return [];

    }

}

// ========================================
// 5. SAVE PREDICTION HISTORY
// ========================================

function saveHistory(record) {

    const history = getHistory();

    history.unshift(record);

    // Keep latest 20 predictions
    const updatedHistory = history.slice(0, 20);

    localStorage.setItem(
        "mindspace_history",
        JSON.stringify(updatedHistory)
    );

}

// ========================================
// 6. GENERATE PREDICTION
// ========================================

form.addEventListener("submit", async function(event) {

    event.preventDefault();

    clearError();

    if (!form.reportValidity()) {
        return;
    }

    const inputData = getFormData();

    if (!inputData.country) {

        showError("Please enter your country.");

        return;

    }

    predictBtn.disabled = true;

    predictBtn.textContent = "Analyzing your data...";

    try {

        const response = await fetch(API_URL, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(inputData)

        });

        const result = await response.json();

        if (!response.ok) {

            const detail = result.detail;

            const message = Array.isArray(detail)
                ? detail.map(item =>
                    `${item.loc?.at(-1) || "Field"}: ${item.msg}`
                  ).join(" | ")
                : detail || `API Error: ${response.status}`;

            throw new Error(message);

        }

        const prediction =
            Number(result.predicted_mental_health_score);

        if (!Number.isFinite(prediction)) {

            throw new Error("Invalid prediction received from API.");

        }

        // Create history record

        const record = {

            score: prediction,

            platform: inputData.most_used_platform,

            stress: inputData.stress_level,

            sleep: inputData.sleep_hours_per_night,

            date: new Date().toLocaleString()

        };

        // Save record

        saveHistory(record);

        // Update dashboard

        displayPrediction(record);

        // Display dashboard

        dashboard.classList.remove("hidden");

        // Scroll to results

        dashboard.scrollIntoView({

            behavior: "smooth",

            block: "start"

        });

    }

    catch(error) {

        console.error(error);

        if (error instanceof TypeError) {

            showError(
                "Cannot connect to FastAPI. Please start your backend and check the API URL and CORS settings."
            );

        }

        else {

            showError(error.message);

        }

    }

    finally {

        predictBtn.disabled = false;

        predictBtn.textContent = "Generate Prediction →";

    }

});

// ========================================
// 7. DISPLAY PREDICTION
// ========================================

function displayPrediction(record) {

    const score = record.score;

    // Update score

    document.getElementById("scoreValue").textContent =
        score.toFixed(2);

    document.getElementById("summaryScore").textContent =
        score.toFixed(2);

    // Update summary

    document.getElementById("summaryPlatform").textContent =
        record.platform;

    document.getElementById("summaryStress").textContent =
        record.stress;

    document.getElementById("summarySleep").textContent =
        record.sleep + " Hours";

    document.getElementById("summaryDate").textContent =
        record.date;

    // Update gauge

    updateGauge(score);

    // Update chart

    renderChart();

    // Update history table

    renderHistory();

}

// ========================================
// 8. ANIMATED SCORE GAUGE
// ========================================

function updateGauge(score) {

    const gauge = document.getElementById("gauge");

    // Convert score into percentage of configured scale

    const percentage = Math.max(
        0,
        Math.min(100, (score / MAX_SCORE) * 100)
    );

    const degrees = percentage * 3.6;

    gauge.style.background = `
        conic-gradient(
            #6bdcc3 0deg,
            #929fff ${degrees}deg,
            #29374e ${degrees}deg,
            #29374e 360deg
        )
    `;

}

// ========================================
// 9. PREDICTION HISTORY CHART
// ========================================

function renderChart() {

    const history = getHistory();

    const ctx = document
        .getElementById("historyChart")
        .getContext("2d");

    // Destroy old chart before creating a new one

    if (historyChart) {

        historyChart.destroy();

    }

    // Reverse history to display oldest first

    const chartHistory = [...history].reverse();

    const labels = chartHistory.map((item, index) => {

        return `Prediction ${index + 1}`;

    });

    const scores = chartHistory.map(item => item.score);

    historyChart = new Chart(ctx, {

        type: "line",

        data: {

            labels: labels,

            datasets: [{

                label: "Predicted Score",

                data: scores,

                borderColor: "#929fff",

                backgroundColor: "rgba(146,159,255,0.15)",

                borderWidth: 3,

                fill: true,

                tension: 0.4,

                pointBackgroundColor: "#6bdcc3",

                pointBorderColor: "#ffffff",

                pointRadius: 5,

                pointHoverRadius: 8

            }]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {

                legend: {

                    labels: {

                        color: "#cbd5e8"

                    }

                }

            },

            scales: {

                y: {

                    min: 0,

                    max: MAX_SCORE,

                    ticks: {

                        color: "#9ba9bf"

                    },

                    grid: {

                        color: "rgba(255,255,255,0.07)"

                    }

                },

                x: {

                    ticks: {

                        color: "#9ba9bf"

                    },

                    grid: {

                        display: false

                    }

                }

            }

        }

    });

}

// ========================================
// 10. DISPLAY HISTORY TABLE
// ========================================

function renderHistory() {

    const history = getHistory();

    const table = document.getElementById("historyTable");

    table.innerHTML = "";

    if (history.length === 0) {

        const row = document.createElement("tr");

        const cell = document.createElement("td");

        cell.colSpan = 5;

        cell.textContent = "No predictions available yet.";

        row.appendChild(cell);

        table.appendChild(row);

        return;

    }

    history.forEach((item, index) => {

        const row = document.createElement("tr");

        const values = [

            index + 1,

            item.date,

            Number(item.score).toFixed(2),

            item.platform,

            item.stress

        ];

        values.forEach(value => {

            const cell = document.createElement("td");

            cell.textContent = value;

            row.appendChild(cell);

        });

        table.appendChild(row);

    });

}

// ========================================
// 11. CLEAR HISTORY
// ========================================

document.getElementById("clearHistory")
    .addEventListener("click", function() {

        const confirmDelete = confirm(
            "Are you sure you want to delete all prediction history?"
        );

        if (!confirmDelete) {
            return;
        }

        localStorage.removeItem("mindspace_history");

        renderHistory();

        renderChart();

        dashboard.classList.add("hidden");

    });

// ========================================
// 12. RESET FORM
// ========================================

form.addEventListener("reset", function() {

    setTimeout(() => {

        clearError();

        sliders.forEach(([sliderId, outputId]) => {

            const slider = document.getElementById(sliderId);

            document.getElementById(outputId).textContent =
                slider.value;

        });

    }, 0);

});

// ========================================
// 13. LOAD PREVIOUS HISTORY ON START
// ========================================

window.addEventListener("DOMContentLoaded", function() {

    const history = getHistory();

    if (history.length > 0) {

        renderChart();

        renderHistory();

    }

});
