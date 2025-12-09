// Arbitrage Calculator
// Matches Polymarket binary markets with Binance futures and calculates profit opportunities

import { Logger } from '../utils/logger.js';

export class ArbitrageService {
  constructor(polymarketService, binanceService, telegramService = null) {
    this.polymarketService = polymarketService;
    this.binanceService = binanceService;
    this.telegramService = telegramService; // Optional for notifications

    // Fee constants (as percentages)
    this.fees = {
      polymarket: 0.025,    // 2.5% total Polymarket fees
      binance: 0.0004,      // 0.04% Binance futures fees (round trip)
      slippage: 0.001       // 0.1% slippage buffer
    };

    this.minProfitThreshold = 0.005; // 0.5% minimum profit
  }

  /**
   * Match Polymarket binary markets with Binance futures prices
   * @param {Array} polymarketMarkets - Array of Polymarket market objects
   * @param {Array} binancePrices - Array of Binance price objects
   * @returns {Array} Array of matched market opportunities
   */
  async matchMarkets(polymarketMarkets, binancePrices) {
    Logger.info('ARBITRAGE', `Matching ${polymarketMarkets.length} Polymarket markets with ${binancePrices.length} Binance prices`);

    const opportunities = [];

    // Create price lookup map for faster access
    const priceMap = new Map();
    binancePrices.forEach(price => {
      priceMap.set(price.symbol, price);
    });

    for (const market of polymarketMarkets) {
      try {
        // Only process binary markets
        if (!this.isBinaryMarket(market)) {
          continue;
        }

        // Extract crypto symbol from market question
        const symbol = this.extractCryptoSymbol(market);
        if (!symbol) {
          Logger.debug('ARBITRAGE', `Could not extract symbol from market: ${market.question}`);
          continue;
        }

        // Map to Binance symbol (e.g., BTC -> BTCUSDT)
        const binanceSymbol = this.mapToBinanceSymbol(symbol);
        const futuresPrice = priceMap.get(binanceSymbol);

        if (!futuresPrice) {
          Logger.debug('ARBITRAGE', `No Binance price found for ${binanceSymbol}`);
          continue;
        }

        // Calculate arbitrage opportunity
        const opportunity = await this.calculateArbitrage(market, futuresPrice);
        if (opportunity) {
          opportunities.push(opportunity);
        }

      } catch (error) {
        Logger.warn('ARBITRAGE', `Error processing market ${market.id}: ${error.message}`);
      }
    }

    Logger.info('ARBITRAGE', `Found ${opportunities.length} potential arbitrage opportunities`);
    return opportunities;
  }

  /**
   * Check if market is a binary Yes/No market
   * @param {Object} market - Polymarket market object
   * @returns {boolean} True if binary market
   */
  isBinaryMarket(market) {
    return market.outcomes &&
           Array.isArray(market.outcomes) &&
           market.outcomes.length === 2 &&
           market.outcomes.includes('Yes') &&
           market.outcomes.includes('No');
  }

  /**
   * Extract cryptocurrency symbol from market question
   * @param {Object} market - Polymarket market object
   * @returns {string|null} Crypto symbol (BTC, ETH, etc.) or null
   */
  extractCryptoSymbol(market) {
    const question = market.question || '';
    const text = question.toLowerCase();

    // Common crypto symbols to look for
    const cryptoPatterns = [
      /\b(btc|bitcoin)\b/i,
      /\b(eth|ethereum)\b/i,
      /\b(sol|solana)\b/i,
      /\b(ada|cardano)\b/i,
      /\b(dot|polkadot)\b/i,
      /\b(link|chainlink)\b/i,
      /\b(uni|uniswap)\b/i,
      /\b(aave)\b/i,
      /\b(comp|compound)\b/i,
      /\b(mkr|maker)\b/i
    ];

    for (const pattern of cryptoPatterns) {
      const match = text.match(pattern);
      if (match) {
        const symbol = match[1].toUpperCase();
        // Normalize common variations
        if (symbol === 'BITCOIN') return 'BTC';
        if (symbol === 'ETHEREUM') return 'ETH';
        if (symbol === 'SOLANA') return 'SOL';
        if (symbol === 'CARDANO') return 'ADA';
        if (symbol === 'POLKADOT') return 'DOT';
        if (symbol === 'CHAINLINK') return 'LINK';
        if (symbol === 'UNISWAP') return 'UNI';
        return symbol;
      }
    }

    return null;
  }

