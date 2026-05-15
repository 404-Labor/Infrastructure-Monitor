import type { Collector } from '../types';
import type { EventBatcher } from '../transport/batcher';

const DEDUPE_WINDOW_MS = 5_000;

export class ErrorCollector implements Collector {
  private previousOnError: OnErrorEventHandler | null = null;
  private previousUnhandledRejection: ((event: PromiseRejectionEvent) => void) | null = null;
  private readonly recentErrors = new Map<string, number>();

  public constructor(private readonly batcher: EventBatcher) {}

  public start(): void {
    this.previousOnError = window.onerror;
    this.previousUnhandledRejection = window.onunhandledrejection;

    window.onerror = (message, source, lineno, colno, error) => {
      const normalizedStack = normalizeStackTrace(error?.stack);
      const errorKey = createErrorKey(String(message), normalizedStack, source, lineno, colno);
      if (this.isDuplicate(errorKey)) {
        return this.callPreviousOnError(message, source, lineno, colno, error);
      }

      this.batcher.add({
        type: 'error',
        category: 'uncaught-exception',
        severity: 'critical',
        message: String(message),
        stackTrace: normalizedStack,
        metadata: {
          source,
          lineno,
          colno
        }
      });

      return this.callPreviousOnError(message, source, lineno, colno, error);
    };

    window.onunhandledrejection = (event: PromiseRejectionEvent) => {
      const message = formatReason(event.reason);
      const stackTrace = normalizeStackTrace(event.reason instanceof Error ? event.reason.stack : undefined);
      const errorKey = createErrorKey(message, stackTrace);
      if (this.isDuplicate(errorKey)) {
        this.previousUnhandledRejection?.(event);
        return;
      }

      this.batcher.add({
        type: 'error',
        category: 'unhandled-rejection',
        severity: 'critical',
        message,
        stackTrace,
        metadata: {
          reason: serializeReason(event.reason)
        }
      });

      this.previousUnhandledRejection?.(event);
    };
  }

  public stop(): void {
    window.onerror = this.previousOnError;
    window.onunhandledrejection = this.previousUnhandledRejection;
    this.recentErrors.clear();
  }

  private isDuplicate(key: string): boolean {
    const now = Date.now();
    for (const [recentKey, timestamp] of this.recentErrors) {
      if (now - timestamp > DEDUPE_WINDOW_MS) {
        this.recentErrors.delete(recentKey);
      }
    }

    const lastSeen = this.recentErrors.get(key);
    if (lastSeen && now - lastSeen < DEDUPE_WINDOW_MS) {
      return true;
    }

    this.recentErrors.set(key, now);
    return false;
  }

  private callPreviousOnError(
    message: string | Event,
    source?: string,
    lineno?: number,
    colno?: number,
    error?: Error
  ): boolean {
    if (typeof this.previousOnError === 'function') {
      return Boolean(this.previousOnError(message, source, lineno, colno, error));
    }

    return false;
  }
}

function formatReason(reason: unknown): string {
  if (reason instanceof Error) {
    return reason.message;
  }

  return typeof reason === 'string' ? reason : 'Unhandled promise rejection';
}

function serializeReason(reason: unknown): unknown {
  if (reason instanceof Error) {
    return {
      name: reason.name,
      message: reason.message
    };
  }

  return reason;
}

export function normalizeStackTrace(stack: string | undefined): string | undefined {
  if (!stack) {
    return undefined;
  }

  return stack
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const chromeMatch = /^at\s+(.*?)\s+\((.*?):(\d+):(\d+)\)$/.exec(line);
      if (chromeMatch) {
        return `${chromeMatch[1]} (${chromeMatch[2]}:${chromeMatch[3]}:${chromeMatch[4]})`;
      }

      const firefoxSafariMatch = /^(.*?)@(.*?):(\d+):(\d+)$/.exec(line);
      if (firefoxSafariMatch) {
        const fn = firefoxSafariMatch[1] || '<anonymous>';
        return `${fn} (${firefoxSafariMatch[2]}:${firefoxSafariMatch[3]}:${firefoxSafariMatch[4]})`;
      }

      const safariGlobalMatch = /^(.*?):(\d+):(\d+)$/.exec(line);
      if (safariGlobalMatch) {
        return `<anonymous> (${safariGlobalMatch[1]}:${safariGlobalMatch[2]}:${safariGlobalMatch[3]})`;
      }

      return line.replace(/^at\s+/, '');
    })
    .join('\n');
}

function createErrorKey(
  message: string,
  stackTrace?: string,
  source?: string,
  lineno?: number,
  colno?: number
): string {
  return [message, stackTrace ?? '', source ?? '', lineno ?? '', colno ?? ''].join('|');
}
