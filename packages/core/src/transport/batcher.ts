import { collectContext } from '../context';
import type { ResolvedWatchDogConfig, WatchDogEvent, WatchDogPayload } from '../types';
import { OfflineQueue } from './queue';
import { sendPayload } from './sender';

export class EventBatcher {
  private readonly buffer: WatchDogEvent[] = [];
  private readonly offlineQueue = new OfflineQueue();
  private timer: number | undefined;
  private flushing = false;

  public constructor(private readonly config: ResolvedWatchDogConfig) {}

  public start(): void {
    this.timer = window.setInterval(() => {
      void this.flush();
    }, this.config.sendInterval);

    window.addEventListener('online', this.handleOnline);
    void this.flushOfflineQueue();
  }

  public stop(): void {
    if (this.timer) {
      window.clearInterval(this.timer);
      this.timer = undefined;
    }

    window.removeEventListener('online', this.handleOnline);
    void this.flush();
  }

  public add(event: Omit<WatchDogEvent, 'id' | 'timestamp' | 'url'> & Partial<Pick<WatchDogEvent, 'timestamp' | 'url'>>): void {
    this.buffer.push({
      id: createEventId(),
      timestamp: new Date().toISOString(),
      url: window.location.href,
      ...event
    });

    if (this.buffer.length >= this.config.maxBatchSize) {
      void this.flush();
    }
  }

  public async flush(): Promise<void> {
    if (this.flushing || this.buffer.length === 0) {
      return;
    }

    this.flushing = true;
    const events = this.buffer.splice(0);

    try {
      const payload = await this.createPayload(events);
      await sendPayload(this.config, payload);
      await this.flushOfflineQueue();
    } catch (error) {
      if (this.config.debug) {
        console.warn('WatchDog: Events werden offline zwischengespeichert.', error);
      }
      await this.offlineQueue.push(events);
    } finally {
      this.flushing = false;
    }
  }

  private async flushOfflineQueue(): Promise<void> {
    const events = await this.offlineQueue.drain(this.config.maxBatchSize);
    if (events.length === 0) {
      return;
    }

    try {
      await sendPayload(this.config, await this.createPayload(events));
    } catch (error) {
      await this.offlineQueue.push(events);
      if (this.config.debug) {
        console.warn('WatchDog: Offline-Queue konnte nicht gesendet werden.', error);
      }
    }
  }

  private async createPayload(events: WatchDogEvent[]): Promise<WatchDogPayload> {
    return {
      projectId: this.config.projectId,
      sentAt: new Date().toISOString(),
      context: await collectContext(this.config.fingerprintRotation),
      events
    };
  }

  private readonly handleOnline = (): void => {
    void this.flushOfflineQueue();
  };
}

function createEventId(): string {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