  /**
   * Map crypto symbol to Binance futures symbol
   * @param {string} symbol - Crypto symbol (BTC, ETH, etc.)
   * @returns {string} Binance symbol (BTCUSDT, ETHUSDT, etc.)
   */
  mapToBinanceSymbol(symbol) {
    return `${symbol}USDT`;
  }

  /**
   * Calculate arbitrage opportunity for a market
   * @param {Object} market - Polymarket market object
   * @param {Object} futuresPrice - Binance price object
   * @returns {Object|null} Arbitrage opportunity or null
   */
  async calculateArbitrage(market, futuresPrice) {
    try {
      // Get Polymarket probability (Yes outcome price)
      const polymarketProb = market.probability;
      if (polymarketProb === null || polymarketProb === undefined) {
        return null;
      }

      // For binary markets, we need to determine if this is a "bullish" or "bearish" bet
      // This is a simplified approach - in reality, we'd need to parse the question more carefully
      const direction = this.determineMarketDirection(market);
      if (!direction) {
        Logger.debug('ARBITRAGE', `Could not determine direction for market: ${market.question}`);
        return null;
      }

      // Get current futures price
      const currentPrice = futuresPrice.price;

      // Estimate futures probability based on market direction
      // This is a simplified model - real arbitrage would need more sophisticated modeling
      const futuresProb = this.estimateFuturesProbability(market, currentPrice, direction);

      // Calculate probability delta
      const probDelta = direction === 'bullish' ?
        polymarketProb - futuresProb :
        futuresProb - polymarketProb;

      if (Math.abs(probDelta) < 0.001) { // Less than 0.1% difference
        return null;
      }

      // Calculate profit potential (simplified model)
      const positionSize = 1000; // $1000 position for calculation
      const grossProfit = Math.abs(probDelta) * positionSize;

      // Calculate total fees
      const totalFees = positionSize * (this.fees.polymarket + this.fees.binance + this.fees.slippage);

      // Calculate net profit
      const netProfit = grossProfit - totalFees;
      const profitMargin = netProfit / positionSize;

      // Only return if profit margin meets minimum threshold
      if (profitMargin < this.minProfitThreshold) {
        return null;
      }

      const opportunity = {
        market: {
          id: market.id,
          question: market.question,
          probability: polymarketProb,
          direction: direction,
          expiresAt: market.expiresAt
        },
        futures: {
          symbol: futuresPrice.symbol,
          price: currentPrice,
          timestamp: futuresPrice.timestamp
        },
        arbitrage: {
          probabilityDelta: probDelta,
          grossProfit: grossProfit,
          totalFees: totalFees,
          netProfit: netProfit,
          profitMargin: profitMargin,
          positionSize: positionSize
        },
        recommendation: direction === 'bullish' ? 'BUY' : 'SELL',
        confidence: this.calculateConfidence(probDelta, market),
        timestamp: Date.now()
      };

      Logger.debug('ARBITRAGE', `Found opportunity: ${market.question} - ${profitMargin.toFixed(2)}% profit`);
      return opportunity;

    } catch (error) {
      Logger.warn('ARBITRAGE', `Error calculating arbitrage for market ${market.id}: ${error.message}`);
      return null;
    }
  }

  /**
   * Determine if market is bullish or bearish based on question
   * @param {Object} market - Polymarket market object
   * @returns {string|null} 'bullish', 'bearish', or null
   */
  determineMarketDirection(market) {
    const question = market.question.toLowerCase();

    // Look for bullish indicators
    const bullishKeywords = ['reach', 'above', 'over', 'higher than', 'surpass', 'exceed', 'break above'];
    const bearishKeywords = ['below', 'under', 'lower than', 'drop below', 'fall below'];

    const isBullish = bullishKeywords.some(keyword => question.includes(keyword));
    const isBearish = bearishKeywords.some(keyword => question.includes(keyword));

    if (isBullish && !isBearish) return 'bullish';
    if (isBearish && !isBullish) return 'bearish';

    // For ambiguous cases, check if it mentions a price target
    const priceMatch = question.match(/\$[\d,]+/);
    if (priceMatch) {
      // If it mentions reaching a high price, assume bullish
      if (question.includes('reach') || question.includes('above')) {
        return 'bullish';
      }
    }

    return null; // Could not determine direction
  }

