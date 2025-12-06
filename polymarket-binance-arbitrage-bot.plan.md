<!-- ae564062-f47e-4764-82f0-4d0b7b2cd7b7 f0f043bb-a073-4cda-9742-8ab17c4703c6 -->
# Polymarket-Binance Arbitrage Bot

## Overview

A Node.js bot that continuously monitors Polymarket prediction markets and Binance Futures to detect arbitrage opportunities. When opportunities with ≥2% profit margin are found, it sends notifications via Telegram.

## Architecture

### Core Components

1. **Polymarket API Client** (`src/services/polymarket.js`)

   - Fetch active prediction markets
   - Extract market data: question, outcomes, current odds/prices
   - Parse market questions to identify crypto-related markets (BTC, ETH, etc.)
   - Calculate implied probabilities from market prices

2. **Binance Futures API Client** (`src/services/binance.js`)

   - Connect to Binance Futures API
   - Fetch futures contract prices for relevant cryptocurrencies
   - Get funding rates and contract specifications
   - Calculate futures prices at market expiration dates

3. **Arbitrage Calculator** (`src/services/arbitrage.js`)

   - Match Polymarket markets with Binance Futures contracts
   - Calculate potential profit from arbitrage opportunities
   - Filter opportunities by minimum threshold (2%)
   - Account for fees and slippage

4. **Telegram Notifier** (`src/services/telegram.js`)

   - Send formatted notifications via Telegram Bot API
   - Include market details, profit percentage, and relevant links
   - Rate limit notifications to avoid spam

5. **Main Bot Loop** (`src/index.js`)

   - Run monitoring loop every 30 seconds
   - Coordinate between services
   - Handle errors and logging
   - Support graceful shutdown

6. **Configuration** (`config/config.js` or `.env`)

   - Telegram bot token and chat ID
   - Binance API credentials (optional, for authenticated endpoints)
   - Minimum profit threshold
   - Check frequency
   - Market filters

## Implementation Details

### Key Dependencies

- `axios` - HTTP requests for APIs
- `node-telegram-bot-api` or `axios` for Telegram API
- `dotenv` - Environment variable management
- `node-cron` or simple `setInterval` - Scheduling

### Market Matching Logic

- Parse Polymarket question text to identify cryptocurrency and target price
- Match with corresponding Binance Futures contract (e.g., BTCUSDT)
- Compare implied probability from Polymarket odds with futures price probability
- Calculate arbitrage profit considering:
  - Polymarket fees (~2-3%)
  - Binance Futures fees (~0.02-0.04%)
  - Funding rates
  - Slippage

### Notification Format

```
🚨 Arbitrage Opportunity Detected!

Market: [Polymarket question]
Polymarket: [Yes/No odds]
Binance Futures: [Contract price]
Profit Margin: [X]%
Expires: [Date]

[Links to both markets]
```

## File Structure

```
polymarket_binance/
├── src/
│   ├── index.js              # Main entry point
│   ├── services/
│   │   ├── polymarket.js     # Polymarket API client
│   │   ├── binance.js        # Binance Futures API client
│   │   ├── arbitrage.js      # Arbitrage calculation logic
│   │   └── telegram.js       # Telegram notification service
│   └── utils/
│       ├── logger.js         # Logging utility
│       └── config.js         # Configuration loader
├── config/
│   └── .env.example          # Example environment variables
├── package.json
└── README.md                 # Setup instructions including Telegram bot creation
```

## Setup Requirements

- Node.js (v16+)
- Telegram bot token (instructions in README)
- Telegram chat ID
- Optional: Binance API keys for authenticated endpoints

## Error Handling

- API rate limiting
- Network failures with retry logic
- Invalid market data filtering
- Telegram API failures (log but continue monitoring)

## Project Phases

### Phase 1: Project Setup & Infrastructure
**Goal**: Establish project foundation with dependencies, configuration, and basic utilities.

#### Steps:
1. **Initialize Node.js project**
   - Create `package.json` with project metadata
   - Set up ES modules or CommonJS structure
   - Add scripts for start, test, and development

2. **Install core dependencies**
   - `axios` for HTTP requests
   - `dotenv` for environment variables
   - `node-telegram-bot-api` for Telegram integration
   - Development dependencies: `nodemon`, `jest` (or mocha)

