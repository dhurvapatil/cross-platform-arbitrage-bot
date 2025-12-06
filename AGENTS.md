# AGENTS.md - Polymarket-Binance Arbitrage Bot

## Build/Lint/Test Commands
- **Install**: `npm install`
- **Start**: `npm start` (production)
- **Dev**: `npm run dev` (nodemon)
- **Lint**: `npm run lint` (eslint - requires eslint to be installed)
- **Type check**: `npm run typecheck` (tsc - requires typescript to be installed)
- **Test all**: `npm test` (Jest)
- **Test single**: `npm test -- <filename>` or `npx jest <filename>`
- **Test watch**: `npm run test:watch`

## Code Style Guidelines
- **Modules**: ES modules with `import/export`
- **Async**: Async/await with try-catch error handling
- **Logging**: Structured format `[LEVEL] [TIMESTAMP] [SERVICE] Message`
- **Naming**: PascalCase classes, camelCase functions/variables, UPPER_SNAKE_CASE constants, kebab-case files
- **Imports**: Group by standard library → third-party → local modules
- **Dependencies**: axios (HTTP), dotenv (env vars), node-telegram-bot-api (Telegram)
- **Error Handling**: Try-catch API calls, log errors without crashing, exponential backoff retries
- **Testing**: Jest with 80%+ coverage, mock external APIs, unit + integration tests
- **Financial Math**: Precise decimals (consider decimal.js), account for fees (2-3% Polymarket, 0.02-0.04% Binance) and slippage (0.1-0.5%)</content>
<parameter name="filePath">C:\Users\workspace\polymarket_binance\AGENTS.md