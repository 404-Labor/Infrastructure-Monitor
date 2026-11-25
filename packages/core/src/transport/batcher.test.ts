import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveConfig } from '../config';
import { EventBatcher } from './batcher';

describe('EventBatcher', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sendet Events gebatcht statt einzeln', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const batcher = new EventBatcher(
      resolveConfig({ projectId: 'project', server: 'https://monitor.test', maxBatchSize: 2 })
    );
    batcher.add({ type: 'console', category: 'error', severity: 'error', message: 'one' });
    expect(fetchMock).not.toHaveBeenCalled();

    batcher.add({ type: 'console', category: 'error', severity: 'error', message: 'two' });

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const request = fetchMock.mock.calls[0]?.[1];
    expect(request).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({
        'Content-Type': 'application/json'
      })
    });
  });

  it('nutzt sendBeacon beim Page-Unload', async () => {
    const beacon = vi.fn<(url: string, data?: BodyInit | null) => boolean>(() => true);
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true });

    const batcher = new EventBatcher(resolveConfig({ projectId: 'project', server: 'https://monitor.test' }));
    batcher.start();
    await Promise.resolve();
    await Promise.resolve();

    batcher.add({ type: 'console', category: 'error', severity: 'error', message: 'before unload' });
    window.dispatchEvent(new Event('pagehide'));

    expect(beacon).toHaveBeenCalledTimes(1);
    expect(beacon.mock.calls[0]?.[0]).toBe('https://monitor.test/collect');
    expect(beacon.mock.calls[0]?.[1]).toBeInstanceOf(Blob);
    batcher.stop();
  });
});
