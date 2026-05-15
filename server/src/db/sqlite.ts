import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import { schema } from './schema.js';

export function createDatabase(path = process.env.WATCHDOG_DB_PATH ?? 'data/watchdog.sqlite'): Database.Database {
  const resolvedPath = resolve(process.cwd(), path);
  const directory = dirname(resolvedPath);
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }

  const database = new Database(resolvedPath);
  database.pragma('journal_mode = WAL');
  database.exec(schema);
  ensureDefaultProject(database);
  return database;
}

function ensureDefaultProject(database: Database.Database): void {
  const count = database.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };
  if (count.count > 0) {
    return;
  }

  database
    .prepare(
      `INSERT INTO projects (id, token, name, created_at, settings_json)
       VALUES (@id, @token, @name, @createdAt, @settingsJson)`
    )
    .run({
      id: nanoid(),
      token: process.env.WATCHDOG_DEFAULT_PROJECT_TOKEN ?? 'dev-project-token',
      name: process.env.WATCHDOG_DEFAULT_PROJECT_NAME ?? 'Default Project',
      createdAt: new Date().toISOString(),
      settingsJson: '{}'
    });
}
