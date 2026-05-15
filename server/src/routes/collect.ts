import { createHash } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const eventSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['error', 'console', 'network', 'performance']),
  category: z.string().min(1),
  severity: z.enum(['debug', 'info', 'warning', 'error', 'critical']),
  message: z.string(),
  timestamp: z.string(),
  url: z.string(),
  stackTrace: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

const payloadSchema = z.object({
  projectId: z.string().min(1),
  sentAt: z.string(),
  context: z.object({
    clientId: z.string().min(1),
    url: z.string(),
    referrer: z.string(),
    userAgent: z.string(),
    browser: z.string(),
    browserVersion: z.string(),
    os: z.string(),
    osVersion: z.string(),
    deviceType: z.string(),
    viewport: z.object({
      width: z.number(),
      height: z.number()
    }),
    screen: z.object({
      width: z.number(),
      height: z.number(),
      colorDepth: z.number()
    }),
    connectionType: z.string().optional(),
    language: z.string(),
    timezone: z.string()
  }),
  events: z.array(eventSchema).min(1).max(250)
});

export function registerCollectRoutes(app: FastifyInstance, database: Database.Database): void {
  app.post('/collect', async (request, reply) => {
    const parsed = payloadSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'invalid_payload',
        details: parsed.error.flatten()
      });
    }

    const payload = parsed.data;
    const project = database.prepare('SELECT id FROM projects WHERE token = ? OR id = ?').get(payload.projectId, payload.projectId) as
      | { id: string }
      | undefined;

    if (!project) {
      return reply.status(404).send({ error: 'project_not_found' });
    }

    const now = new Date().toISOString();
    const sessionId = upsertSession(database, project.id, payload.context, now, request.ip);
    const insertEvent = database.prepare(
      `INSERT OR REPLACE INTO events
        (id, session_id, type, category, message, stack_trace, url, severity, metadata_json, timestamp)
       VALUES
        (@id, @sessionId, @type, @category, @message, @stackTrace, @url, @severity, @metadataJson, @timestamp)`
    );

    const insertEvents = database.transaction(() => {
      for (const event of payload.events) {
        insertEvent.run({
          id: event.id,
          sessionId,
          type: event.type,
          category: event.category,
          message: event.message,
          stackTrace: event.stackTrace ?? null,
          url: event.url,
          severity: event.severity,
          metadataJson: JSON.stringify(event.metadata ?? {}),
          timestamp: event.timestamp
        });
      }
    });

    insertEvents();

    return reply.send({
      accepted: payload.events.length,
      sessionId
    });
  });
}

type PayloadContext = z.infer<typeof payloadSchema>['context'];

function upsertSession(
  database: Database.Database,
  projectId: string,
  context: PayloadContext,
  now: string,
  ipAddress: string
): string {
  const existing = database
    .prepare(
      `SELECT id FROM sessions
       WHERE project_id = ? AND client_fingerprint_id = ?
       ORDER BY last_seen_at DESC
       LIMIT 1`
    )
    .get(projectId, context.clientId) as { id: string } | undefined;

  if (existing) {
    database.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?').run(now, existing.id);
    return existing.id;
  }

  const id = nanoid();
  database
    .prepare(
      `INSERT INTO sessions (
        id, project_id, client_fingerprint_id, ip_hash, user_agent, browser, browser_version,
        os, os_version, device_type, viewport, connection_type, language, timezone, country,
        isp, created_at, last_seen_at
      )
      VALUES (
        @id, @projectId, @clientFingerprintId, @ipHash, @userAgent, @browser, @browserVersion,
        @os, @osVersion, @deviceType, @viewport, @connectionType, @language, @timezone, @country,
        @isp, @createdAt, @lastSeenAt
      )`
    )
    .run({
      id,
      projectId,
      clientFingerprintId: context.clientId,
      ipHash: hashIp(ipAddress),
      userAgent: context.userAgent,
      browser: context.browser,
      browserVersion: context.browserVersion,
      os: context.os,
      osVersion: context.osVersion,
      deviceType: context.deviceType,
      viewport: `${context.viewport.width}x${context.viewport.height}`,
      connectionType: context.connectionType ?? null,
      language: context.language,
      timezone: context.timezone,
      country: null,
      isp: null,
      createdAt: now,
      lastSeenAt: now
    });

  return id;
}

function hashIp(ipAddress: string): string {
  return createHash('sha256').update(ipAddress).digest('hex');
}
