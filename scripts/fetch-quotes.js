// Fetches the latest quote for each symbol from Alpha Vantage (GLOBAL_QUOTE)
// and writes the result to data.json. The API key is read from the
// ALPHAVANTAGE_API_KEY environment variable (a GitHub Secret in Actions).
// If any symbol fails, the script exits with an error and does NOT touch
// data.json, so the page keeps showing the last good data.

const fs = require("fs");
const path = require("path");

const SYMBOLS = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"];
const OUTPUT = path.join(__dirname, "..", "data.json");
const apiKey = process.env.ALPHAVANTAGE_API_KEY;

if (!apiKey) {
  console.error("Missing ALPHAVANTAGE_API_KEY environment variable.");
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchQuote(symbol) {
  const url =
    "https://www.alphavantage.co/query?function=GLOBAL_QUOTE" +
    `&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${symbol}: HTTP ${response.status}`);
  }
  const body = await response.json();
  const quote = body["Global Quote"];
  if (!quote || !quote["05. price"]) {
    // Alpha Vantage reports limits and errors in "Note", "Information" or "Error Message".
    const reason = body["Note"] || body["Information"] || body["Error Message"] || "empty response";
    throw new Error(`${symbol}: ${reason}`);
  }
  return {
    symbol,
    price: Number(quote["05. price"]),
    change: Number(quote["09. change"]),
    changePercent: Number(String(quote["10. change percent"]).replace("%", "")),
    tradingDay: quote["07. latest trading day"],
  };
}

async function main() {
  const quotes = [];
  for (const symbol of SYMBOLS) {
    quotes.push(await fetchQuote(symbol));
    await sleep(1200); // the free plan allows about 1 request per second
  }
  const data = { isSample: false, updatedAt: new Date().toISOString(), quotes };
  fs.writeFileSync(OUTPUT, JSON.stringify(data, null, 2) + "\n");
  console.log(`Saved ${quotes.length} quotes to data.json`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