3. **Create directory structure**
   - Set up `src/`, `src/services/`, `src/utils/`, `config/` directories
   - Create placeholder files for all planned modules

4. **Build configuration system**
   - Create `src/utils/config.js` to load and validate environment variables
   - Create `config/.env.example` with all required variables
   - Implement config validation (check for required keys)

5. **Create logger utility**
   - Build `src/utils/logger.js` with different log levels (info, warn, error)
   - Support console output with timestamps
   - Optional: file logging capability

#### Testing:
- **Unit Tests**: Test config loader with valid/invalid .env files
- **Integration Tests**: Verify logger outputs correctly formatted messages
- **Manual Tests**: Run `npm start` and verify no errors, check that config loads properly

#### Coding Approach:
- Use `npm init` or manually create `package.json` with proper structure
- Import `dotenv` at the top of config.js and load `.env` file
- Create a Config class that exports validated configuration object
- Logger should use console methods with `[LEVEL] [TIMESTAMP]` prefix format

---

### Phase 2: Polymarket API Client
**Goal**: Build service to fetch and parse Polymarket prediction markets.

#### Steps:
1. **Research Polymarket API endpoints**
   - Identify GraphQL or REST endpoints for active markets
   - Document required query parameters and response structure
   - Note rate limits and authentication requirements

2. **Create base API client**
   - Implement `src/services/polymarket.js` with axios instance
   - Add request/response interceptors for error handling
   - Implement retry logic with exponential backoff

3. **Fetch active markets**
   - Create `fetchActiveMarkets()` function
   - Handle pagination if needed
   - Parse response to extract market list

4. **Parse market data**
   - Extract: question text, outcomes (Yes/No), current prices, expiration date
   - Create data structure: `{ id, question, outcomes: [{ name, price }], expiresAt }`

5. **Filter crypto-related markets**
   - Create `filterCryptoMarkets()` function
   - Use regex to identify BTC, ETH, and other crypto mentions
   - Extract target price/condition from question text

6. **Calculate implied probabilities**
   - Convert market prices to probabilities
   - Handle both Yes/No outcomes
   - Account for Polymarket fee structure

#### Testing:
- **Unit Tests**: Mock axios responses, test parsing logic with sample data
- **Integration Tests**: Make real API calls (with rate limiting), verify data structure
- **Edge Cases**: Test with malformed responses, empty markets, markets without crypto keywords
- **Manual Tests**: Log fetched markets to console, verify crypto filtering works

#### Coding Approach:
- Create a `PolymarketService` class with methods for each operation
- Use async/await for API calls with try-catch error handling
- Store API base URL and endpoints as constants
- Return structured objects with consistent schema
- Use regex patterns like `/\b(BTC|ETH|Bitcoin|Ethereum)\b/i` for filtering

---

### Phase 3: Binance Futures API Client
**Goal**: Build service to fetch Binance Futures prices and contract data.

#### Steps:
1. **Research Binance Futures API**
   - Identify REST endpoints for futures prices (e.g., `/fapi/v1/ticker/price`)
   - Document endpoints for funding rates and contract info
   - Note rate limits (1200 requests/minute for public endpoints)

2. **Create Binance API client**
   - Implement `src/services/binance.js` with axios instance
   - Configure base URL for Binance Futures API
   - Add request headers and error handling

3. **Fetch futures prices**
   - Create `fetchFuturesPrice(symbol)` function (e.g., BTCUSDT)
   - Support multiple symbols in batch request
   - Parse price data: `{ symbol, price, timestamp }`

4. **Get funding rates**
   - Create `fetchFundingRate(symbol)` function
   - Calculate funding cost for holding period
   - Store funding rate data

5. **Calculate expiration prices**
   - Create `calculateExpirationPrice()` function
   - Project futures price to market expiration date
   - Account for funding rates over time period

6. **Get contract specifications**
   - Fetch contract details (tick size, lot size, etc.)
   - Use for accurate price calculations

#### Testing:
- **Unit Tests**: Mock Binance API responses, test price calculations
- **Integration Tests**: Make real API calls, verify price data accuracy
- **Edge Cases**: Test with invalid symbols, network failures, rate limit handling
- **Manual Tests**: Log fetched prices, compare with Binance website for accuracy

#### Coding Approach:
- Create `BinanceService` class with methods for each endpoint
- Use async/await with proper error handling
- Cache contract specifications to reduce API calls
- Store API base URL: `https://fapi.binance.com/fapi/v1`
- Return normalized data structures matching Polymarket format

