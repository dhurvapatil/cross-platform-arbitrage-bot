// Polymarket API Client
// Fetches active prediction markets and extracts market data

import axios from 'axios';
import { Logger } from '../utils/logger.js';

export class PolymarketService {
  constructor() {
    this.baseURL = 'https://gamma-api.polymarket.com';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000, // 10 second timeout
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        Logger.debug('POLYMARKET', `API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        Logger.error('POLYMARKET', `Request error: ${error.message}`);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging and retry logic
    this.client.interceptors.response.use(
      (response) => {
        Logger.debug('POLYMARKET', `API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      async (error) => {
        Logger.warn('POLYMARKET', `API Error: ${error.response?.status} ${error.config?.url} - ${error.message}`);

        // Implement simple retry for rate limits (429) or server errors (5xx)
        if (error.response?.status === 429 || (error.response?.status >= 500 && error.response?.status < 600)) {
          const retryCount = error.config.retryCount || 0;
          if (retryCount < 3) {
            const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
            Logger.info('POLYMARKET', `Retrying request in ${delay}ms (attempt ${retryCount + 1}/3)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            error.config.retryCount = retryCount + 1;
            return this.client.request(error.config);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async fetchActiveMarkets() {
    try {
      Logger.info('POLYMARKET', 'Fetching active markets from Polymarket API');

      const response = await this.client.get('/events', {
        params: {
          closed: false,
          limit: 100,
          offset: 0,
          order: 'volume',
          ascending: false // Get highest volume first
        }
      });

      const events = response.data;
      Logger.info('POLYMARKET', `Fetched ${events.length} events`);

      // Flatten events into markets
      const markets = [];
      for (const event of events) {
        if (event.markets && Array.isArray(event.markets)) {
          for (const market of event.markets) {
            if (market.active && !market.closed) {
              markets.push(this.parseMarketData(market, event));
            }
          }
        }
      }

      Logger.info('POLYMARKET', `Extracted ${markets.length} active markets`);
      return markets;

    } catch (error) {
      Logger.error('POLYMARKET', `Failed to fetch active markets: ${error.message}`);
      throw error;
    }
  }

  parseMarketData(market, event) {
    // Ensure outcomes and outcomePrices are arrays
    let outcomes = market.outcomes || [];
    let outcomePrices = market.outcomePrices || [];

    if (typeof outcomes === 'string') {
      try {
        outcomes = JSON.parse(outcomes);
      } catch (e) {
        Logger.warn('POLYMARKET', `Failed to parse outcomes for market ${market.id}: ${outcomes}`);
        outcomes = [];
      }
    }

    if (typeof outcomePrices === 'string') {
      try {
        outcomePrices = JSON.parse(outcomePrices);
      } catch (e) {
        Logger.warn('POLYMARKET', `Failed to parse outcomePrices for market ${market.id}: ${outcomePrices}`);
        outcomePrices = [];
      }
    }

    return {
      id: market.id,
      question: market.question || event.title || 'Unknown Question',
      description: market.description || event.description || '',
      outcomes: outcomes,
      outcomePrices: outcomePrices,
      volume: parseFloat(market.volume || 0),
      liquidity: parseFloat(market.liquidity || 0),
      expiresAt: market.endDate ? new Date(market.endDate) : null,
      eventId: event.id,
      eventTitle: event.title,
      tags: market.tags || event.tags || [],
      active: market.active,
      closed: market.closed
    };
  }

  filterCryptoMarkets(markets) {
    Logger.info('POLYMARKET', `Filtering ${markets.length} markets for crypto-related content`);

    // More specific crypto keywords, excluding generic terms like "Coin" without context
    const cryptoKeywords = /\b(BTC|ETH|Bitcoin|Ethereum|Crypto|Cryptocurrency|Blockchain|DeFi|NFT|Altcoin|Stablecoin|Token|Wallet|Exchange|DEX|Yield Farming|Staking|Mining|Halving|Bull|Bear|Price|Hit|Reach|Surpass|Above|Below|Over|Under|Solana|Cardano|Avalanche|Polkadot|Chainlink|Uniswap|Compound|Aave|Sushi|Yearn|Pancake|1inch|Synthetix|Curve|Balancer|Maker|Dai|USDC|USDT|WBTC|LINK|UNI|COMP|AAVE|CAKE|SNX|CRV|BAL|MKR)\b/i;

    const cryptoMarkets = markets.filter(market => {
      const textToCheck = `${market.question} ${market.description} ${market.eventTitle}`;
      return cryptoKeywords.test(textToCheck);
    });

    Logger.info('POLYMARKET', `Filtered to ${cryptoMarkets.length} crypto-related markets`);
    return cryptoMarkets;
  }

  calculateImpliedProbabilities(market) {
    // For binary markets, the outcome price represents the implied probability
    // Polymarket prices are in USDC (0.00 to 1.00 per outcome)
    // The probability of "Yes" is the price of Yes outcome

    if (!Array.isArray(market.outcomes) || market.outcomes.length !== 2 || !Array.isArray(market.outcomePrices) || market.outcomePrices.length !== 2) {
      Logger.debug('POLYMARKET', `Skipping non-binary market: ${market.id} - outcomes: ${Array.isArray(market.outcomes) ? market.outcomes.length : 'not array'}`);
      return { ...market, probability: null, impliedOdds: null };
    }

    const yesIndex = market.outcomes.findIndex(outcome => outcome && outcome.toLowerCase() === 'yes');
    if (yesIndex === -1) {
      Logger.debug('POLYMARKET', `No 'Yes' outcome found for market: ${market.id} - outcomes: ${market.outcomes.join(', ')}`);
      return { ...market, probability: null, impliedOdds: null };
    }

    const yesPrice = parseFloat(market.outcomePrices[yesIndex]);
    if (isNaN(yesPrice) || yesPrice < 0 || yesPrice > 1) {
      Logger.warn('POLYMARKET', `Invalid Yes price for market: ${market.id} - ${market.outcomePrices[yesIndex]}`);
      return { ...market, probability: null, impliedOdds: null };
    }

    // Account for Polymarket fees (~2-3% total)
    // The displayed price already includes fees, so probability is approximately the price
    const probability = yesPrice;

    // Calculate implied odds (1/probability), handle 0 probability
    const impliedOdds = probability > 0 ? 1 / probability : Infinity;

    Logger.debug('POLYMARKET', `Market ${market.id}: probability ${(probability * 100).toFixed(2)}%, odds ${impliedOdds === Infinity ? '∞' : impliedOdds.toFixed(2)}`);

    return {
      ...market,
      probability: probability,
      impliedOdds: impliedOdds
    };
  }
}