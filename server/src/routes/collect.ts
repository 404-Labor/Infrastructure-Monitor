import { createHash } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import type { IpAnonymizationMode, ServerConfig } from '../config.js';

interface CollectPayload {
  projectId: string;
  sentAt: string;
  context: PayloadContext;
  events: PayloadEvent[];
}

interface PayloadContext {
  clientId: string;
  url: string;
  referrer: string;
  userAgent: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: string;
  viewport: {
    width: number;
    height: number;
  };
  screen: {
    width: number;
    height: number;
    colorDepth: number;
  };
  connectionType?: string;
  language: string;
  timezone: string;
}

interface PayloadEvent {
  id: string;
  type: 'error' | 'console' | 'network' | 'performance';
  category: string;
  severity: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: string;
  url: string;
  stackTrace?: string;
  metadata?: Record<string, unknown>;
}

const collectBodySchema = {
  type: 'object',
  required: ['projectId', 'sentAt', 'context', 'events'],
  additionalProperties: false,
  properties: {
    projectId: { type: 'string', minLength: 1 },
    sentAt: { type: 'string', minLength: 1 },
    context: {
      type: 'object',
      required: [
        'clientId',
        'url',
        'referrer',
        'userAgent',
        'browser',
        'browserVersion',
        'os',
        'osVersion',
        'deviceType',
        'viewport',
        'screen',
        'language',
        'timezone'
      ],
      additionalProperties: true,
      properties: {
        clientId: { type: 'string', minLength: 1 },
        url: { type: 'string' },
        referrer: { type: 'string' },
        userAgent: { type: 'string' },
        browser: { type: 'string' },
        browserVersion: { type: 'string' },
        os: { type: 'string' },
        osVersion: { type: 'string' },
        deviceType: { type: 'string' },
        viewport: {
          type: 'object',
          required: ['width', 'height'],
          properties: {
            width: { type: 'number' },
            height: { type: 'number' }
          }
        },
        screen: {
          type: 'object',
          required: ['width', 'height', 'colorDepth'],
          properties: {
            width: { type: 'number' },
            height: { type: 'number' },
            colorDepth: { type: 'number' }
          }
        },
        connectionType: { type: 'string' },
        language: { type: 'string' },
        timezone: { type: 'string' }
      }
    },
    events: {
      type: 'array',
      minItems: 1,
      maxItems: 250,
      items: {
        type: 'object',
        required: ['id', 'type', 'category', 'severity', 'message', 'timestamp', 'url'],
        additionalProperties: false,
        properties: {
          id: { type: 'string', minLength: 1 },
          type: { type: 'string', enum: ['error', 'console', 'network', 'performance'] },
          category: { type: 'string', minLength: 1 },
          severity: { type: 'string', enum: ['debug', 'info', 'warning', 'error', 'critical'] },
          message: { type: 'string' },
          timestamp: { type: 'string' },
          url: { type: 'string' },
          stackTrace: { type: 'string' },
          metadata: { type: 'object', additionalProperties: true }
        }
      }
    }
  }
} as const;

export function registerCollectRoutes(app: FastifyInstance, database: Database.Database, config: ServerConfig): void {
  app.post<{ Body: CollectPayload }>(
    '/collect',
    {
      schema: {
        body: collectBodySchema,
        response: {
          200: { type: 'null' }
        }
      }
    },
    async (request, reply) => {
      const payload = request.body;
      const project = database.prepare('SELECT id FROM projects WHERE token = ?').get(payload.projectId) as
        | { id: string }
        | undefined;

      if (!project) {
        return reply.status(401).send({ error: 'unknown_project_token' });
      }

      const now = new Date().toISOString();
      const sessionId = upsertSession(
        database,
        project.id,
        payload.context,
        now,
        getClientIp(request.headers, request.ip),
        config
      );
      const insertEvent = database.prepare(
        `INSERT OR REPLACE INTO events
          (id, session_id, type, category, message, stack_trace, url, severity, metadata_json, timestamp)
         VALUES
          (@id, @sessionId, @type, @category, @message, @stackTrace, @url, @severity, @metadataJson, @timestamp)`
      );

      const insertEvents = database.transaction((events: PayloadEvent[]) => {
        for (const event of events) {
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

      insertEvents(payload.events);

      return reply.status(200).send();
    }
  );
}

function upsertSession(
  database: Database.Database,
  projectId: string,
  context: PayloadContext,
  now: string,
  ipAddress: string,
  config: ServerConfig
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
      ipHash: anonymizeIp(ipAddress, config.ipAnonymization),
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

function getClientIp(headers: Record<string, string | string[] | undefined>, fallbackIp: string): string {
  const forwardedFor = headers['x-forwarded-for'];
  const firstForwardedIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  return firstForwardedIp?.split(',')[0]?.trim() || fallbackIp;
}

function anonymizeIp(ipAddress: string, mode: IpAnonymizationMode): string {
  if (mode === 'full') {
    return ipAddress;
  }

  if (mode === 'truncate') {
    return truncateIp(ipAddress);
  }

  return createHash('sha256').update(ipAddress).digest('hex');
}

function truncateIp(ipAddress: string): string {
  if (ipAddress.includes('.')) {
    const parts = ipAddress.split('.');
    return `${parts[0] ?? '0'}.${parts[1] ?? '0'}.${parts[2] ?? '0'}.0`;
  }

  const segments = ipAddress.split(':');
  return `${segments.slice(0, 4).join(':')}::`;
}
