import type { EventBatcher } from '../transport/batcher';
import type { Collector, ResolvedWatchDogConfig } from '../types';

type ConsoleMethod = 'error' | 'warn';

export class ConsoleCollector implements Collector {
  private readonly originals = new Map<ConsoleMethod, (...args: unknown[]) => void>();

  public constructor(
    private readonly config: ResolvedWatchDogConfig,
    private readonly batcher: EventBatcher
  ) {}

  public start(): void {
    const methods: ConsoleMethod[] = this.config.trackWarnings ? ['error', 'warn'] : ['error'];

    for (const method of methods) {
      const original = window.console[method].bind(window.console);
      this.originals.set(method, original);

      window.console[method] = (...args: unknown[]) => {
        original(...args);
        this.batcher.add({
          type: 'console',
          category: method,
          severity: method === 'error' ? 'error' : 'warning',
          message: formatArgs(args),
          stackTrace: createStackTrace()
        });
      };
    }
  }

  public stop(): void {
    for (const [method, original] of this.originals) {
      window.console[method] = original;
    }

    this.originals.clear();
  }
}

function formatArgs(args: unknown[]): string {
  return args
    .map(arg => {
      if (typeof arg === 'string') {
        return arg;
      }

      try {
        return JSON.stringify(arg);
      } catch {
        return '[Unserializable Object]';
      }
    })
    .join(' ');
}

function createStackTrace(): string | undefined {
  try {
    throw new Error('Console call');
  } catch (error) {
    return error instanceof Error ? error.stack : undefined;
  }
}
