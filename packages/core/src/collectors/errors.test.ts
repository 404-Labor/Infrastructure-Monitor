import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBatcher } from '../transport/batcher';
import { ErrorCollector, normalizeStackTrace } from './errors';

describe('ErrorCollector', () => {
  beforeEach(() => {
    window.onerror = null;
    window.onunhandledrejection = null;
    vi.setSystemTime(new Date('2026-05-15T00:00:00.000Z'));
  });

  it('faengt window.onerror ab und dedupliziert gleiche Fehler fuer 5 Sekunden', () => {
    const batcher = { add: vi.fn() } as unknown as EventBatcher;
    const collector = new ErrorCollector(batcher);
    collector.start();

    const error = new Error('boom');
    window.onerror?.('boom', 'app.js', 10, 2, error);
    window.onerror?.('boom', 'app.js', 10, 2, error);

    expect(batcher.add).toHaveBeenCalledTimes(1);
    expect(batcher.add).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        category: 'uncaught-exception',
        message: 'boom'
      })
    );
  });

  it('faengt onunhandledrejection ab', () => {
    const batcher = { add: vi.fn() } as unknown as EventBatcher;
    const collector = new ErrorCollector(batcher);
    collector.start();

    window.onunhandledrejection?.({ reason: new Error('promise failed') } as PromiseRejectionEvent);

    expect(batcher.add).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        category: 'unhandled-rejection',
        message: 'promise failed'
      })
    );
  });

  it('normalisiert Chrome-, Firefox- und Safari-Stacks lesbar', () => {
    expect(normalizeStackTrace('Error: x\n    at fn (https://app.test/main.js:1:2)')).toContain(
      'fn (https://app.test/main.js:1:2)'
    );
    expect(normalizeStackTrace('fn@https://app.test/main.js:3:4')).toBe('fn (https://app.test/main.js:3:4)');
    expect(normalizeStackTrace('https://app.test/main.js:5:6')).toBe('<anonymous> (https://app.test/main.js:5:6)');
  });
});
