import { describe, expect, it } from 'vitest';
import { detectDeviceType, parseUserAgent } from './context';

describe('context user agent parsing', () => {
  it('erkennt gaengige Browser und Versionen', () => {
    expect(parseUserAgent('Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36').browser).toBe('Chrome');
    expect(parseUserAgent('Mozilla/5.0 Firefox/121.0').browser).toBe('Firefox');
    expect(parseUserAgent('Mozilla/5.0 Version/17.2 Safari/605.1.15').browser).toBe('Safari');
    expect(parseUserAgent('Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0').browser).toBe('Edge');
    expect(parseUserAgent('Mozilla/5.0 SamsungBrowser/24.0 Chrome/120.0 Safari/537.36').browser).toBe(
      'Samsung Internet'
    );
  });

  it('erkennt OS und Versionen', () => {
    expect(parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0').osVersion).toBe('10.0');
    expect(parseUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) Version/17 Safari/605').osVersion).toBe('14.4');
    expect(parseUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel) Chrome/120.0').os).toBe('Android');
    expect(parseUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) Version/17 Safari/605').os).toBe(
      'iOS'
    );
  });

  it('erkennt Geraetetyp via User Agent und Touch-Signal', () => {
    expect(detectDeviceType('Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X)', 5)).toBe('mobile');
    expect(detectDeviceType('Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X)', 5)).toBe('tablet');
    expect(detectDeviceType('Mozilla/5.0 (X11; Linux x86_64)', 0)).toBe('desktop');
  });
});
