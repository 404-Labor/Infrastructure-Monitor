import type { Collector } from '../types';
import type { EventBatcher } from '../transport/batcher';

export class ErrorCollector implements Collector {
  private previousOnError: OnErrorEventHandler | null = null;
  private previousUnhandledRejection: ((event: PromiseRejectionEvent) => void) | null = null;

  public constructor(private readonly batcher: EventBatcher) {}

  public start(): void {
    this.previousOnError = window.onerror;
    this.previousUnhandledRejection = window.onunhandledrejection;

    window.onerror = (message, source, lineno, colno, error) => {
      this.batcher.add({
        type: 'error',
        category: 'uncaught-exception',
        severity: 'critical',
        message: String(message),
        stackTrace: error?.stack,
        metadata: {
          source,
          lineno,
          colno
        }
      });

      if (typeof this.previousOnError === 'function') {
        return this.previousOnError(message, source, lineno, colno, error);
      }

      return false;
    };

    window.onunhandledrejection = (event: PromiseRejectionEvent) => {
      this.batcher.add({
        type: 'error',
        category: 'unhandled-rejection',
        severity: 'critical',
        message: formatReason(event.reason),
        stackTrace: event.reason instanceof Error ? event.reason.stack : undefined,
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
