# WatchDog - Projektplanung

Interne Planungsdoku - Bahrmann Development / 404-Labor  
Stand: Mai 2026 - Version 1.0

## 1. Projektueberblick

WatchDog ist ein Open-Source-Web-Monitoring-System mit zwei Kernkomponenten:

- `@404-labor/watchdog`: schlankes Browser-SDK fuer Vanilla JS, Angular, React und Vue.
- `@404-labor/watchdog-server`: selbst hostbarer Fastify-Server mit Dashboard-Anbindung.

Der Managed-Standardserver ist `https://monitor.404-labor.de`; Self-Hosting bleibt ein First-Class-Feature.

## 2. Architektur

```text
Browser / watchdog.min.js -> HTTPS POST /collect -> WatchDog Server
                                           |
                                           v
                                      Storage/API
                                           |
                                           v
                                      Dashboard
```

Der Client sammelt Fehler-, Netzwerk- und Performance-Events, batcht sie lokal und sendet sie als JSON-Payload an den Server. Der Server validiert die Nutzdaten, speichert sie projektbezogen und stellt aggregierte Daten fuer Dashboard und Exporte bereit.

## 3. Client SDK

### Anforderungen

- Vanilla TypeScript ohne Framework-Overhead.
- Build-Target ES2019+.
- Core-Bundle-Ziel: kleiner als 12 KB gzip.
- Pflichtkonfiguration: `projectId`; `server` faellt auf `https://monitor.404-labor.de` zurueck.
- Cookie-frei; Client-ID wird aus technischen Merkmalen gehasht und rotiert.

### Event-Quellen

- JavaScript-Fehler via `window.onerror`.
- Unhandled Promise Rejections.
- `console.error` standardmaessig, `console.warn` optional.
- `fetch`- und XHR-Fehler inklusive HTTP 4xx/5xx.
- Core Web Vitals via `web-vitals`.
- Navigation Timing, Resource Timing und Long Tasks.

## 4. Server

### Technologie

- Node.js 20+.
- Fastify fuer HTTP, Schema-Validierung und Logging.
- SQLite als Standard fuer lokale und kleine Installationen.
- PostgreSQL-Adapter als naechster Ausbauschritt.
- Docker und Docker Compose fuer Self-Hosting.

### Erste API-Oberflaeche

- `POST /collect`: Ingestion vom SDK.
- `GET /api/overview`: aggregierte Kennzahlen.
- `GET /api/sessions`: Session-Liste.
- `GET /api/sessions/:id`: Session-Details mit Timeline.
- `GET /api/errors`: Fehlerliste.
- `GET /api/vitals`: Core-Web-Vitals-Uebersicht.
- `GET /api/projects`: Projekte.
- `POST /api/projects`: Projekt mit Token anlegen.

## 5. DSGVO-Leitplanken

- Keine Cookies.
- Zweckbindung auf technisches Monitoring.
- Konfigurierbare IP-Anonymisierung.
- Rotierende technische Client-ID.
- Export- und Loeschpfade ueber API/Dashboard.
- Self-Hosting als empfohlene Variante fuer sensible Kundenprojekte.

## 6. Roadmap

### Phase 1 - Foundation

- Monorepo mit pnpm Workspaces und Turborepo.
- TypeScript-Core-SDK mit Fehler-, Console- und Netzwerk-Sammlern.
- Hardware-Fingerprint-ID und Client-Kontext.
- Event-Batcher, Sender und Offline-Queue.
- Fastify-Server mit `POST /collect`.
- SQLite-Schema und Basis-REST-API.

### Phase 2 - Performance und Framework-Wrapper

- Vollstaendige Core-Web-Vitals-Integration.
- Resource Timing, Long Tasks und Navigation Timing.
- Angular-, React- und Vue-Wrapper als separate Pakete.
- PostgreSQL-Adapter und npm-Publish-Pipeline.

### Phase 3 - Dashboard v1

- Vue-3-SPA mit Router, Pinia und Chart.js.
- Auth-Flow, Uebersicht, Sessions, Fehler, Vitals und Einstellungen.
- Dashboard-Build in Server integrieren.

### Phase 4 - Alerts, Export und Launch

- Webhook- und E-Mail-Benachrichtigungen.
- CSV-/JSON-Export.
- Multi-Projekt-Management.
- Launch-Dokumentation fuer Self-Hosted und Managed Service.
