import cors from '@fastify/cors';
import Fastify from 'fastify';
import { createDatabase } from './db/sqlite.js';
import { registerApiRoutes } from './routes/api.js';
import { registerCollectRoutes } from './routes/collect.js';

export function buildServer() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info'
    }
  });

  const database = createDatabase();

  app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS']
  });

  registerCollectRoutes(app, database);
  registerApiRoutes(app, database);

  app.addHook('onClose', async () => {
    database.close();
  });

  return app;
}

async function main(): Promise<void> {
  const app = buildServer();
  const port = Number(process.env.PORT ?? 4040);
  const host = process.env.HOST ?? '0.0.0.0';

  await app.listen({ port, host });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
