import { createHash, timingSafeEqual } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import type { ServerConfig } from '../config.js';
import type { WatchDogEventRecord, WatchDogProject, WatchDogSession } from '../types.js';

export function registerApiRoutes(app: FastifyInstance, database: Database.Database, config: ServerConfig): void {
  app.addHook('onRequest', async (request, reply) => {
    if (!isApiRequest(request.url) || request.method === 'OPTIONS') {
      return;
    }

    if (!config.admin.passwordHash) {
      return reply.status(503).send({ error: 'admin_auth_not_configured' });
    }

    if (!hasValidAdminCredentials(request.headers.authorization, config)) {
      return reply
        .header('www-authenticate', 'Basic realm="WatchDog Admin"')
        .status(401)
        .send({ error: 'admin_auth_required' });
    }
  });

  app.get('/api/status', async () => ({
    status: 'online',
    service: 'watchdog-server'
  }));

  app.get('/api/projects', async () => {
    const projects = database
      .prepare(
        'SELECT id, token, name, created_at as createdAt, settings_json as settingsJson FROM projects ORDER BY created_at DESC'
      )
      .all() as WatchDogProject[];

    return { projects };
  });

  app.post('/api/projects', async (request, reply) => {
    const body = request.body as { name?: string; settings?: Record<string, unknown> } | undefined;
    const name = body?.name?.trim();
    if (!name) {
      return reply.status(400).send({ error: 'name_required' });
    }

    const project: WatchDogProject = {
      id: nanoid(),
      token: nanoid(32),
      name,
      createdAt: new Date().toISOString(),
      settingsJson: JSON.stringify(body?.settings ?? {})
    };

    database
      .prepare(
        `INSERT INTO projects (id, token, name, created_at, settings_json)
         VALUES (@id, @token, @name, @createdAt, @settingsJson)`
      )
      .run(project);

    return reply.status(201).send({ project });
  });

  app.get('/api/overview', async () => {
    const sessions = database.prepare('SELECT COUNT(*) as count FROM sessions').get() as { count: number };
    const events = database.prepare('SELECT COUNT(*) as count FROM events').get() as { count: number };
    const errors = database.prepare("SELECT COUNT(*) as count FROM events WHERE type = 'error'").get() as {
      count: number;
    };
    const networkErrors = database
      .prepare(
        "SELECT COUNT(*) as count FROM events WHERE type = 'network' AND severity IN ('warning', 'error', 'critical')"
      )
      .get() as { count: number };

    return {
      sessions: sessions.count,
      events: events.count,
      errors: errors.count,
      networkErrors: networkErrors.count
    };
  });

  app.get('/api/sessions', async (request) => {
    const query = request.query as { limit?: string; offset?: string };
    const limit = clampNumber(Number(query.limit ?? 50), 1, 200);
    const offset = Math.max(Number(query.offset ?? 0), 0);
    const sessions = database
      .prepare(
        `SELECT id, project_id as projectId, client_fingerprint_id as clientFingerprintId,
          ip_hash as ipHash, user_agent as userAgent, browser, browser_version as browserVersion,
          os, os_version as osVersion, device_type as deviceType, viewport,
          connection_type as connectionType, language, timezone, country, isp,
          created_at as createdAt, last_seen_at as lastSeenAt
         FROM sessions
         ORDER BY last_seen_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(limit, offset) as WatchDogSession[];

    return { sessions, limit, offset };
  });

  app.get('/api/sessions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = database
      .prepare(
        `SELECT id, project_id as projectId, client_fingerprint_id as clientFingerprintId,
          ip_hash as ipHash, user_agent as userAgent, browser, browser_version as browserVersion,
          os, os_version as osVersion, device_type as deviceType, viewport,
          connection_type as connectionType, language, timezone, country, isp,
          created_at as createdAt, last_seen_at as lastSeenAt
         FROM sessions
         WHERE id = ?`
      )
      .get(id) as WatchDogSession | undefined;

    if (!session) {
      return reply.status(404).send({ error: 'session_not_found' });
    }

    const events = database
      .prepare(
        `SELECT id, session_id as sessionId, type, category, message, stack_trace as stackTrace,
          url, severity, metadata_json as metadataJson, timestamp
         FROM events
         WHERE session_id = ?
         ORDER BY timestamp ASC`
      )
      .all(id) as WatchDogEventRecord[];

    return {
      session,
      events: events.map((event) => ({
        ...event,
        metadata: JSON.parse(event.metadataJson)
      }))
    };
  });

  app.get('/api/errors', async () => {
    const errors = database
      .prepare(
        `SELECT message, stack_trace as stackTrace, COUNT(*) as count, MAX(timestamp) as lastSeenAt
         FROM events
         WHERE type = 'error'
         GROUP BY message, stack_trace
         ORDER BY count DESC
         LIMIT 100`
      )
      .all();

    return { errors };
  });

  app.get('/api/vitals', async () => {
    const vitals = database
      .prepare(
        `SELECT category, metadata_json as metadataJson, timestamp
         FROM events
         WHERE type = 'performance'
         ORDER BY timestamp DESC
         LIMIT 250`
      )
      .all() as Array<{ category: string; metadataJson: string; timestamp: string }>;

    return {
      vitals: vitals.map((vital) => ({
        category: vital.category,
        timestamp: vital.timestamp,
        metadata: JSON.parse(vital.metadataJson)
      }))
    };
  });
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function isApiRequest(url: string): boolean {
  return url === '/api' || url.startsWith('/api/');
}

function hasValidAdminCredentials(authorization: string | undefined, config: ServerConfig): boolean {
  if (!authorization?.startsWith('Basic ')) {
    return false;
  }

  const credentials = Buffer.from(authorization.slice('Basic '.length), 'base64').toString('utf8');
  const separator = credentials.indexOf(':');
  if (separator === -1) {
    return false;
  }

  const username = credentials.slice(0, separator);
  const password = credentials.slice(separator + 1);
  const passwordHash = createHash('sha256').update(password).digest('hex');

  return safeEqual(username, config.admin.username) && safeEqual(passwordHash, config.admin.passwordHash);
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
