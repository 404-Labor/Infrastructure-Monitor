const STORAGE_KEY = 'watchdog:fingerprint';

interface StoredFingerprint {
  id: string;
  createdAt: number;
  rotationDays: number;
}

export async function getFingerprintId(rotationDays: number): Promise<string> {
  const stored = readStoredFingerprint();
  if (stored && stored.rotationDays === rotationDays && !isExpired(stored)) {
    return stored.id;
  }

  const id = await createFingerprintId(rotationDays);
  writeStoredFingerprint({ id, createdAt: Date.now(), rotationDays });
  return id;
}

async function createFingerprintId(rotationDays: number): Promise<string> {
  const entropy = [
    navigator.hardwareConcurrency ?? 'unknown-cpu',
    readDeviceMemory(),
    navigator.userAgent,
    createCanvasFingerprint(),
    await createAudioFingerprint(),
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    rotationBucket(rotationDays)
  ].join('|');

  return hash(entropy).then((value) => value.slice(0, 16));
}

function readStoredFingerprint(): StoredFingerprint | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredFingerprint) : null;
  } catch {
    return null;
  }
}

function writeStoredFingerprint(value: StoredFingerprint): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Private-Browsing- oder Storage-Policies duerfen das SDK nicht blockieren.
  }
}

function isExpired(value: StoredFingerprint): boolean {
  const maxAgeMs = value.rotationDays * 24 * 60 * 60 * 1_000;
  return Date.now() - value.createdAt > maxAgeMs;
}

function rotationBucket(rotationDays: number): number {
  const bucketMs = rotationDays * 24 * 60 * 60 * 1_000;
  return Math.floor(Date.now() / bucketMs);
}

function readDeviceMemory(): string {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return String(nav.deviceMemory ?? 'unknown-memory');
}

function createCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      return 'canvas-unavailable';
    }

    canvas.width = 240;
    canvas.height = 60;
    context.textBaseline = 'top';
    context.font = '16px Arial';
    context.fillStyle = '#f60';
    context.fillRect(0, 0, 240, 60);
    context.fillStyle = '#069';
    context.fillText('WatchDog fingerprint', 8, 8);
    context.fillStyle = 'rgba(102, 204, 0, 0.7)';
    context.fillText('WatchDog fingerprint', 10, 10);
    return canvas.toDataURL();
  } catch {
    return 'canvas-error';
  }
}

async function createAudioFingerprint(): Promise<string> {
  try {
    const AudioContextCtor = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!AudioContextCtor) {
      return 'audio-unavailable';
    }

    const context = new AudioContextCtor(1, 5_000, 44_100);
    const oscillator = context.createOscillator();
    const compressor = context.createDynamicsCompressor();
    oscillator.type = 'triangle';
    oscillator.frequency.value = 1_000;
    oscillator.connect(compressor);
    compressor.connect(context.destination);
    oscillator.start(0);
    const buffer = await context.startRendering();
    return Array.from(buffer.getChannelData(0).slice(0, 64))
      .map((sample) => sample.toFixed(5))
      .join(',');
  } catch {
    return 'audio-error';
  }
}

async function hash(value: string): Promise<string> {
  if (!crypto.subtle) {
    return fallbackHash(value);
  }

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function fallbackHash(value: string): string {
  let hashValue = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hashValue ^= value.charCodeAt(index);
    hashValue = Math.imul(hashValue, 0x01000193);
  }
  return Math.abs(hashValue).toString(16).padStart(16, '0');
}

declare global {
  interface Window {
    webkitOfflineAudioContext?: typeof OfflineAudioContext;
  }
}
