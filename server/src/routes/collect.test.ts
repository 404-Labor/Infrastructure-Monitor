import { afterEach, describe, expect, it } from 'vitest';
import { buildServer } from '../index.js';
import { createDefaultConfig, type ServerConfig } from '../config.js';

describe('collect route', () => {
  const apps: Array<ReturnType<typeof buildServer>> = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it('antwortet auf /health mit 200', async () => {
    const app = buildServer({ config: testConfig(), logger: false });
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
  });

  it('weist ungueltige Payloads mit 400 ab', async () => {
    const app = buildServer({ config: testConfig(), logger: false });
    apps.push(app);

    const response = await app.inject({ method: 'POST', url: '/collect', payload: { nope: true } });

    expect(response.statusCode).toBe(400);
  });

  it('weist unbekannte Projekt-Tokens mit 401 ab', async () => {
    const app = buildServer({ config: testConfig(), logger: false });
    apps.push(app);

    const response = await app.inject({ method: 'POST', url: '/collect', payload: payload('unknown') });

    expect(response.statusCode).toBe(401);
  });

  it('speichert Events und liest x-forwarded-for fuer die Session-IP', async () => {
    const app = buildServer({ config: testConfig({ ipAnonymization: 'full' }), logger: false });
    apps.push(app);

    const started = performance.now();
    const response = await app.inject({
      method: 'POST',
      url: '/collect',
      headers: {
        'x-forwarded-for': '203.0.113.42, 10.0.0.1'
      },
      payload: payload('test-token')
    });
    const elapsed = performance.now() - started;

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('');
    expect(elapsed).toBeLessThan(50);

    const sessions = await app.inject({ method: 'GET', url: '/api/sessions', headers: adminHeaders() });
    expect(sessions.json().sessions[0].ipHash).toBe('203.0.113.42');
  });
});

function testConfig(overrides: Partial<ServerConfig> = {}): ServerConfig {
  return {
    ...createDefaultConfig(),
    ...overrides,
    admin: {
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

function adminHeaders() {
  return {
    authorization: `Basic ${Buffer.from('admin:secret').toString('base64')}`
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
