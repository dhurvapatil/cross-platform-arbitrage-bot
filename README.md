# Polymarket-Binance Arbitrage Bot

A high-performance Node.js automated trading bot that continuously monitors prediction markets on [Polymarket](https://polymarket.com/) and perpetual futures on [Binance](https://www.binance.com/) to detect and alert on profitable arbitrage opportunities.

## 🌟 Overview

The Polymarket-Binance Arbitrage Bot bridges the gap between decentralized prediction markets and centralized crypto futures. It specifically looks for discrepancies between the implied probabilities of crypto-related binary (Yes/No) questions on Polymarket (e.g., "Will Bitcoin reach $100k by December?") and the actual futures prices on Binance.

When the implied probability on Polymarket significantly diverges from the estimated probability derived from Binance pricing—and the potential net profit exceeds your predefined minimum threshold (after accounting for trading fees and slippage)—the bot instantly sends an alert via Telegram.

## ✨ Key Features

- **Automated Market Filtering**: Automatically fetches active Polymarket events and filters for cryptocurrency-specific binary markets using intelligent keyword matching.
- **Cross-Platform Price Matching**: Maps Polymarket questions to corresponding Binance USDT futures trading pairs (e.g., `BTC` -> `BTCUSDT`).
- **Real-Time Arbitrage Engine**: Evaluates price discrepancies, calculates probability deltas, and models potential gross and net profits.
- **Precision Fee Modeling**: Accounts for ~2.5% Polymarket fees, 0.04% Binance futures fees, and a configurable slippage buffer.
- **Telegram Integrations**: Instantly sends high-confidence, profitable arbitrage alerts directly to your Telegram chat.
- **Resilient & Reliable**: Advanced retry mechanisms, exponential back-off for API rate limits, and graceful shutdown handling.

## 🏗️ Architecture

- `src/index.js` - Main entry point orchestration and cyclic monitoring loop.
- `src/services/arbitrage.js` - Core engine calculating probability deltas, confidence scores, and net profit margins.
- `src/services/polymarket.js` - Fetches and parses active markets, filtering for crypto and calculating implied odds.
- `src/services/binance.js` - Interacts with Binance Futures to fetch current prices, contract info, and funding rates.
- `src/services/telegram.js` - Alerting mechanism.
- `src/utils/` - Global logging and configuration parsing utilities.

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version 16.0.0 or higher
- **NPM** or **Yarn** package manager
- A **Telegram Bot Token** (Create one using [@BotFather](https://t.me/botfather))
- A **Telegram Chat ID** (where the bot will send alerts)
- (Optional) **Binance API Keys** for authenticated futures endpoints

### Installation

1. **Clone the repository or navigate to the project directory:**
   ```bash
   cd cross-platform-arbitrage-bot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure the environment:**
   Copy the provided `.env.example` file to `.env`:
   ```bash
   cp config/.env.example .env
   ```
   Open the `.env` file and populate it with your specific API keys and settings:
   ```env
   # Telegram Config (Required)
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
   TELEGRAM_CHAT_ID=your_telegram_chat_id_here

   # Binance API Keys (Optional)
   BINANCE_API_KEY=your_binance_api_key_here
   BINANCE_API_SECRET=your_binance_api_secret_here

   # Trading & Threshold Configuration
   MIN_PROFIT_THRESHOLD=0.005  # 0.5%
   CHECK_FREQUENCY_MS=10000    # Run cycle every 10 seconds
   MARKET_FILTERS=BTC,ETH
   
   # Logging
   LOG_LEVEL=info
   ```

### Usage

**Start the bot in production mode:**
```bash
npm start
```

**Run the bot in development mode (with auto-reload via nodemon):**
```bash
npm run dev
```

**Run Tests:**
```bash
npm test
```

## 📊 How It Works (The Lifecycle)

1. **Initialization:** The bot initializes config, validators, and essential external services.
2. **Phase 1 (Polymarket):** The bot hits `gamma-api.polymarket.com/events`, pulls down all active markets, formats them, and isolates crypto-related binary questions.
3. **Phase 2 (Binance Futures):** Pulls the real-time prices for tracked assets natively to Binance (`BTCUSDT`, `ETHUSDT`, `SOLUSDT`, etc).
4. **Phase 3 (Calculation):** Calculates the delta between the Yes/No implied odds on Polymarket and the trend/price structure of the underlying on Binance Futures. Applies a fee/slippage reduction.
5. **Phase 4 (Alerting):** If a matching pair yields a positive profit margin exceeding `MIN_PROFIT_THRESHOLD`, an alert recommendation (BUY/SELL) is sent directly to your configured Telegram ID.
6. **Cycle Repeats:** Repeats continuously every `CHECK_FREQUENCY_MS` milliseconds.

## 🛡️ License

This project is licensed under the MIT License. See the `package.json` for further details.
