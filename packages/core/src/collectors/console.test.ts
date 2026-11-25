import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventBatcher } from '../transport/batcher';
import { resolveConfig } from '../config';
import { ConsoleCollector, serializeConsoleArgs } from './console';

describe('ConsoleCollector', () => {
  const originalError = window.console.error;

  afterEach(() => {
    window.console.error = originalError;
  });

  it('faengt console.error ab und ruft das Original weiter auf', () => {
    const original = vi.fn();
    window.console.error = original;
    const batcher = { add: vi.fn() } as unknown as EventBatcher;
    const collector = new ConsoleCollector(resolveConfig({ projectId: 'project' }), batcher);

    collector.start();
    window.console.error('kaputt', { code: 500 });

    expect(original).toHaveBeenCalledWith('kaputt', { code: 500 });
    expect(batcher.add).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'console',
        category: 'error',
        message: 'kaputt {"code":500}'
      })
    );
  });

  it('serialisiert zirkulaere Objekte ohne Fehler', () => {
    interface CircularValue {
      name: string;
      self?: CircularValue;
    }

    const value: CircularValue = { name: 'root' };
    value.self = value;

    expect(serializeConsoleArgs([value])).toBe('{"name":"root","self":"[Circular]"}');
  });
});