---

### Phase 4: Arbitrage Calculator
**Goal**: Match markets, calculate profit opportunities, and filter by threshold.

#### Steps:
1. **Create arbitrage service**
   - Implement `src/services/arbitrage.js`
   - Import Polymarket and Binance services
   - Set up fee constants (Polymarket: 2-3%, Binance: 0.02-0.04%)

2. **Market matching logic**
   - Create `matchMarkets(polymarketMarkets, binancePrices)` function
   - Parse Polymarket question to extract crypto symbol and condition
   - Map to Binance Futures symbol (e.g., "BTC" → "BTCUSDT")
   - Match by expiration date alignment

3. **Probability comparison**
   - Convert Polymarket odds to implied probability
   - Convert Binance Futures price to probability (for price-based markets)
   - Calculate probability difference/delta

4. **Profit calculation**
   - Create `calculateProfit(market, futuresPrice)` function
   - Account for Polymarket fees on buy/sell
   - Account for Binance Futures fees
   - Include funding rate costs
   - Add slippage buffer (0.1-0.5%)
   - Formula: `profit = (probability_delta * position_size) - (all_fees + slippage)`

5. **Filter opportunities**
   - Create `filterOpportunities(opportunities, minThreshold)` function
   - Filter by minimum profit percentage (default 2%)
   - Sort by profit margin (highest first)
   - Return array of profitable opportunities

6. **Format opportunity data**
   - Structure opportunity object: `{ market, futuresPrice, profitMargin, profitAmount, expiresAt }`
   - Include all relevant data for notifications

#### Testing:
- **Unit Tests**: Test matching logic with mock data, verify profit calculations
- **Edge Cases**: Test with zero profit, negative profit, missing data
- **Integration Tests**: Test with real market data from Phase 2 & 3
- **Manual Tests**: Log opportunities, manually verify calculations with calculator

#### Coding Approach:
- Create `ArbitrageService` class that takes both services as dependencies
- Use dependency injection pattern for testability
- Store fee percentages as constants at top of file
- Create helper functions for each calculation step
- Return structured opportunity objects with all necessary fields
- Use precise decimal calculations (consider using `decimal.js` for financial math)

---

### Phase 5: Telegram Notification Service
**Goal**: Send formatted notifications when arbitrage opportunities are detected.

#### Steps:
1. **Set up Telegram bot**
   - Create `src/services/telegram.js`
   - Initialize Telegram bot with token from config
   - Test bot connection

2. **Create message formatter**
   - Build `formatOpportunityMessage(opportunity)` function
   - Use template matching the specified format
   - Include emojis, market details, profit margin, expiration
   - Add clickable links to Polymarket and Binance

3. **Implement notification sender**
   - Create `sendNotification(message)` function
   - Send to configured chat ID
   - Handle Telegram API errors gracefully
   - Return success/failure status

