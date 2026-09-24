/**
 * Structured security/reliability logger for GHRS server-side code.
 *
 * Provides consistent JSON-structured output with:
 * - Level (error, warn, info)
 * - Event name (stable identifier)
 * - Safe metadata (no secrets)
 * - Timestamp
 *
 * This is NOT a replacement for all console.log/error calls.
 * It is specifically for security-relevant and operational events
 * that need structured observability.
 */

type LogLevel = 'error' | 'warn' | 'info';

interface LogEntry {
  level: LogLevel;
  event: string;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

/**
 * Log a structured security or operational event.
 *
 * @param level - Severity level
 * @param event - Stable event name (e.g., 'auth.login.success')
 * @param message - Human-readable message
 * @param meta - Safe contextual metadata (no secrets, no tokens, no PINs)
 */
export function logEvent(
  level: LogLevel,
  event: string,
  message: string,
  meta?: Record<string, unknown>
): void {
  const entry: LogEntry = {
    level,
    event,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  const prefix = `[GHRS ${level.toUpperCase()}]`;
  const line = `${prefix} [${event}] ${message}`;

  if (meta && Object.keys(meta).length > 0) {
    console[level](line, meta);
  } else {
    console[level](line);
  }
}

/**
 * Convenience: log an authentication success event.
 */
export function logAuthSuccess(
  event: string,
  meta?: { member_id?: string; role?: string; via?: string }
): void {
  logEvent('info', event, 'success', meta);
}

/**
 * Convenience: log an authentication failure event.
 */
export function logAuthFailure(event: string, meta?: { reason?: string; ip?: string }): void {
  logEvent('warn', event, 'failure', meta);
}

/**
 * Convenience: log an application error event.
 */
export function logError(event: string, message: string, meta?: Record<string, unknown>): void {
  logEvent('error', event, message, meta);
}
