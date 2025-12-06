import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Logger {
  static logLevel = 'info';
  static logToFile = false;
  static logFilePath = path.join(__dirname, '../../logs/bot.log');

  static initialize(config) {
    this.logLevel = config.logLevel || 'info';
    this.logToFile = config.logToFile || false;

    // Create logs directory if file logging is enabled
    if (this.logToFile) {
      const logDir = path.dirname(this.logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  static formatMessage(level, service, message) {
    const timestamp = new Date().toISOString();
    return `[${level.toUpperCase()}] [${timestamp}] [${service}] ${message}`;
  }

  static shouldLog(level) {
    const levels = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }

  static writeToFile(message) {
    if (this.logToFile) {
      try {
        fs.appendFileSync(this.logFilePath, message + '\n');
      } catch (error) {
        console.error('Failed to write to log file:', error);
      }
    }
  }

  static info(service, message) {
    if (!this.shouldLog('info')) return;

    const formattedMessage = this.formatMessage('info', service, message);
    console.log(formattedMessage);
    this.writeToFile(formattedMessage);
  }

  static warn(service, message) {
    if (!this.shouldLog('warn')) return;

    const formattedMessage = this.formatMessage('warn', service, message);
    console.warn(formattedMessage);
    this.writeToFile(formattedMessage);
  }

  static error(service, message) {
    if (!this.shouldLog('error')) return;

    const formattedMessage = this.formatMessage('error', service, message);
    console.error(formattedMessage);
    this.writeToFile(formattedMessage);
  }

  static debug(service, message) {
    if (!this.shouldLog('debug')) return;

    const formattedMessage = this.formatMessage('debug', service, message);
    console.log(formattedMessage);
    this.writeToFile(formattedMessage);
  }
}