# WatchDog

WatchDog ist ein Open-Source-Web-Monitoring-System von 404-Labor. Es besteht aus einem schlanken Browser-SDK und einem selbst hostbaren Fastify-Server fuer Fehler-, Netzwerk- und Performance-Monitoring.

## Pakete

| Paket                        | Beschreibung                                   |
| ---------------------------- | ---------------------------------------------- |
| `@404-labor/watchdog`        | Framework-agnostisches Browser-SDK             |
| `@404-labor/watchdog-server` | Fastify-Server mit SQLite-Storage und REST-API |

Die vollstaendige Projektplanung liegt unter [`docs/project-planning.md`](docs/project-planning.md).

## Installation

```bash
pnpm install
pnpm build
```

## SDK verwenden

```ts
import { initWatchDog } from '@404-labor/watchdog';

const watchdog = initWatchDog({
  projectId: 'dev-project-token',
  server: 'http://localhost:4040',
  trackConsole: true,
  trackNetwork: true,
  trackPerformance: true
});

watchdog.capture({
  type: 'error',
  category: 'manual',
  severity: 'error',
  message: 'Manuell erfasstes Ereignis'
});
```

## Server starten

```bash
pnpm dev:server
```

Standardwerte:

- Port: `4040`
- SQLite-Datei: `data/watchdog.sqlite`
- Default-Projekt-Token: `dev-project-token`

## API

- `POST /collect` - Event-Ingestion vom SDK.
- `GET /api/status` - Healthcheck.
- `GET /api/overview` - aggregierte Basiskennzahlen.
- `GET /api/sessions` - Session-Liste.
- `GET /api/sessions/:id` - Session-Details mit Timeline.
- `GET /api/errors` - gruppierte Fehlerliste.
- `GET /api/vitals` - zuletzt erfasste Performance-Events.
- `GET /api/projects` - Projekte auflisten.
- `POST /api/projects` - Projekt anlegen.

Alle `/api/*`-Endpunkte enthalten administrative oder personenbezogene Daten und
erfordern HTTP Basic Auth mit dem in der Server-Config hinterlegten
Admin-Benutzer und Passwort-Hash. Ohne konfiguriertes Admin-Passwort verweigert
der Server diese Endpunkte.

## Datenschutz

WatchDog setzt keine Cookies. Die technische Client-ID wird lokal aus Browser-/Hardware-Merkmalen gehasht und standardmaessig alle 30 Tage rotiert. IP-Adressen werden serverseitig gehasht gespeichert.

## Lizenz

MIT - siehe [LICENSE](LICENSE).