4. **Add rate limiting**
   - Implement notification deduplication (don't send same opportunity twice)
   - Add cooldown period between notifications (e.g., 5 minutes per market)
   - Track sent notifications in memory or simple cache

5. **Error handling**
   - Log Telegram API failures but don't crash bot
   - Retry failed sends with exponential backoff
   - Continue monitoring even if notifications fail

#### Testing:
- **Unit Tests**: Mock Telegram API, test message formatting
- **Integration Tests**: Send test message to Telegram, verify format
- **Edge Cases**: Test with invalid token, network failures, rate limits
- **Manual Tests**: Trigger notification manually, verify message appears correctly in Telegram

#### Coding Approach:
- Use `node-telegram-bot-api` library or axios for Telegram Bot API
- Create `TelegramService` class with sendNotification method
- Store sent opportunities in Set or Map with timestamps for deduplication
- Use template literals for message formatting with proper line breaks
- Telegram API endpoint: `https://api.telegram.org/bot{token}/sendMessage`

---

### Phase 6: Main Bot Loop & Integration
**Goal**: Integrate all components into a continuous monitoring loop.

#### Steps:
1. **Create main entry point**
   - Build `src/index.js` as orchestrator
   - Import all services (Polymarket, Binance, Arbitrage, Telegram)
   - Initialize services with configuration

2. **Implement monitoring loop**
   - Create `runMonitoringCycle()` async function
   - Fetch Polymarket markets
   - Fetch Binance prices
   - Calculate arbitrage opportunities
   - Send notifications for profitable opportunities
   - Log cycle completion

3. **Add scheduling**
   - Use `setInterval` to run cycle every 30 seconds
   - Ensure cycles don't overlap (wait for completion)
   - Add configurable interval from environment

4. **Error handling & logging**
   - Wrap each cycle in try-catch
   - Log errors without stopping bot
   - Add cycle counter and timing metrics
   - Log summary statistics (markets checked, opportunities found)

5. **Graceful shutdown**
   - Listen for SIGINT/SIGTERM signals
   - Stop monitoring loop cleanly
   - Close connections and log shutdown message

6. **Add health checks**
   - Log bot status periodically
   - Track API call success rates
   - Alert if services are consistently failing

#### Testing:
- **Integration Tests**: Run full cycle with mock services, verify flow
- **End-to-End Tests**: Run bot for 5 minutes, verify it finds and notifies opportunities
- **Error Handling Tests**: Simulate API failures, verify bot continues running
- **Manual Tests**: Start bot, monitor logs, verify notifications arrive, test shutdown with Ctrl+C

#### Coding Approach:
- Create main async function that initializes all services
- Use `setInterval` with async function wrapper to handle promises
- Track cycle state to prevent overlapping executions
- Use `process.on('SIGINT', ...)` for graceful shutdown
- Log with structured format: `[TIMESTAMP] [LEVEL] [SERVICE] Message`
- Add configuration for interval, min profit threshold, etc.

---

### Phase 7: Documentation & Final Testing
**Goal**: Complete documentation and perform comprehensive testing.

#### Steps:
1. **Create README.md**
   - Project overview and features
   - Installation instructions
   - Configuration guide (including Telegram bot creation)
   - Usage instructions
   - Troubleshooting section

2. **Add code comments**
   - Document complex functions and algorithms
   - Add JSDoc comments for public methods
   - Explain arbitrage calculation formulas

3. **Create .env.example**
   - Document all required environment variables
   - Include example values and descriptions
   - Note which are optional

4. **Comprehensive testing**
   - Run bot for extended period (1+ hours)
   - Verify no memory leaks
   - Test with various market conditions
   - Verify notification accuracy

5. **Performance optimization**
   - Profile API call patterns
   - Optimize rate limiting
   - Cache where appropriate
   - Review and optimize calculations

#### Testing:
- **Documentation Tests**: Follow README instructions on fresh environment
- **Stress Tests**: Run bot for 24 hours, monitor memory usage
- **Accuracy Tests**: Manually verify 10+ opportunities for calculation correctness
- **User Acceptance**: Have another person set up and run the bot

#### Coding Approach:
- Write clear, concise README with code examples
- Use markdown formatting for readability
- Include setup screenshots if helpful
- Document all environment variables with descriptions
- Add inline comments explaining "why" not just "what"

---

## Testing Strategy Summary

### Unit Testing
- Test each service independently with mocked dependencies
- Use Jest or Mocha with assertion library
- Aim for 80%+ code coverage on business logic

### Integration Testing
- Test service interactions with real API calls (in test mode)
- Verify data flow between components
- Test error propagation

### End-to-End Testing
- Run complete bot cycles with real APIs
- Verify notifications are sent correctly
- Monitor for 1+ hours to catch edge cases

### Manual Testing Checklist
- [ ] Bot starts without errors
- [ ] Config loads correctly
- [ ] Polymarket markets are fetched
- [ ] Binance prices are fetched
- [ ] Opportunities are calculated correctly
- [ ] Notifications are sent to Telegram
- [ ] Bot handles API errors gracefully
- [ ] Bot shuts down cleanly

### To-dos

- [ ] Initialize Node.js project with package.json and install dependencies (axios, dotenv, node-telegram-bot-api)
- [ ] Create Polymarket API client to fetch active markets and parse crypto-related prediction markets
- [ ] Create Binance Futures API client to fetch futures contract prices and funding rates
- [ ] Implement arbitrage calculation logic to match markets and compute profit margins
- [ ] Create Telegram notification service with formatted message templates
- [ ] Build main bot loop with 30-second interval monitoring and error handling
- [ ] Set up configuration management with .env file and example template
- [ ] Create README with setup instructions including Telegram bot creation guide