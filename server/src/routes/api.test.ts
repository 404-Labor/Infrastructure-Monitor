import { afterEach, describe, expect, it } from 'vitest';
import { createDefaultConfig, type ServerConfig } from '../config.js';
import { buildServer } from '../index.js';

describe('admin api routes', () => {
  const apps: Array<ReturnType<typeof buildServer>> = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it('weist API-Zugriffe ohne Admin-Authentifizierung ab', async () => {
    const app = buildServer({ config: testConfig(), logger: false });
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/api/projects' });

    expect(response.statusCode).toBe(401);
    expect(response.headers['www-authenticate']).toBe('Basic realm="WatchDog Admin"');
  });

  it('weist API-Zugriffe mit falschen Admin-Credentials ab', async () => {
    const app = buildServer({ config: testConfig(), logger: false });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/projects',
      headers: basicAuth('admin', 'wrong')
    });

    expect(response.statusCode).toBe(401);
  });

  it('faellt ohne konfigurierten Admin-Passworthash geschlossen aus', async () => {
    const app = buildServer({
      config: testConfig({ admin: { username: 'admin', passwordHash: '' } }),
      logger: false
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/projects',
      headers: basicAuth('admin', 'secret')
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: 'admin_auth_not_configured' });
  });

  it('erlaubt API-Zugriffe mit gueltigen Admin-Credentials', async () => {
    const app = buildServer({ config: testConfig(), logger: false });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/projects',
      headers: basicAuth('admin', 'secret')
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().projects).toHaveLength(1);
  });

  it('laesst Healthcheck und Collector ohne Admin-Authentifizierung offen', async () => {
    const app = buildServer({ config: testConfig(), logger: false });
    apps.push(app);

    const health = await app.inject({ method: 'GET', url: '/health' });
    const collect = await app.inject({ method: 'POST', url: '/collect', payload: payload('test-token') });

    expect(health.statusCode).toBe(200);
    expect(collect.statusCode).toBe(200);
  });
});

function testConfig(overrides: Partial<ServerConfig> = {}): ServerConfig {
  return {
    ...createDefaultConfig(),
    ...overrides,
    admin: overrides.admin ?? {
      username: 'admin',
      passwordHash: '2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b'
    },
    database: {
      type: 'sqlite',
      path: ':memory:'
    },
    projects: [
      {
        id: 'project-1',
        token: 'test-token',
        name: 'Test'
      }
    ]
  };
}

function basicAuth(username: string, password: string) {
  return {
    authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
  };
}

function payload(projectId: string) {
  return {
    projectId,
    sentAt: new Date().toISOString(),
    context: {
      clientId: 'client-1',
      url: 'https://example.test',
      referrer: '',
      userAgent: 'test-agent',
      browser: 'Chrome',
      browserVersion: '120',
      os: 'Linux',
      osVersion: '',
      deviceType: 'desktop',
      viewport: { width: 1280, height: 720 },
      screen: { width: 1280, height: 720, colorDepth: 24 },
      language: 'de-DE',
      timezone: 'Europe/Berlin'
    },
    events: [
      {
        id: 'evt-1',
        type: 'error',
        category: 'manual',
        severity: 'error',
        message: 'test',
        timestamp: new Date().toISOString(),
        url: 'https://example.test',
        metadata: {
          source: 'test'
        }
      }
    ]
  };
}
