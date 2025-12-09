// Telegram Notification Service
// Sends concise arbitrage alerts via Telegram Bot API

import axios from 'axios';
import { Logger } from '../utils/logger.js';

export class TelegramService {
  constructor(botToken, chatId) {
    this.botToken = botToken;
    this.chatId = chatId;
    this.baseUrl = `https://api.telegram.org/bot${botToken}`;
    this.sentOpportunities = new Set(); // Track sent opportunity IDs
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000, // 10 second timeout
    });

    // Add request/response interceptors for logging
    this.client.interceptors.request.use(
      (config) => {
        Logger.debug('TELEGRAM', `API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        Logger.error('TELEGRAM', `Request error: ${error.message}`);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        Logger.debug('TELEGRAM', `API Response: ${response.status}`);
        return response;
      },
      (error) => {
        Logger.warn('TELEGRAM', `API Error: ${error.response?.status} - ${error.message}`);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Send an arbitrage alert for a profitable opportunity
   * @param {Object} opportunity - Arbitrage opportunity object
   * @returns {boolean} Success status (true = sent, false = failed but logged)
   */
  async sendArbitrageAlert(opportunity) {
    try {
      const opportunityId = this.generateOpportunityId(opportunity);

      // Check for duplicates
      if (this.sentOpportunities.has(opportunityId)) {
        Logger.debug('TELEGRAM', `Skipping duplicate notification for opportunity ${opportunityId}`);
        return true; // Not an error, just already sent
      }

      const message = this.formatArbitrageMessage(opportunity);
      const success = await this.sendMessage(message);

      if (success) {
        this.sentOpportunities.add(opportunityId);
        Logger.info('TELEGRAM', `Arbitrage alert sent successfully for ${opportunityId}`);
      }

      return success;

    } catch (error) {
      Logger.error('TELEGRAM', `Failed to send arbitrage alert: ${error.message}`);
      return false; // Log error but don't throw - continue monitoring
    }
  }

  /**
   * Send a test notification to verify Telegram setup
   * @param {string} customMessage - Optional custom test message
   * @returns {boolean} Success status
   */
  async sendTestNotification(customMessage = null) {
    try {
      const message = customMessage || this.formatTestMessage();
      const success = await this.sendMessage(message);

      if (success) {
        Logger.info('TELEGRAM', 'Test notification sent successfully');
      }

      return success;

    } catch (error) {
      Logger.error('TELEGRAM', `Failed to send test notification: ${error.message}`);
      return false;
    }
  }

  /**
   * Generate unique ID for opportunity deduplication
   * @param {Object} opportunity - Arbitrage opportunity object
   * @returns {string} Unique opportunity identifier
   */
  generateOpportunityId(opportunity) {
    return `${opportunity.market.id}-${opportunity.futures.symbol}-${Math.floor(opportunity.arbitrage.profitMargin * 100)}`;
  }

  /**
   * Format concise arbitrage alert message
   * @param {Object} opportunity - Arbitrage opportunity object
   * @returns {string} Formatted Telegram message
   */
  formatArbitrageMessage(opportunity) {
    const profitPercent = (opportunity.arbitrage.profitMargin * 100).toFixed(1);
    const price = opportunity.futures.price.toLocaleString();
    const symbol = opportunity.futures.symbol.replace('USDT', '');
    const direction = opportunity.recommendation;

    // Generate market links
    const polymarketLink = this.generatePolymarketLink(opportunity.market);
    const binanceLink = this.generateBinanceLink(opportunity.futures.symbol);

    return `🚨 Arbitrage Alert!

Profit: ${profitPercent}%
Price: $${price} (${symbol})
Direction: ${direction}

🔗 Polymarket: ${polymarketLink}
🔗 Binance: ${binanceLink}

#Arbitrage`;
  }

  /**
   * Format test notification message
   * @returns {string} Test message
   */
  formatTestMessage() {
    const timestamp = new Date().toLocaleString();
    return `🧪 Telegram Bot Test

✅ Connection successful!
📅 ${timestamp}

Your arbitrage bot is ready to send notifications!

#Test`;
  }

  /**
   * Generate Polymarket market link
   * @param {Object} market - Market object
   * @returns {string} Polymarket URL
   */
  generatePolymarketLink(market) {
    // Polymarket URLs typically follow this pattern
    // We can enhance this with actual market slugs if available
    const baseUrl = 'https://polymarket.com';
    if (market.id) {
      return `${baseUrl}/market/${market.id}`;
    }
    return baseUrl; // Fallback to main page
  }

  /**
   * Generate Binance futures trading link
   * @param {string} symbol - Trading symbol (e.g., "BTCUSDT")
   * @returns {string} Binance futures URL
   */
  generateBinanceLink(symbol) {
    return `https://www.binance.com/en/futures/${symbol}`;
  }

  /**
   * Send message via Telegram Bot API
   * @param {string} message - Message to send
   * @returns {boolean} Success status
   */
  async sendMessage(message) {
    try {
      const response = await this.client.post('/sendMessage', {
        chat_id: this.chatId,
        text: message,
        parse_mode: 'HTML', // Allow basic formatting
        disable_web_page_preview: false // Allow link previews
      });

      return response.data.ok === true;

    } catch (error) {
      // Log the error but don't throw - monitoring should continue
      Logger.error('TELEGRAM', `Send message failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get notification statistics
   * @returns {Object} Statistics object
   */
  getStatistics() {
    return {
      totalSent: this.sentOpportunities.size,
      sentOpportunities: Array.from(this.sentOpportunities)
    };
  }

  /**
   * Clear sent opportunities cache (useful for testing)
   */
  clearCache() {
    this.sentOpportunities.clear();
    Logger.info('TELEGRAM', 'Notification cache cleared');
  }
}