import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { createDefaultConfig, type ServerConfig } from '../config.js';
import { buildServer } from '../index.js';

describe('api routes', () => {
  const apps: Array<ReturnType<typeof buildServer>> = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it('laesst Status oeffentlich, schuetzt aber Admin-Daten', async () => {
    const app = buildServer({ config: testConfig(), logger: false });
    apps.push(app);

    const status = await app.inject({ method: 'GET', url: '/api/status' });
    expect(status.statusCode).toBe(200);

    const anonymous = await app.inject({ method: 'GET', url: '/api/projects' });
    expect(anonymous.statusCode).toBe(401);
    expect(anonymous.headers['www-authenticate']).toBe('Basic realm="WatchDog API"');

    const wrongPassword = await app.inject({
      method: 'GET',
      url: '/api/projects',
      headers: basicAuth('admin', 'wrong')
    });
    expect(wrongPassword.statusCode).toBe(401);

    const authorized = await app.inject({
      method: 'GET',
      url: '/api/projects',
      headers: basicAuth('admin', 'secret')
    });
    expect(authorized.statusCode).toBe(200);
    expect(authorized.json().projects[0].token).toBe('test-token');
  });

  it('erlaubt Projektanlage nur authentifizierten Admins', async () => {
    const app = buildServer({ config: testConfig(), logger: false });
    apps.push(app);

    const anonymous = await app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: { name: 'Production' }
    });
    expect(anonymous.statusCode).toBe(401);

    const authorized = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: basicAuth('admin', 'secret'),
      payload: { name: 'Production' }
    });
    expect(authorized.statusCode).toBe(201);
    expect(authorized.json().project.name).toBe('Production');
  });
});

function testConfig(overrides: Partial<ServerConfig> = {}): ServerConfig {
  return {
    ...createDefaultConfig(),
    ...overrides,
    database: {
      type: 'sqlite',
      path: ':memory:'
    },
    admin: {
      username: 'admin',
      passwordHash: hashPassword('secret')
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

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}
