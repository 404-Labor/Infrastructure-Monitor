export interface WatchDogProject {
  id: string;
  token: string;
  name: string;
  createdAt: string;
  settingsJson: string;
}

export interface WatchDogSession {
  id: string;
  projectId: string;
  clientFingerprintId: string;
  ipHash: string | null;
  userAgent: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: string;
  viewport: string;
  connectionType: string | null;
  language: string;
  timezone: string;
  country: string | null;
  isp: string | null;
  createdAt: string;
  lastSeenAt: string;
}

export interface WatchDogEventRecord {
  id: string;
  sessionId: string;
  type: string;
  category: string;
  message: string;
  stackTrace: string | null;
  url: string;
  severity: string;
  metadataJson: string;
  timestamp: string;
}
