import { getCollectUrl } from '../config';
import type { ResolvedWatchDogConfig, WatchDogPayload } from '../types';

export const WATCHDOG_REPORT_HEADER = 'X-WatchDog-Report';

export async function sendPayload(config: ResolvedWatchDogConfig, payload: WatchDogPayload): Promise<void> {
  const response = await fetch(getCollectUrl(config.server), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [WATCHDOG_REPORT_HEADER]: 'true',
      'X-Project-Id': config.projectId
    },
    body: JSON.stringify(payload),
    keepalive: true
  });

  if (!response.ok) {
    throw new Error(`WatchDog collect failed with status ${response.status}`);
  }
}

export function sendPayloadBeacon(config: ResolvedWatchDogConfig, payload: WatchDogPayload): boolean {
  if (!navigator.sendBeacon) {
    return false;
  }

  const body = JSON.stringify(payload);
  const blob = new Blob([body], { type: 'application/json' });
  return navigator.sendBeacon(getCollectUrl(config.server), blob);
}
