/**
 * Logger Utility
 *
 * Centralized logging service that:
 * - Enables logging in development mode
 * - Suppresses logs in production (except errors)
 * - Provides consistent log formatting with timestamps
 * - Supports different log levels
 *
 * Usage:
 *   import { logger } from '@/utils/logger';
 *   logger.debug('Debug message');
 *   logger.info('Info message');
 *   logger.warn('Warning message');
 *   logger.error('Error message', error);
 */

// =============================================================================
// TYPES
// =============================================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  /** Enable all logging (default: __DEV__) */
  enabled: boolean;
  /** Minimum log level to output */
  minLevel: LogLevel;
  /** Include timestamps in logs */
  showTimestamp: boolean;
  /** Include log level prefix */
  showLevel: boolean;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const defaultConfig: LoggerConfig = {
  enabled: __DEV__,
  minLevel: __DEV__ ? 'debug' : 'error', // Only errors in production
  showTimestamp: true,
  showLevel: true,
};

let config: LoggerConfig = { ...defaultConfig };

// =============================================================================
// HELPERS
// =============================================================================

function formatTimestamp(): string {
  const now = new Date();
  return now.toISOString().slice(11, 23); // HH:MM:SS.mmm
}

function formatMessage(level: LogLevel, tag: string, message: string): string {
  const parts: string[] = [];

  if (config.showTimestamp) {
    parts.push(`[${formatTimestamp()}]`);
  }

  if (config.showLevel) {
    parts.push(`[${level.toUpperCase()}]`);
  }

  if (tag) {
    parts.push(`[${tag}]`);
  }

  parts.push(message);

  return parts.join(' ');
}

function shouldLog(level: LogLevel): boolean {
  if (!config.enabled && level !== 'error') {
    return false;
  }
  return LOG_LEVELS[level] >= LOG_LEVELS[config.minLevel];
}

// =============================================================================
// LOGGER
// =============================================================================

/**
 * Create a tagged logger for a specific module/component
 */
function createTaggedLogger(tag: string) {
  return {
    debug: (message: string, ...args: unknown[]) => {
      if (shouldLog('debug')) {
        console.log(formatMessage('debug', tag, message), ...args);
      }
    },

    info: (message: string, ...args: unknown[]) => {
      if (shouldLog('info')) {
        console.info(formatMessage('info', tag, message), ...args);
      }
    },

    warn: (message: string, ...args: unknown[]) => {
      if (shouldLog('warn')) {
        console.warn(formatMessage('warn', tag, message), ...args);
      }
    },

    error: (message: string, ...args: unknown[]) => {
      if (shouldLog('error')) {
        console.error(formatMessage('error', tag, message), ...args);
      }
    },
  };
}

/**
 * Main logger instance
 */
export const logger = {
  /**
   * Debug level - verbose development info
   */
  debug: (message: string, ...args: unknown[]) => {
    if (shouldLog('debug')) {
      console.log(formatMessage('debug', '', message), ...args);
    }
  },

  /**
   * Info level - general information
   */
  info: (message: string, ...args: unknown[]) => {
    if (shouldLog('info')) {
      console.info(formatMessage('info', '', message), ...args);
    }
  },

  /**
   * Warning level - non-critical issues
   */
  warn: (message: string, ...args: unknown[]) => {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', '', message), ...args);
    }
  },

  /**
   * Error level - critical issues (always logged)
   */
  error: (message: string, ...args: unknown[]) => {
    if (shouldLog('error')) {
      console.error(formatMessage('error', '', message), ...args);
    }
  },

  /**
   * Create a tagged logger for a specific module
   * @example const log = logger.create('Auth'); log.info('User logged in');
   */
  create: createTaggedLogger,

  /**
   * Update logger configuration
   */
  configure: (newConfig: Partial<LoggerConfig>) => {
    config = { ...config, ...newConfig };
  },

  /**
   * Reset to default configuration
   */
  reset: () => {
    config = { ...defaultConfig };
  },

  /**
   * Check if logging is enabled for a level
   */
  isEnabled: (level: LogLevel): boolean => shouldLog(level),
};

// =============================================================================
// PRE-CONFIGURED TAGGED LOGGERS
// =============================================================================

/** Logger for security-related messages */
export const securityLogger = logger.create('Security');

/** Logger for biometric-related messages */
export const biometricLogger = logger.create('Biometric');

/** Logger for notification-related messages */
export const notificationLogger = logger.create('Notification');

/** Logger for API-related messages */
export const apiLogger = logger.create('API');

/** Logger for booking flow messages */
export const bookingLogger = logger.create('Booking');

export default logger;
