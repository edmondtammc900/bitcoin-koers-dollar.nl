// API Keys - Replace these with your actual API keys
const NEWS_API_KEY = "3d7fb2fdb06d49b3aeebb560c983273a";

// DOM Elements
const bitcoinPriceElement = document.getElementById("bitcoin-price");
const priceChangeElement = document.getElementById("price-change");
const priceChart = document.getElementById("priceChart");
const burger = document.querySelector(".burger");
const navLinks = document.querySelector(".nav-links");

// CFD Calculator Elements
const positionType = document.getElementById("position-type");
const entryPrice = document.getElementById("entry-price");
const exitPrice = document.getElementById("exit-price");
const marginRequirement = document.getElementById("margin-requirement");
const leverageRatio = document.getElementById("leverage-ratio");
const calculateProfitBtn = document.getElementById("calculate-profit");
const profitResult = document.getElementById("profit-result");

const positionSize = document.getElementById("position-size");
const marginLeverage = document.getElementById("margin-leverage");
const calculateMarginBtn = document.getElementById("calculate-margin");
const marginResult = document.getElementById("margin-result");

// Tab Elements
const tabButtons = document.querySelectorAll(".tab-btn");
const calculators = document.querySelectorAll(".calculator");

// Tab Switching
tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    // Remove active class from all buttons and calculators
    tabButtons.forEach((btn) => btn.classList.remove("active"));
    calculators.forEach((calc) => calc.classList.remove("active"));

    // Add active class to clicked button and corresponding calculator
    button.classList.add("active");
    const tabId = button.getAttribute("data-tab");
    document.getElementById(`${tabId}-calculator`).classList.add("active");
  });
});

// Mobile Navigation
burger.addEventListener("click", () => {
  navLinks.classList.toggle("active");
  burger.classList.toggle("active");
  document.body.style.overflow = navLinks.classList.contains("active")
    ? "hidden"
    : "";
});

// Close mobile menu when clicking on a nav link
document.querySelectorAll(".nav-links a").forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("active");
    burger.classList.remove("active");
    document.body.style.overflow = "";
  });
});

// CFD Profit Calculator
function calculateProfit() {
  const isLong = positionType.value === "long";
  const entry = parseFloat(entryPrice.value);
  const exit = parseFloat(exitPrice.value);
  const margin = parseFloat(marginRequirement.value);
  const leverage = parseFloat(leverageRatio.value);

  if (isNaN(entry) || isNaN(exit) || isNaN(margin) || isNaN(leverage)) {
    profitResult.textContent = "Voer geldige getallen in";
    return;
  }

  const priceDifference = isLong ? exit - entry : entry - exit;
  const profit = (priceDifference * margin * leverage) / entry;
  profitResult.textContent = `$${profit.toFixed(2)}`;
  profitResult.style.color =
    profit >= 0 ? "var(--success-color)" : "var(--error-color)";
}

// CFD Margin Calculator
function calculateMargin() {
  const size = parseFloat(positionSize.value);
  const leverage = parseFloat(marginLeverage.value);

  if (isNaN(size) || isNaN(leverage)) {
    marginResult.textContent = "Voer geldige getallen in";
    return;
  }

  const margin = size / leverage;
  marginResult.textContent = `$${margin.toFixed(2)}`;
}

// Event Listeners for CFD Calculators
calculateProfitBtn.addEventListener("click", calculateProfit);
calculateMarginBtn.addEventListener("click", calculateMargin);

// Bitcoin Price Chart
let priceChartInstance = null;
let lastPrice = null;
let isFirstLoad = true;

// Store price history
let priceHistory = [];

