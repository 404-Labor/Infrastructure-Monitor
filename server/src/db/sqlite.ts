import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import type { ServerConfig } from '../config.js';

export function createDatabase(config: ServerConfig): Database.Database {
  const resolvedPath = resolve(process.cwd(), config.database.path);
  const directory = dirname(resolvedPath);
  if (config.database.path !== ':memory:' && !existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }

  const database = new Database(config.database.path === ':memory:' ? ':memory:' : resolvedPath);
  database.pragma('foreign_keys = ON');
  database.pragma('journal_mode = WAL');
  runMigrations(database);
  ensureConfiguredProjects(database, config);
  return database;
}

export function runMigrations(database: Database.Database): void {
  database.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
  const applied = new Set(
    (database.prepare('SELECT version FROM schema_migrations').all() as Array<{ version: number }>).map(
      (row) => row.version
    )
  );

  const migrationsDir = fileURLToPath(new URL('./migrations', import.meta.url));
  const migrationFiles = readdirSync(migrationsDir)
    .filter((file) => /^\d+_.*\.sql$/.test(file))
    .sort();

  for (const file of migrationFiles) {
    const version = Number(file.split('_')[0]);
    if (applied.has(version)) {
      continue;
    }

    const sql = readFileSync(resolve(migrationsDir, file), 'utf8');
    const migrate = database.transaction(() => {
      database.exec(sql);
      database
        .prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)')
        .run(version, new Date().toISOString());
    });
    migrate();
  }
}

export function ensureConfiguredProjects(database: Database.Database, config: ServerConfig): void {
  const insert = database.prepare(
    `INSERT OR IGNORE INTO projects (id, token, name, created_at, settings_json)
       VALUES (@id, @token, @name, @createdAt, @settingsJson)`
  );

  const createdAt = new Date().toISOString();
  for (const project of config.projects) {
    insert.run({
      id: project.id,
      token: project.token,
      name: project.name,
      createdAt,
      settingsJson: '{}'
    });
  }
}

export function enforceStorageLimit(database: Database.Database, config: ServerConfig): number {
  if (config.database.path === ':memory:') {
    return 0;
  }

  const resolvedPath = resolve(process.cwd(), config.database.path);
  if (!existsSync(resolvedPath) || statSync(resolvedPath).size <= config.maxStorageBytes) {
    return 0;
  }

  let deletedSessions = 0;
  const deleteOldest = database.transaction(() => {
    while (existsSync(resolvedPath) && statSync(resolvedPath).size > config.maxStorageBytes) {
      const oldest = database.prepare('SELECT id FROM sessions ORDER BY last_seen_at ASC LIMIT 1').get() as
        | { id: string }
        | undefined;
      if (!oldest) {
        break;
      }

      database.prepare('DELETE FROM sessions WHERE id = ?').run(oldest.id);
      deletedSessions += 1;
      database.pragma('wal_checkpoint(TRUNCATE)');
    }
  });

  deleteOldest();
  return deletedSessions;
}
