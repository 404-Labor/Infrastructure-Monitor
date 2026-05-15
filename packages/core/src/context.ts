import { getFingerprintId } from './fingerprint';
import type { WatchDogContext } from './types';

export async function collectContext(fingerprintRotation: number): Promise<WatchDogContext> {
  const parsedUserAgent = parseUserAgent(navigator.userAgent);
  const connection = readConnection();

  return {
    clientId: await getFingerprintId(fingerprintRotation),
    url: window.location.href,
    referrer: document.referrer,
    userAgent: navigator.userAgent,
    browser: parsedUserAgent.browser,
    browserVersion: parsedUserAgent.browserVersion,
    os: parsedUserAgent.os,
    osVersion: parsedUserAgent.osVersion,
    deviceType: detectDeviceType(navigator.userAgent),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      colorDepth: window.screen.colorDepth
    },
    connectionType: connection?.effectiveType ?? connection?.type,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

function parseUserAgent(userAgent: string): Pick<WatchDogContext, 'browser' | 'browserVersion' | 'os' | 'osVersion'> {
  const browserMatchers: Array<[string, RegExp]> = [
    ['Edge', /Edg\/([\d.]+)/],
    ['Chrome', /Chrome\/([\d.]+)/],
    ['Firefox', /Firefox\/([\d.]+)/],
    ['Safari', /Version\/([\d.]+).*Safari/]
  ];

  const osMatchers: Array<[string, RegExp]> = [
    ['Windows', /Windows NT ([\d.]+)/],
    ['macOS', /Mac OS X ([\d_]+)/],
    ['Android', /Android ([\d.]+)/],
    ['iOS', /OS ([\d_]+) like Mac OS X/],
    ['Linux', /Linux/]
  ];

  const [browser, browserVersion] = matchUserAgent(userAgent, browserMatchers);
  const [os, osVersion] = matchUserAgent(userAgent, osMatchers);

  return {
    browser,
    browserVersion,
    os,
    osVersion: osVersion.replace(/_/g, '.')
  };
}

function matchUserAgent(userAgent: string, matchers: Array<[string, RegExp]>): [string, string] {
  for (const [name, regex] of matchers) {
    const match = regex.exec(userAgent);
    if (match) {
      return [name, match[1] ?? ''];
    }
  }

  return ['Unknown', ''];
}

function detectDeviceType(userAgent: string): WatchDogContext['deviceType'] {
  if (/tablet|ipad/i.test(userAgent)) {
    return 'tablet';
  }

  if (/mobile|android|iphone|ipod/i.test(userAgent)) {
    return 'mobile';
  }

  if (userAgent) {
    return 'desktop';
  }

  return 'unknown';
}

function readConnection(): { effectiveType?: string; type?: string } | undefined {
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string; type?: string };
    mozConnection?: { effectiveType?: string; type?: string };
    webkitConnection?: { effectiveType?: string; type?: string };
  };

  return nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
}
