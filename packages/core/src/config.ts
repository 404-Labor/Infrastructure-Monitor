import type { ResolvedWatchDogConfig, WatchDogConfig } from './types';

export const DEFAULT_SERVER = 'https://monitor.404-labor.de';

export const DEFAULT_CONFIG: Omit<ResolvedWatchDogConfig, 'projectId'> = {
  server: DEFAULT_SERVER,
  sendInterval: 30_000,
  trackConsole: true,
  trackWarnings: false,
  trackNetwork: true,
  trackPerformance: true,
  anonymizeIp: false,
  fingerprintRotation: 30,
  maxBatchSize: 50,
  networkTimeout: 10_000,
  httpErrorStatusThreshold: 400,
  slowResourceThreshold: 1_000,
  debug: false
};

export function resolveConfig(config: WatchDogConfig): ResolvedWatchDogConfig {
  if (!config.projectId?.trim()) {
    throw new Error('WatchDog benoetigt eine projectId.');
  }

  return {
    ...DEFAULT_CONFIG,
    ...config,
    projectId: config.projectId,
    server: normalizeServerUrl(config.server ?? DEFAULT_CONFIG.server)
  };
}

export function getCollectUrl(server: string): string {
  return `${server.replace(/\/$/, '')}/collect`;
}

function normalizeServerUrl(server: string): string {
  return server.replace(/\/$/, '');
}
