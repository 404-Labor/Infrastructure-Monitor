import type { EventBatcher } from '../transport/batcher';
import { WATCHDOG_REPORT_HEADER } from '../transport/sender';
import type { Collector, ResolvedWatchDogConfig } from '../types';

export class NetworkCollector implements Collector {
  private originalFetch: typeof window.fetch | undefined;
  private originalOpen: typeof XMLHttpRequest.prototype.open | undefined;
  private originalSend: typeof XMLHttpRequest.prototype.send | undefined;

  public constructor(
    private readonly config: ResolvedWatchDogConfig,
    private readonly batcher: EventBatcher
  ) {}

  public start(): void {
    this.patchFetch();
    this.patchXhr();
  }

  public stop(): void {
    if (this.originalFetch) {
      window.fetch = this.originalFetch;
    }

    if (this.originalOpen) {
      XMLHttpRequest.prototype.open = this.originalOpen;
    }

    if (this.originalSend) {
      XMLHttpRequest.prototype.send = this.originalSend;
    }
  }

  private patchFetch(): void {
    this.originalFetch = window.fetch.bind(window);

    window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
      const request = new Request(...args);
      if (shouldSkip(request, this.config.server)) {
        return this.originalFetch!(...args);
      }

      const start = performance.now();

      try {
        const response = await this.originalFetch!(...args);
        const duration = performance.now() - start;
        if (!response.ok || duration > this.config.networkTimeout) {
          this.captureNetworkEvent(request.method, response.url, duration, response.status, response.statusText);
        }

        return response;
      } catch (error) {
        this.captureNetworkEvent(request.method, request.url, performance.now() - start, undefined, undefined, error);
        throw error;
      }
    };
  }

  private patchXhr(): void {
    this.originalOpen = XMLHttpRequest.prototype.open;
    this.originalSend = XMLHttpRequest.prototype.send;
    const batcher = this.batcher;
    const timeout = this.config.networkTimeout;
    const originalOpen = this.originalOpen;

    XMLHttpRequest.prototype.open = function patchedOpen(
      this: XMLHttpRequest,
      method: string,
      url: string | URL,
      async: boolean = true,
      username?: string | null,
      password?: string | null
    ): void {
      this.__watchDogRequest = {
        method,
        url: String(url),
        start: 0
      };

      return username !== undefined
        ? originalOpen.call(this, method, url, async, username, password)
        : originalOpen.call(this, method, url, async);
    };

    const originalSend = this.originalSend;
    XMLHttpRequest.prototype.send = function patchedSend(body?: Document | XMLHttpRequestBodyInit | null): void {
      const request = this.__watchDogRequest;
      if (request) {
        request.start = performance.now();
        this.addEventListener('loadend', () => {
          const duration = performance.now() - request.start;
          if (this.status >= 400 || duration > timeout) {
            batcher.add({
              type: 'network',
              category: 'xhr',
              severity: this.status >= 500 ? 'error' : 'warning',
              message: `${request.method} ${request.url} ${this.status}`,
              metadata: {
                method: request.method,
                url: request.url,
                status: this.status,
                durationMs: Math.round(duration)
              }
            });
          }
        });
      }

      return originalSend!.call(this, body);
    };
  }

  private captureNetworkEvent(
    method: string,
    url: string,
    duration: number,
    status?: number,
    statusText?: string,
    error?: unknown
  ): void {
    this.batcher.add({
      type: 'network',
      category: 'fetch',
      severity: status && status >= 500 ? 'error' : 'warning',
      message: `${method} ${url} ${status ?? 'failed'}`,
      metadata: {
        method,
        url,
        status,
        statusText,
        durationMs: Math.round(duration),
        error: error instanceof Error ? error.message : undefined
      }
    });
  }
}

function shouldSkip(request: Request, server: string): boolean {
  return request.headers.has(WATCHDOG_REPORT_HEADER) || request.url.startsWith(server);
}

declare global {
  interface XMLHttpRequest {
    __watchDogRequest?: {
      method: string;
      url: string;
      start: number;
    };
  }
}
