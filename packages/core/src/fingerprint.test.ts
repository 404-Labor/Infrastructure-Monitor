import { beforeEach, describe, expect, it } from 'vitest';
import { getFingerprintId } from './fingerprint';

describe('getFingerprintId', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('liefert eine stabile 16-stellige ID bei Page-Reloads', async () => {
    const first = await getFingerprintId(30);
    const second = await getFingerprintId(30);

    expect(first).toHaveLength(16);
    expect(second).toBe(first);
  });

  it('rotiert bei anderer Rotation-Konfiguration', async () => {
    const first = await getFingerprintId(30);
    const second = await getFingerprintId(1);

    expect(second).toHaveLength(16);
    expect(second).not.toBe(first);
  });
});
