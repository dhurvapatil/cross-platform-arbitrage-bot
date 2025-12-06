// Main entry point for Polymarket-Binance Arbitrage Bot
// This file orchestrates all services and runs the monitoring loop

import { Config } from './utils/config.js';
import { Logger } from './utils/logger.js';

async function main() {
  try {
    Logger.info('BOT', '🚀 Starting Polymarket-Binance Arbitrage Bot...');

    // Load and validate configuration
    const config = Config.load();
    Logger.initialize(config);

    Logger.info('BOT', `Configuration loaded successfully`);
    Logger.info('BOT', `Minimum profit threshold: ${config.minProfitThreshold}%`);
    Logger.info('BOT', `Check frequency: ${config.checkFrequencyMs}ms`);
    Logger.info('BOT', `Market filters: ${config.marketFilters.join(', ')}`);
    Logger.info('BOT', `Binance credentials available: ${config.hasBinanceCredentials()}`);

    // Test different log levels
    Logger.debug('BOT', 'This is a debug message');
    Logger.info('BOT', 'This is an info message');
    Logger.warn('BOT', 'This is a warning message');

    Logger.info('BOT', '✅ Phase 1 infrastructure test completed successfully!');
    Logger.info('BOT', 'Bot is ready for Phase 2 implementation');

    // TODO: Initialize services and start monitoring loop
    process.exit(0);

  } catch (error) {
    Logger.error('BOT', `Failed to start bot: ${error.message}`);
    process.exit(1);
  }
}

main();