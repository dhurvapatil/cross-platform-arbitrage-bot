# AGENTS.md - Polymarket-Binance Arbitrage Bot

## Build/Lint/Test Commands
- **Install**: `npm install`
- **Start**: `npm start` (production)
- **Dev**: `npm run dev` (nodemon)
- **Lint**: `npm run lint` (eslint src/**/*.js)
- **Type check**: `npm run typecheck` (tsc --noEmit)
- **Test all**: `npm test` (Jest)
- **Test single**: `npm test -- <filename>` or `npx jest <filename>`
- **Test watch**: `npm run test:watch`

## Code Style Guidelines
- **Modules**: ES modules with `import/export`, "type": "module" in package.json
- **Async**: Async/await with comprehensive try-catch error handling
- **Logging**: Structured format `[LEVEL] [TIMESTAMP] [SERVICE] Message` via Logger class
- **Naming**: PascalCase classes, camelCase functions/variables, UPPER_SNAKE_CASE constants, kebab-case files
- **Imports**: Group by Node.js built-ins → third-party → local modules, use .js extensions
- **Formatting**: 2-space indentation, single quotes for strings, trailing commas
- **Dependencies**: axios (HTTP), dotenv (env vars), node-telegram-bot-api (Telegram)
- **Error Handling**: Try-catch API calls, log errors without crashing, exponential backoff retries (1s, 2s, 4s)
- **Testing**: Jest with 80% coverage threshold, mock external APIs, unit + integration tests
- **Financial Math**: Precise decimals (consider decimal.js), account for fees (2-3% Polymarket, 0.02-0.04% Binance) and slippage (0.1-0.5%)</content>
<parameter name="filePath">C:\Users\workspace\polymarket_binance\AGENTS.md