async function fetchBitcoinPrice() {
  try {
    bitcoinPriceElement.textContent = "Laden...";
    priceChangeElement.textContent = "";

    const response = await fetch(
      "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT"
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const price = parseFloat(data.lastPrice);
    const change = parseFloat(data.priceChangePercent);
    const volume = parseFloat(data.volume);

    return {
      price: price,
      change: change,
      volume: volume,
    };
  } catch (error) {
    console.error("Error fetching Bitcoin price:", error);
    bitcoinPriceElement.textContent = "Koers niet beschikbaar";
    priceChangeElement.textContent = "";
    return null;
  }
}

async function fetchHistoricalData(currentPrice) {
  try {
    // Only return current price point
    return [
      {
        timestamp: new Date(),
        price: currentPrice,
      },
    ];
  } catch (error) {
    console.error("Error generating historical data:", error);
    return null;
  }
}

// Store volume history
let volumeHistory = [];

// Store volume chart instance
let volumeChartInstance = null;
let currentInterval = "5m"; // Default interval

async function fetchHistoricalVolume(interval = "5m") {
  try {
    let limit;
    switch (interval) {
      case "1m":
        limit = 1440; // 24 hours * 60 minutes
        break;
      case "5m":
        limit = 288; // 24 hours * 12 points per hour
        break;
      case "1h":
        limit = 24; // 24 hours
        break;
      default:
        limit = 288;
    }

    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.map((item) => ({
      timestamp: new Date(item[0]),
      volume: parseFloat(item[5]),
    }));
  } catch (error) {
    console.error("Error fetching historical volume:", error);
    return null;
  }
}

function updateVolumeChart(volumeData, interval = "5m") {
  if (!volumeData) return;

  const ctx = document.getElementById("volumeChart").getContext("2d");

  if (volumeChartInstance) {
    volumeChartInstance.destroy();
  }

  const timeFormat = {
    "1m": { hour: "2-digit", minute: "2-digit" },
    "5m": { hour: "2-digit", minute: "2-digit" },
    "1h": { hour: "2-digit" },
  }[interval];

  const maxTicks = {
    "1m": 24,
    "5m": 12,
    "1h": 6,
  }[interval];

  volumeChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: volumeData.map((item) =>
        new Date(item.timestamp).toLocaleTimeString("nl-NL", timeFormat)
      ),
      datasets: [
        {
          label: `Handelsvolume (BTC) - ${
            interval === "1m"
              ? "1 minuut"
              : interval === "5m"
              ? "5 minuten"
              : "1 uur"
          }`,
          data: volumeData.map((item) => item.volume),
          backgroundColor: "rgba(247, 147, 26, 0.5)",
          borderColor: "rgba(247, 147, 26, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
          ticks: {
            color: "#fff",
          },
        },
        x: {
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
          ticks: {
            color: "#fff",
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: maxTicks,
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: "#fff",
          },
        },
      },
    },
  });
}

// Add event listeners for interval toggle buttons
document.querySelectorAll(".interval-btn").forEach((button) => {
  button.addEventListener("click", async () => {
    // Update active state
    document
      .querySelectorAll(".interval-btn")
      .forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    // Update interval and fetch new data
    currentInterval = button.dataset.interval;
    const volumeData = await fetchHistoricalVolume(currentInterval);
    if (volumeData) {
      updateVolumeChart(volumeData, currentInterval);
    }
  });
});