  /**
   * Estimate futures market probability (simplified model)
   * @param {Object} market - Polymarket market object
   * @param {number} currentPrice - Current futures price
   * @param {string} direction - 'bullish' or 'bearish'
   * @returns {number} Estimated probability (0-1)
   */
  estimateFuturesProbability(market, currentPrice, direction) {
    // This is a highly simplified model
    // In a real implementation, this would use:
    // - Black-Scholes option pricing
    // - Historical volatility
    // - Time to expiration
    // - Risk-free rates

    // For now, assume 50% probability as baseline
    // Adjust based on how far we are from expiration
    const now = new Date();
    const expiry = market.expiresAt ? new Date(market.expiresAt) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const daysToExpiry = Math.max(1, (expiry - now) / (1000 * 60 * 60 * 24));

    // Longer time horizons have more uncertainty (closer to 50%)
    // Shorter time horizons reflect current market sentiment more
    const timeAdjustment = Math.min(0.5, 30 / daysToExpiry);

    return 0.5 + (direction === 'bullish' ? timeAdjustment : -timeAdjustment);
  }

  /**
   * Calculate confidence level for the arbitrage opportunity
   * @param {number} probDelta - Probability difference
   * @param {Object} market - Market object
   * @returns {string} Confidence level: 'low', 'medium', 'high'
   */
  calculateConfidence(probDelta, market) {
    const absDelta = Math.abs(probDelta);

    if (absDelta > 0.05) return 'high';      // >5% probability difference
    if (absDelta > 0.02) return 'medium';    // >2% probability difference
    return 'low';                            // <2% probability difference
  }

  /**
   * Filter opportunities by minimum profit threshold and send notifications
   * @param {Array} opportunities - Array of arbitrage opportunities
   * @param {number} minThreshold - Minimum profit margin (default 2%)
   * @returns {Array} Filtered and sorted opportunities
   */
  async filterOpportunities(opportunities, minThreshold = this.minProfitThreshold) {
    Logger.info('ARBITRAGE', `Filtering ${opportunities.length} opportunities with ${minThreshold * 100}% minimum threshold`);

    const filtered = opportunities
      .filter(opp => opp.arbitrage.profitMargin >= minThreshold)
      .sort((a, b) => b.arbitrage.profitMargin - a.arbitrage.profitMargin); // Sort by profit margin descending

    Logger.info('ARBITRAGE', `Filtered to ${filtered.length} opportunities meeting threshold`);

    // Send notifications for profitable opportunities
    if (this.telegramService && filtered.length > 0) {
      Logger.info('ARBITRAGE', `Sending ${filtered.length} Telegram notifications`);

      for (const opportunity of filtered) {
        try {
          await this.telegramService.sendArbitrageAlert(opportunity);
        } catch (error) {
          Logger.error('ARBITRAGE', `Failed to send notification for opportunity: ${error.message}`);
          // Continue with other notifications even if one fails
        }
      }
    } else if (!this.telegramService && filtered.length > 0) {
      Logger.warn('ARBITRAGE', `Found ${filtered.length} opportunities but no Telegram service configured`);
    }

    return filtered;
  }

  /**
   * Get arbitrage statistics
   * @param {Array} opportunities - Array of arbitrage opportunities
   * @returns {Object} Statistics object
   */
  getStatistics(opportunities) {
    if (opportunities.length === 0) {
      return { total: 0, averageProfit: 0, highConfidence: 0, maxProfit: 0 };
    }

    const profits = opportunities.map(opp => opp.arbitrage.profitMargin);
    const highConfidence = opportunities.filter(opp => opp.confidence === 'high').length;

    return {
      total: opportunities.length,
      averageProfit: profits.reduce((sum, p) => sum + p, 0) / profits.length,
      highConfidence: highConfidence,
      maxProfit: Math.max(...profits)
    };
  }
}