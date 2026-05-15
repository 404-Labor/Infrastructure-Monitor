import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { nanoid } from 'nanoid';
import { runSetupWizard } from './wizard/setup.js';

export type IpAnonymizationMode = 'full' | 'truncate' | 'hash';

export interface ServerProjectConfig {
  id: string;
  token: string;
  name: string;
}

export interface ServerConfig {
  maxStorageBytes: number;
  database: {
    type: 'sqlite';
    path: string;
  };
  defaultSendInterval: number;
  admin: {
    username: string;
    passwordHash: string;
  };
  projects: ServerProjectConfig[];
  https: {
    mode: 'none' | 'lets-encrypt' | 'manual';
    domain?: string;
  };
  ipAnonymization: IpAnonymizationMode;
  webhookUrl?: string;
  corsOrigins: string[];
}

export function getConfigPath(): string {
  return resolve(process.cwd(), process.env.WATCHDOG_CONFIG_PATH ?? 'data/config.json');
}

export async function loadOrCreateConfig(): Promise<ServerConfig> {
  const configPath = getConfigPath();
  if (existsSync(configPath)) {
    return readConfig(configPath);
  }

  if (process.env.WATCHDOG_SKIP_SETUP === 'true') {
    return createDefaultConfig();
  }

  if (process.stdout.isTTY && process.stdin.isTTY && process.env.WATCHDOG_SETUP_MODE !== 'auto') {
    return runSetupWizard(configPath);
  }

  const config = createDefaultConfig();
  writeConfig(configPath, config);
  return config;
}

export function readConfig(configPath = getConfigPath()): ServerConfig {
  return JSON.parse(readFileSync(configPath, 'utf8')) as ServerConfig;
}

export function writeConfig(configPath: string, config: ServerConfig): void {
  const directory = dirname(configPath);
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }

  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

export function createDefaultConfig(): ServerConfig {
  return {
    maxStorageBytes: parseStorageSize(process.env.WATCHDOG_MAX_STORAGE ?? '5GB'),
    database: {
      type: 'sqlite',
      path: process.env.WATCHDOG_DB_PATH ?? 'data/watchdog.sqlite'
    },
    defaultSendInterval: Number(process.env.WATCHDOG_DEFAULT_SEND_INTERVAL ?? 30_000),
    admin: {
      username: process.env.WATCHDOG_ADMIN_USER ?? 'admin',
      passwordHash: process.env.WATCHDOG_ADMIN_PASSWORD_HASH ?? ''
    },
    projects: [
      {
        id: 'default',
        token: process.env.WATCHDOG_DEFAULT_PROJECT_TOKEN ?? 'dev-project-token',
        name: process.env.WATCHDOG_DEFAULT_PROJECT_NAME ?? 'Default Project'
      }
    ],
    https: {
      mode: 'none'
    },
    ipAnonymization: (process.env.WATCHDOG_IP_ANONYMIZATION as IpAnonymizationMode | undefined) ?? 'hash',
    webhookUrl: process.env.WATCHDOG_WEBHOOK_URL,
    corsOrigins: parseCorsOrigins(process.env.WATCHDOG_CORS_ORIGINS)
  };
}

export function generateLiveToken(): string {
  return `wd_live_${nanoid(16)}`;
}

export function parseStorageSize(value: string): number {
  const match = /^(\d+(?:\.\d+)?)\s*(mb|gb)?$/i.exec(value.trim());
  if (!match) {
    throw new Error(`Ungueltige Speicherangabe: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = (match[2] ?? 'mb').toLowerCase();
  return Math.round(amount * (unit === 'gb' ? 1024 ** 3 : 1024 ** 2));
}

function parseCorsOrigins(value: string | undefined): string[] {
  if (!value || value === '*') {
    return ['*'];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
