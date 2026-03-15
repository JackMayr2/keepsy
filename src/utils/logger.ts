/**
 * Central logger for troubleshooting. In __DEV__ all levels are logged;
 * in production only errors (and optionally warns) are logged.
 * Can be extended later with crash reporting (e.g. Sentry).
 */

const isDev = __DEV__;

function formatMessage(scope: string, message: string, data?: unknown): string {
  const prefix = `[${scope}]`;
  if (data !== undefined) {
    try {
      const extra = typeof data === 'object' && data !== null ? JSON.stringify(data) : String(data);
      return `${prefix} ${message} ${extra}`;
    } catch {
      return `${prefix} ${message} [serialize error]`;
    }
  }
  return `${prefix} ${message}`;
}

export const logger = {
  error(scope: string, message: string, error?: unknown): void {
    const err = error instanceof Error ? { message: error.message, name: error.name, stack: error.stack } : error;
    const out = formatMessage(scope, message, err);
    console.error(out);
    if (error instanceof Error && error.stack) console.error(error.stack);
  },

  warn(scope: string, message: string, data?: unknown): void {
    console.warn(formatMessage(scope, message, data));
  },

  info(scope: string, message: string, data?: unknown): void {
    if (isDev) console.log(formatMessage(scope, message, data));
  },

  debug(scope: string, message: string, data?: unknown): void {
    if (isDev) console.log(formatMessage(scope, message, data));
  },
};