async function updateBitcoinPrice() {
  const data = await fetchBitcoinPrice();
  if (data && data.price) {
    const price = data.price;
    const change = data.change;
    const volume = data.volume;

    // Format price in Dutch locale with USD symbol
    bitcoinPriceElement.textContent = `$${price.toLocaleString("nl-NL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
    priceChangeElement.textContent = `${change >= 0 ? "+" : ""}${change.toFixed(
      2
    )}%`;
    priceChangeElement.style.color =
      change >= 0 ? "var(--success-color)" : "var(--error-color)";

    lastPrice = price;

    // Update chart data
    const historicalData = await fetchHistoricalData(price);
    if (historicalData) {
      updateChart(historicalData);
    }

    // Update volume data with current interval
    const volumeData = await fetchHistoricalVolume(currentInterval);
    if (volumeData) {
      updateVolumeChart(volumeData, currentInterval);
    }
  }
}

function updateChart(historicalData) {
  if (!historicalData) return;

  // Add new data point to history
  priceHistory.push(historicalData[0]);

  // Keep only last 24 hours of data
  const oneDayAgo = new Date().getTime() - 24 * 60 * 60 * 1000;
  priceHistory = priceHistory.filter(
    (point) => point.timestamp.getTime() > oneDayAgo
  );

  const ctx = priceChart.getContext("2d");

  if (priceChartInstance) {
    priceChartInstance.destroy();
  }

  priceChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: priceHistory.map((item) =>
        new Date(item.timestamp).toLocaleTimeString("nl-NL")
      ),
      datasets: [
        {
          label: "Bitcoin Koers (USD) - Realtime Data",
          data: priceHistory.map((item) => item.price),
          borderColor: "#f7931a",
          backgroundColor: "rgba(247, 147, 26, 0.2)",
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "#f7931a",
          pointBorderColor: "#FFFFFF",
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: false,
          grid: {
            color: "rgba(255, 255, 255, 0.2)",
            drawBorder: true,
            borderColor: "rgba(255, 255, 255, 0.3)",
          },
          ticks: {
            color: "#FFFFFF",
            font: {
              size: 12,
            },
            callback: function (value) {
              return (
                "$" +
                value.toLocaleString("nl-NL", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              );
            },
          },
        },
        x: {
          grid: {
            color: "rgba(255, 255, 255, 0.2)",
            drawBorder: true,
            borderColor: "rgba(255, 255, 255, 0.3)",
          },
          ticks: {
            color: "#FFFFFF",
            font: {
              size: 12,
            },
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: "#FFFFFF",
          },
        },
      },
    },
  });
}

// Initial price update
updateBitcoinPrice();

// Update price every 5 seconds
setInterval(updateBitcoinPrice, 5000);

// Tooltip functionality
document.addEventListener("DOMContentLoaded", function () {
  const tooltips = document.querySelectorAll(".info-tooltip");

  tooltips.forEach((tooltip) => {
    tooltip.addEventListener("click", function (e) {
      e.stopPropagation();

      // Close all other tooltips
      tooltips.forEach((t) => {
        if (t !== tooltip) {
          t.classList.remove("active");
        }
      });

      // Toggle current tooltip
      tooltip.classList.toggle("active");
    });
  });

  // Close tooltip when clicking outside
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".info-tooltip")) {
      tooltips.forEach((tooltip) => {
        tooltip.classList.remove("active");
      });
    }
  });
});

// Ticker functionality
const tickerItems = document.querySelector(".ticker-items");
let tickerPosition = 0;
let isPaused = false;
const tickerSpeed = 1; // pixels per frame (adjust this value to control speed)

function updateTicker(newsItems) {
  if (!newsItems || newsItems.length === 0) {
    tickerItems.textContent = "Geen nieuws beschikbaar";
    return;
  }

  // Create ticker items with news titles and links
  const tickerHTML = newsItems
    .map((item) => {
      return `<a href="${item.link}" target="_blank" class="ticker-item">${item.title}</a>`;
    })
    .join(" ");

  // Duplicate the items multiple times for smooth continuous scrolling
  const duplicatedItems =
    tickerHTML +
    " " +
    tickerHTML +
    " " +
    tickerHTML +
    " " +
    tickerHTML +
    " " +
    tickerHTML;

  tickerItems.innerHTML = duplicatedItems;

  // Reset position
  tickerPosition = 0;
  tickerItems.style.transform = `translateX(${tickerPosition}px)`;
}

// Animation frame function
function animateTicker() {
  if (!isPaused) {
    tickerPosition -= tickerSpeed;

    // When we've scrolled one full set of items, reset to the beginning of the second set
    if (tickerPosition <= -tickerItems.offsetWidth / 5) {
      tickerPosition = 0;
    }

    tickerItems.style.transform = `translateX(${tickerPosition}px)`;
  }
  requestAnimationFrame(animateTicker);
}

// Start animation
requestAnimationFrame(animateTicker);

// Pause on hover
tickerItems.addEventListener("mouseenter", () => {
  isPaused = true;
});

tickerItems.addEventListener("mouseleave", () => {
  isPaused = false;
});

// Update the fetchMarketNews function to also update the ticker
async function fetchMarketNews() {
  try {
    const response = await fetch(
      "https://mcgrp.app.n8n.cloud/webhook/rss-bitcoin-koers-dollar"
    );
    if (!response.ok) {
      throw new Error("Failed to fetch market news");
    }
    const text = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");

    // Extract items from RSS feed
    const items = xmlDoc.getElementsByTagName("item");
    const newsItems = Array.from(items).map((item) => ({
      title: item.getElementsByTagName("title")[0]?.textContent || "",
      link: item.getElementsByTagName("link")[0]?.textContent || "",
    }));

    // Update both news feed and ticker
    displayMarketNews(newsItems);
    updateTicker(newsItems);
  } catch (error) {
    console.error("Error fetching news:", error);
    document.getElementById("market-news").innerHTML =
      "<p>Nieuws kon niet worden geladen. Probeer het later opnieuw.</p>";
    tickerItems.textContent = "Nieuws kon niet worden geladen";
  }
}

function displayMarketNews(newsItems) {
  if (!newsItems || !Array.isArray(newsItems) || newsItems.length === 0) {
    document.getElementById("market-news").innerHTML = `
      <div class="news-item">
        <p>Geen nieuws beschikbaar op dit moment.</p>
      </div>
    `;
    return;
  }

  const newsHTML = newsItems
    .map((item) => {
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${
        new URL(item.link).hostname
      }`;
      return `
        <div class="news-item">
          <a href="${item.link}" target="_blank" rel="noopener noreferrer">
            <img src="${faviconUrl}" alt="favicon" class="news-favicon" />
            <span class="news-title">${item.title}</span>
          </a>
        </div>
      `;
    })
    .join("");

  document.getElementById("market-news").innerHTML = newsHTML;
}

