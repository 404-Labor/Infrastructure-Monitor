export type WatchDogEventType = 'error' | 'console' | 'network' | 'performance';

export type WatchDogSeverity = 'debug' | 'info' | 'warning' | 'error' | 'critical';

export interface WatchDogConfig {
  server?: string;
  projectId: string;
  sendInterval?: number;
  trackConsole?: boolean;
  trackWarnings?: boolean;
  trackNetwork?: boolean;
  trackPerformance?: boolean;
  anonymizeIp?: boolean;
  fingerprintRotation?: number;
  maxBatchSize?: number;
  networkTimeout?: number;
  slowResourceThreshold?: number;
  debug?: boolean;
}

export interface ResolvedWatchDogConfig {
  server: string;
  projectId: string;
  sendInterval: number;
  trackConsole: boolean;
  trackWarnings: boolean;
  trackNetwork: boolean;
  trackPerformance: boolean;
  anonymizeIp: boolean;
  fingerprintRotation: number;
  maxBatchSize: number;
  networkTimeout: number;
  slowResourceThreshold: number;
  debug: boolean;
}

export interface WatchDogContext {
  clientId: string;
  url: string;
  referrer: string;
  userAgent: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  viewport: {
    width: number;
    height: number;
  };
  screen: {
    width: number;
    height: number;
    colorDepth: number;
  };
  connectionType?: string;
  language: string;
  timezone: string;
}

export interface WatchDogEvent {
  id: string;
  type: WatchDogEventType;
  category: string;
  severity: WatchDogSeverity;
  message: string;
  timestamp: string;
  url: string;
  stackTrace?: string;
  metadata?: Record<string, unknown>;
}

export interface WatchDogPayload {
  projectId: string;
  sentAt: string;
  context: WatchDogContext;
  events: WatchDogEvent[];
}

export interface Collector {
  start(): void;
  stop(): void;
}
