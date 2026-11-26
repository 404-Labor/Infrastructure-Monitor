import cors from '@fastify/cors';
import Fastify, { type FastifyBaseLogger } from 'fastify';
import { createDefaultConfig, loadOrCreateConfig, type ServerConfig } from './config.js';
import { createDatabase, enforceStorageLimit } from './db/sqlite.js';
import { registerApiRoutes } from './routes/api.js';
import { registerCollectRoutes } from './routes/collect.js';

interface BuildServerOptions {
  config?: ServerConfig;
  logger?: boolean | FastifyBaseLogger;
}

export function buildServer(options: BuildServerOptions = {}) {
  const config = options.config ?? createDefaultConfig();
  const app = Fastify({
    logger: options.logger ?? {
      level: process.env.LOG_LEVEL ?? 'info'
    },
    trustProxy: true
  });

  const database = createDatabase(config);
  enforceStorageLimit(database, config);
  const storageTimer = setInterval(
    () => {
      enforceStorageLimit(database, config);
    },
    24 * 60 * 60 * 1_000
  );
  storageTimer.unref();

  app.register(cors, {
    origin: config.corsOrigins.includes('*') ? true : config.corsOrigins,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS']
  });

  app.get('/health', async () => ({ status: 'ok' }));

  registerCollectRoutes(app, database, config);
  registerApiRoutes(app, database, config);

  app.addHook('onClose', async () => {
    clearInterval(storageTimer);
    database.close();
  });

  return app;
}

async function main(): Promise<void> {
  const config = await loadOrCreateConfig();
  const app = buildServer({ config });
  const port = Number(process.env.PORT ?? 4040);
  const host = process.env.HOST ?? '0.0.0.0';

  await app.listen({ port, host });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
