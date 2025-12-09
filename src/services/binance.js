// Binance Futures API Client
// Fetches futures contract prices and funding rates using public endpoints

import axios from 'axios';
import { Logger } from '../utils/logger.js';

export class BinanceService {
  constructor() {
    this.baseURL = 'https://fapi.binance.com/fapi/v1';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000, // 10 second timeout
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        Logger.debug('BINANCE', `API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        Logger.error('BINANCE', `Request error: ${error.message}`);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging and retry logic
    this.client.interceptors.response.use(
      (response) => {
        Logger.debug('BINANCE', `API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      async (error) => {
        Logger.warn('BINANCE', `API Error: ${error.response?.status} ${error.config?.url} - ${error.message}`);

        // Implement simple retry for rate limits (429) or server errors (5xx)
        if (error.response?.status === 429 || (error.response?.status >= 500 && error.response?.status < 600)) {
          const retryCount = error.config.retryCount || 0;
          if (retryCount < 3) {
            const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
            Logger.info('BINANCE', `Retrying request in ${delay}ms (attempt ${retryCount + 1}/3)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            error.config.retryCount = retryCount + 1;
            return this.client.request(error.config);
          }
        }

        return Promise.reject(error);
      }
    );

    // Cache for contract info and funding rates to reduce API calls
    this.contractCache = new Map();
    this.fundingRateCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes cache
  }

  async fetchFuturesPrice(symbol) {
    try {
      Logger.info('BINANCE', `Fetching futures price for ${symbol}`);

      const response = await this.client.get('/ticker/price', {
        params: { symbol: symbol.toUpperCase() }
      });

      const data = response.data;
      const priceData = {
        symbol: data.symbol,
        price: parseFloat(data.price),
        timestamp: Date.now()
      };

      Logger.debug('BINANCE', `Fetched price for ${symbol}: $${priceData.price}`);
      return priceData;

    } catch (error) {
      Logger.error('BINANCE', `Failed to fetch futures price for ${symbol}: ${error.message}`);
      throw error;
    }
  }

  async fetchMultiplePrices(symbols) {
    try {
      Logger.info('BINANCE', `Fetching futures prices for ${symbols.length} symbols`);

      // Binance API has issues with the symbols parameter, so we'll make individual calls
      const prices = [];
      for (const symbol of symbols) {
        try {
          const priceData = await this.fetchFuturesPrice(symbol);
          prices.push(priceData);
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (error) {
          Logger.warn('BINANCE', `Failed to fetch price for ${symbol}: ${error.message}`);
        }
      }

      Logger.debug('BINANCE', `Fetched ${prices.length} prices`);
      return prices;

    } catch (error) {
      Logger.error('BINANCE', `Failed to fetch multiple prices: ${error.message}`);
      throw error;
    }
  }

  async fetchFundingRate(symbol) {
    try {
      // Check cache first
      const cacheKey = `funding_${symbol}`;
      const cached = this.fundingRateCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
        Logger.debug('BINANCE', `Using cached funding rate for ${symbol}`);
        return cached.data;
      }

      Logger.info('BINANCE', `Fetching funding rate for ${symbol}`);

      const response = await this.client.get('/premiumIndex', {
        params: { symbol: symbol.toUpperCase() }
      });

      const data = response.data;
      const fundingData = {
        symbol: data.symbol,
        fundingRate: parseFloat(data.lastFundingRate),
        markPrice: parseFloat(data.markPrice),
        indexPrice: parseFloat(data.indexPrice),
        estimatedSettlePrice: parseFloat(data.estimatedSettlePrice),
        timestamp: Date.now(),
        nextFundingTime: parseInt(data.nextFundingTime)
      };

      // Cache the result
      this.fundingRateCache.set(cacheKey, {
        data: fundingData,
        timestamp: Date.now()
      });

      Logger.debug('BINANCE', `Fetched funding rate for ${symbol}: ${fundingData.fundingRate}`);
      return fundingData;

    } catch (error) {
      Logger.error('BINANCE', `Failed to fetch funding rate for ${symbol}: ${error.message}`);
      throw error;
    }
  }

  async fetchContractInfo(symbol) {
    try {
      // Check cache first
      const cacheKey = `contract_${symbol}`;
      const cached = this.contractCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
        Logger.debug('BINANCE', `Using cached contract info for ${symbol}`);
        return cached.data;
      }

      Logger.info('BINANCE', `Fetching contract info for ${symbol}`);

      const response = await this.client.get('/exchangeInfo');

      const contract = response.data.symbols.find(s => s.symbol === symbol.toUpperCase());
      if (!contract) {
        throw new Error(`Contract ${symbol} not found`);
      }

      const contractData = {
        symbol: contract.symbol,
        pair: contract.pair,
        contractType: contract.contractType,
        deliveryDate: contract.deliveryDate,
        onboardDate: contract.onboardDate,
        status: contract.status,
        maintMarginPercent: contract.maintMarginPercent,
        requiredMarginPercent: contract.requiredMarginPercent,
        baseAsset: contract.baseAsset,
        quoteAsset: contract.quoteAsset,
        marginAsset: contract.marginAsset,
        pricePrecision: contract.pricePrecision,
        quantityPrecision: contract.quantityPrecision,
        baseAssetPrecision: contract.baseAssetPrecision,
        quotePrecision: contract.quotePrecision,
        underlyingType: contract.underlyingType,
        underlyingSubType: contract.underlyingSubType,
        settlePlan: contract.settlePlan,
        triggerProtect: contract.triggerProtect,
        filters: contract.filters,
        timestamp: Date.now()
      };

      // Cache the result
      this.contractCache.set(cacheKey, {
        data: contractData,
        timestamp: Date.now()
      });

      Logger.debug('BINANCE', `Fetched contract info for ${symbol}`);
      return contractData;

    } catch (error) {
      Logger.error('BINANCE', `Failed to fetch contract info for ${symbol}: ${error.message}`);
      throw error;
    }
  }

  async calculateExpirationPrice(symbol, expirationDate, currentPrice = null) {
    try {
      Logger.info('BINANCE', `Calculating expiration price for ${symbol} at ${expirationDate}`);

      // Get current price if not provided
      if (!currentPrice) {
        const priceData = await this.fetchFuturesPrice(symbol);
        currentPrice = priceData.price;
      }

      // Get funding rate data
      const fundingData = await this.fetchFundingRate(symbol);

      // Calculate time to expiration in hours
      const now = Date.now();
      const expiryTime = new Date(expirationDate).getTime();
      const hoursToExpiry = (expiryTime - now) / (1000 * 60 * 60);

      if (hoursToExpiry <= 0) {
        Logger.warn('BINANCE', `Expiration date ${expirationDate} is in the past`);
        return currentPrice;
      }

      // Funding rate is paid every 8 hours
      const fundingIntervals = hoursToExpiry / 8;

      // Calculate funding cost impact on price
      // This is a simplified calculation - in reality, funding rates affect price continuously
      const fundingImpact = fundingData.fundingRate * fundingIntervals;

      // For longs: positive funding rate means paying funding, which decreases price
      // For shorts: positive funding rate means receiving funding, which increases price
      // Since we're projecting future price, we need to estimate the direction
      // For simplicity, we'll assume the market moves toward fair value
      const projectedPrice = currentPrice * (1 + fundingImpact * 0.1); // Dampened impact

      const result = {
        symbol,
        currentPrice,
        projectedPrice,
        hoursToExpiry,
        fundingRate: fundingData.fundingRate,
        fundingIntervals,
        fundingImpact,
        expirationDate,
        timestamp: Date.now()
      };

      Logger.debug('BINANCE', `Calculated expiration price for ${symbol}: $${currentPrice} → $${projectedPrice.toFixed(2)}`);
      return result;

    } catch (error) {
      Logger.error('BINANCE', `Failed to calculate expiration price for ${symbol}: ${error.message}`);
      throw error;
    }
  }
}