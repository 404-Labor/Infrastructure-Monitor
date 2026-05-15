import 'fake-indexeddb/auto';
import { vi } from 'vitest';

Object.defineProperty(window, 'innerWidth', {
  value: 1280,
  configurable: true
});

Object.defineProperty(window, 'innerHeight', {
  value: 720,
  configurable: true
});

Object.defineProperty(globalThis.crypto, 'subtle', {
  value: {
    digest: vi.fn(async (_algorithm: AlgorithmIdentifier, data: BufferSource) => {
      const text = new TextDecoder().decode(data as ArrayBuffer);
      let hash = 0x811c9dc5;
      for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
      }
      const bytes = new Uint8Array(32);
      for (let index = 0; index < bytes.length; index += 4) {
        bytes[index] = hash & 0xff;
        bytes[index + 1] = (hash >> 8) & 0xff;
        bytes[index + 2] = (hash >> 16) & 0xff;
        bytes[index + 3] = (hash >> 24) & 0xff;
      }
      return bytes.buffer;
    })
  },
  configurable: true
});

Object.defineProperty(globalThis.crypto, 'randomUUID', {
  value: vi.fn(() => '00000000-0000-4000-8000-000000000000'),
  configurable: true
});

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn(() => ({
    fillRect: vi.fn(),
    fillText: vi.fn(),
    set textBaseline(_value: string) {},
    set font(_value: string) {},
    set fillStyle(_value: string) {}
  })),
  configurable: true
});

Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
  value: vi.fn(() => 'data:image/png;base64,watchdog'),
  configurable: true
});
