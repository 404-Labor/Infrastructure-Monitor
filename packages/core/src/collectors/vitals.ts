import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';
import type { EventBatcher } from '../transport/batcher';
import type { Collector, ResolvedWatchDogConfig } from '../types';

export class VitalsCollector implements Collector {
  private readonly observers: PerformanceObserver[] = [];

  public constructor(
    private readonly config: ResolvedWatchDogConfig,
    private readonly batcher: EventBatcher
  ) {}

  public start(): void {
    const captureMetric = (metric: Metric): void => {
      this.batcher.add({
        type: 'performance',
        category: 'web-vital',
        severity: 'info',
        message: `${metric.name}: ${metric.value}`,
        metadata: {
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
          id: metric.id
        }
      });
    };

    onCLS(captureMetric);
    onFCP(captureMetric);
    onINP(captureMetric);
    onLCP(captureMetric);
    onTTFB(captureMetric);
    this.captureNavigationTiming();
    this.observeResources();
    this.observeLongTasks();
  }

  public stop(): void {
    for (const observer of this.observers) {
      observer.disconnect();
    }

    this.observers.length = 0;
  }

  private captureNavigationTiming(): void {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (!navigation) {
      return;
    }

    this.batcher.add({
      type: 'performance',
      category: 'navigation',
      severity: 'info',
      message: 'Navigation timing',
      metadata: {
        load: Math.round(navigation.loadEventEnd - navigation.startTime),
        domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.startTime),
        domInteractive: Math.round(navigation.domInteractive - navigation.startTime)
      }
    });
  }

  private observeResources(): void {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntriesByType('resource') as PerformanceResourceTiming[]) {
        if (entry.duration < this.config.slowResourceThreshold) {
          continue;
        }

        this.batcher.add({
          type: 'performance',
          category: 'resource',
          severity: 'warning',
          message: `Slow resource: ${entry.name}`,
          metadata: {
            name: entry.name,
            initiatorType: entry.initiatorType,
            durationMs: Math.round(entry.duration),
            transferSize: entry.transferSize
          }
        });
      }
    });

    observer.observe({ type: 'resource', buffered: true });
    this.observers.push(observer);
  }

  private observeLongTasks(): void {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    try {
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          this.batcher.add({
            type: 'performance',
            category: 'long-task',
            severity: 'warning',
            message: `Long task: ${Math.round(entry.duration)}ms`,
            metadata: {
              durationMs: Math.round(entry.duration),
              startTime: Math.round(entry.startTime)
            }
          });
        }
      });

      observer.observe({ type: 'longtask', buffered: true });
      this.observers.push(observer);
    } catch {
      // Safari/Firefox koennen Long Tasks je nach Version nicht beobachten.
    }
  }
}