// Initial news fetch
fetchMarketNews();

// Update news every 5 minutes
setInterval(fetchMarketNews, 5 * 60 * 1000);

let depthChartInstance = null;

async function fetchOrderBook() {
  try {
    const response = await fetch(
      "https://api.binance.com/api/v3/depth?symbol=BTCUSDT&limit=1000"
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return {
      bids: data.bids.map(([price, quantity]) => ({
        price: parseFloat(price),
        quantity: parseFloat(quantity),
      })),
      asks: data.asks.map(([price, quantity]) => ({
        price: parseFloat(price),
        quantity: parseFloat(quantity),
      })),
    };
  } catch (error) {
    console.error("Error fetching order book:", error);
    return null;
  }
}

function updateDepthChart(orderBook) {
  if (!orderBook) return;

  const ctx = document.getElementById("depthChart").getContext("2d");
  if (depthChartInstance) {
    depthChartInstance.destroy();
  }

  // Calculate cumulative quantities
  let cumulativeBids = 0;
  let cumulativeAsks = 0;

  const bids = orderBook.bids
    .map((bid) => {
      cumulativeBids += bid.quantity;
      return {
        price: bid.price,
        quantity: cumulativeBids,
      };
    })
    .reverse();

  const asks = orderBook.asks.map((ask) => {
    cumulativeAsks += ask.quantity;
    return {
      price: ask.price,
      quantity: cumulativeAsks,
    };
  });

  depthChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          label: "Biedingen",
          data: bids.map((bid) => ({
            x: bid.price,
            y: bid.quantity,
          })),
          borderColor: "rgba(0, 255, 0, 0.8)",
          backgroundColor: "rgba(0, 255, 0, 0.1)",
          fill: true,
          tension: 0.4,
        },
        {
          label: "Vragen",
          data: asks.map((ask) => ({
            x: ask.price,
            y: ask.quantity,
          })),
          borderColor: "rgba(255, 0, 0, 0.8)",
          backgroundColor: "rgba(255, 0, 0, 0.1)",
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: "linear",
          position: "bottom",
          title: {
            display: true,
            text: "Prijs (USD)",
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
          ticks: {
            color: "#fff",
          },
        },
        y: {
          title: {
            display: true,
            text: "Cumulatief Volume (BTC)",
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
          ticks: {
            color: "#fff",
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: "#fff",
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: ${context.parsed.y.toFixed(
                4
              )} BTC @ $${context.parsed.x.toFixed(2)}`;
            },
          },
        },
      },
    },
  });
}

function updateOrderBook(orderBook) {
  const bidsList = document.querySelector(".bids-list");
  const asksList = document.querySelector(".asks-list");

  // Clear existing orders
  bidsList.innerHTML = "";
  asksList.innerHTML = "";

  // Display top 10 bids and asks
  const topBids = orderBook.bids.slice(0, 10);
  const topAsks = orderBook.asks.slice(0, 10);

  topBids.forEach((bid) => {
    const orderItem = document.createElement("div");
    orderItem.className = "order-item";
    orderItem.innerHTML = `
      <span class="order-price">$${bid.price.toFixed(2)}</span>
      <span class="order-amount">${bid.quantity.toFixed(4)}</span>
    `;
    bidsList.appendChild(orderItem);
  });

  topAsks.forEach((ask) => {
    const orderItem = document.createElement("div");
    orderItem.className = "order-item";
    orderItem.innerHTML = `
      <span class="order-price">$${ask.price.toFixed(2)}</span>
      <span class="order-amount">${ask.quantity.toFixed(4)}</span>
    `;
    asksList.appendChild(orderItem);
  });
}

async function updateMarketDepth() {
  const orderBook = await fetchOrderBook();
  if (orderBook) {
    updateDepthChart(orderBook);
    updateOrderBook(orderBook);
  }
}

// Initial update
updateMarketDepth();

// Update every 5 seconds
setInterval(updateMarketDepth, 5000);
