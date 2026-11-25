import { createHash } from 'node:crypto';
import enquirer from 'enquirer';
import {
  generateLiveToken,
  parseStorageSize,
  type IpAnonymizationMode,
  type ServerConfig,
  writeConfig
} from '../config.js';

interface SetupAnswers {
  maxStorage: string;
  database: 'sqlite' | 'postgres';
  defaultSendInterval: number;
  adminUsername: string;
  adminPassword: string;
  projectName: string;
  httpsMode: 'none' | 'lets-encrypt' | 'manual';
  ipAnonymization: IpAnonymizationMode;
  webhookUrl: string;
}

export async function runSetupWizard(configPath: string): Promise<ServerConfig> {
  console.log('WatchDog Server Setup');
  console.log('═══════════════════════════════════════');

  const answers = (await enquirer.prompt([
    {
      type: 'input',
      name: 'maxStorage',
      message: '[1/8] Maximaler Speicher fuer Daten',
      initial: '5GB'
    },
    {
      type: 'select',
      name: 'database',
      message: '[2/8] Datenbank',
      choices: [
        { name: 'sqlite', message: 'SQLite' },
        { name: 'postgres', message: 'PostgreSQL (spaeter konfigurieren)' }
      ],
      initial: 0
    },
    {
      type: 'numeral',
      name: 'defaultSendInterval',
      message: '[3/8] Standard-Sendeintervall der Clients in ms',
      initial: 30_000
    },
    {
      type: 'input',
      name: 'adminUsername',
      message: '[4/8] Admin-Benutzername',
      initial: 'admin'
    },
    {
      type: 'password',
      name: 'adminPassword',
      message: '[4/8] Admin-Passwort'
    },
    {
      type: 'input',
      name: 'projectName',
      message: '[5/8] Erstes Projekt',
      initial: 'Default Project'
    },
    {
      type: 'select',
      name: 'httpsMode',
      message: '[6/8] HTTPS / SSL',
      choices: [
        { name: 'none', message: 'Kein SSL' },
        { name: 'lets-encrypt', message: "Let's Encrypt" },
        { name: 'manual', message: 'Manuelles Zertifikat' }
      ],
      initial: 0
    },
    {
      type: 'select',
      name: 'ipAnonymization',
      message: '[7/8] IP-Anonymisierung',
      choices: [
        { name: 'full', message: 'Vollstaendige IP speichern' },
        { name: 'truncate', message: 'IP auf /24 bzw. /64 kuerzen' },
        { name: 'hash', message: 'IP als SHA-256 Hash speichern' }
      ],
      initial: 2
    },
    {
      type: 'input',
      name: 'webhookUrl',
      message: '[8/8] Webhook fuer Alerts (optional)',
      initial: ''
    }
  ])) as SetupAnswers;

  if (answers.database !== 'sqlite') {
    console.log('PostgreSQL wird in Phase 2 vollstaendig aktiviert; fuer Phase 1 wird SQLite verwendet.');
  }

  const projectToken = generateLiveToken();
  const config: ServerConfig = {
    maxStorageBytes: parseStorageSize(answers.maxStorage),
    database: {
      type: 'sqlite',
      path: 'data/watchdog.sqlite'
    },
    defaultSendInterval: answers.defaultSendInterval,
    admin: {
      username: answers.adminUsername,
      passwordHash: hashPassword(answers.adminPassword)
    },
    projects: [
      {
        id: 'default',
        token: projectToken,
        name: answers.projectName
      }
    ],
    https: {
      mode: answers.httpsMode
    },
    ipAnonymization: answers.ipAnonymization,
    webhookUrl: answers.webhookUrl || undefined,
    corsOrigins: ['*']
  };

  writeConfig(configPath, config);

  console.log('');
  console.log('Setup abgeschlossen.');
  console.log(`Projekt-Token: ${projectToken}`);
  console.log('Client-Integration:');
  console.log(`WatchDog.init({ projectId: '${projectToken}', server: 'http://localhost:4040' })`);

  return config;
}

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}
