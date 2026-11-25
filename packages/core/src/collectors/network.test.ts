import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveConfig } from '../config';
import { EventBatcher } from '../transport/batcher';
import { NetworkCollector } from './network';

describe('NetworkCollector', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('faengt fetch-4xx/5xx ab, misst Dauer und ignoriert WatchDog-Requests', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('', { status: 500, statusText: 'Server Error' }))
      .mockResolvedValueOnce(new Response('', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(window, 'fetch', { value: fetchMock, configurable: true });
    vi.spyOn(performance, 'now').mockReturnValueOnce(10).mockReturnValueOnce(42);

    const batcher = { add: vi.fn() } as unknown as EventBatcher;
    const collector = new NetworkCollector(
      resolveConfig({ projectId: 'project', server: 'https://monitor.test' }),
      batcher
    );
    collector.start();

    await window.fetch('https://api.test/fail');
    await window.fetch('https://monitor.test/collect');

    expect(batcher.add).toHaveBeenCalledTimes(1);
    expect(batcher.add).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'network',
        category: 'fetch',
        metadata: expect.objectContaining({
          status: 500,
          durationMs: 32
        })
      })
    );
  });

  it('faengt XMLHttpRequest-Fehler ab', () => {
    const batcher = { add: vi.fn() } as unknown as EventBatcher;
    const collector = new NetworkCollector(
      resolveConfig({ projectId: 'project', server: 'https://monitor.test' }),
      batcher
    );
    const OriginalXhr = window.XMLHttpRequest;
    Object.defineProperty(window, 'XMLHttpRequest', { value: FakeXMLHttpRequest, configurable: true });
    vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequest);
    vi.spyOn(performance, 'now').mockReturnValueOnce(100).mockReturnValueOnce(155);

    collector.start();
    const xhr = new window.XMLHttpRequest();
    xhr.open('GET', 'https://api.test/missing');
    xhr.send();

    expect(batcher.add).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'network',
        category: 'xhr',
        metadata: expect.objectContaining({
          status: 404,
          durationMs: 55
        })
      })
    );

    Object.defineProperty(window, 'XMLHttpRequest', { value: OriginalXhr, configurable: true });
  });
});

class FakeXMLHttpRequest {
  public status = 404;
  public __watchDogRequest?: {
    method: string;
    url: string;
    start: number;
    skip: boolean;
  };

  private loadEndListener: (() => void) | undefined;

  public open(_method: string, _url: string | URL, _async?: boolean): void {}

  public send(_body?: Document | XMLHttpRequestBodyInit | null): void {
    this.loadEndListener?.();
  }

  public addEventListener(type: string, listener: () => void): void {
    if (type === 'loadend') {
      this.loadEndListener = listener;
    }
  }
}
