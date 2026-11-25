import { ConsoleCollector } from './collectors/console';
import { ErrorCollector } from './collectors/errors';
import { NetworkCollector } from './collectors/network';
import { VitalsCollector } from './collectors/vitals';
import { resolveConfig } from './config';
import { EventBatcher } from './transport/batcher';
import type { Collector, WatchDogConfig, WatchDogEvent } from './types';

export type {
  Collector,
  ResolvedWatchDogConfig,
  WatchDogConfig,
  WatchDogContext,
  WatchDogEvent,
  WatchDogEventType,
  WatchDogPayload,
  WatchDogSeverity
} from './types';

export class WatchDogClient {
  private readonly batcher: EventBatcher;
  private readonly collectors: Collector[] = [];
  private started = false;

  public constructor(private readonly config: WatchDogConfig) {
    const resolvedConfig = resolveConfig(config);
    this.batcher = new EventBatcher(resolvedConfig);
    this.collectors.push(new ErrorCollector(this.batcher));

    if (resolvedConfig.trackConsole) {
      this.collectors.push(new ConsoleCollector(resolvedConfig, this.batcher));
    }

    if (resolvedConfig.trackNetwork) {
      this.collectors.push(new NetworkCollector(resolvedConfig, this.batcher));
    }

    if (resolvedConfig.trackPerformance) {
      this.collectors.push(new VitalsCollector(resolvedConfig, this.batcher));
    }
  }

  public start(): void {
    if (this.started) {
      return;
    }

    this.batcher.start();
    for (const collector of this.collectors) {
      collector.start();
    }

    this.started = true;
  }

  public stop(): void {
    if (!this.started) {
      return;
    }

    for (const collector of [...this.collectors].reverse()) {
      collector.stop();
    }

    this.batcher.stop();
    this.started = false;
  }

  public capture(event: Omit<WatchDogEvent, 'id' | 'timestamp' | 'url'>): void {
    this.batcher.add(event);
  }

  public flush(): Promise<void> {
    return this.batcher.flush();
  }
}

export function initWatchDog(config: WatchDogConfig): WatchDogClient {
  const client = new WatchDogClient(config);
  client.start();
  return client;
}

export const WatchDog = {
  init: initWatchDog
};
