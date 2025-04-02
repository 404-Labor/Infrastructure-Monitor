# Infrastructure Monitor

[![npm version](https://badge.fury.io/js/infrastructure-monitor.svg)](https://badge.fury.io/js/infrastructure-monitor)
[![License: BSL](https://img.shields.io/badge/License-BSL-blue.svg)](https://opensource.org/licenses/BSL-1.0)

Eine leichte Laufzeit-Überwachungsbibliothek für Webanwendungen. Infrastructure Monitor verfolgt clientseitige Konsolenausgaben, fehlgeschlagene Netzwerkanfragen und wichtige Leistungsmetriken und sendet diese Daten an einen zentralisierten Überwachungsendpunkt.

## Features

- 🔍 **Echtzeit-Überwachung**: Verfolgt Konsolenausgaben, Fehler und Warnungen
- 🌐 **Netzwerk-Monitoring**: Erkennt fehlgeschlagene API-Anfragen
- 📊 **Leistungsmetriken**: Sammelt wichtige Performance-Daten
- 📡 **Zentrale Datensammlung**: Sendet alle Daten an einen konfigurierbaren Endpunkt
- 🔒 **Sicher**: Keine sensiblen Daten werden gesammelt
- 🚀 **Leichtgewichtig**: Minimale Auswirkungen auf die Anwendungsleistung

## Installation

```bash
npm install infrastructure-monitor
```

## Verwendung

```javascript
import { InfrastructureMonitor } from "infrastructure-monitor";

// Initialisierung
const monitor = new InfrastructureMonitor({
  endpoint: "https://your-monitoring-endpoint.com/api",
  applicationId: "your-app-id",
  // Optionale Konfiguration
  samplingRate: 0.1, // 10% der Ereignisse werden gesammelt
  maxBatchSize: 100, // Maximale Anzahl von Ereignissen pro Batch
  flushInterval: 5000, // Daten werden alle 5 Sekunden gesendet
});

// Starten der Überwachung
monitor.start();

// Beenden der Überwachung
monitor.stop();
```

## Konfiguration

| Option        | Typ    | Standard | Beschreibung                                    |
| ------------- | ------ | -------- | ----------------------------------------------- |
| endpoint      | string | -        | URL des Überwachungsendpunkts (erforderlich)    |
| applicationId | string | -        | Eindeutige ID der Anwendung (erforderlich)      |
| samplingRate  | number | 1.0      | Rate der zu sammelnden Ereignisse (0.0 - 1.0)   |
| maxBatchSize  | number | 100      | Maximale Anzahl von Ereignissen pro Batch       |
| flushInterval | number | 5000     | Intervall in Millisekunden zum Senden der Daten |

## Test-Server

Für Entwicklungs- und Testzwecke enthält dieses Paket einen einfachen Express-Server, der die Monitoring-Daten empfängt und lokal speichert.

### Server starten

```bash
# Entwicklungsmodus mit automatischem Neuladen
npm run dev:server

# Oder: Build und Start im Produktionsmodus
npm run build:server
npm run start:server
```

Der Server läuft standardmäßig auf Port 3000 und bietet folgende Endpunkte:

- `POST http://localhost:3000/api/monitoring` - Empfängt Monitoring-Daten
- `GET http://localhost:3000/api/status` - Server-Status-Check

### Gespeicherte Daten

Die empfangenen Daten werden im `data`-Verzeichnis als JSON-Dateien gespeichert. Der Dateiname enthält die Application-ID und den Zeitstempel.

Beispiel einer gespeicherten Datei:

```json
{
  "timestamp": "2024-03-02T15:30:00.000Z",
  "events": [
    {
      "type": "console",
      "level": "error",
      "message": "API-Aufruf fehlgeschlagen",
      "timestamp": "2024-03-02T15:29:59.000Z"
    }
  ]
}
```

## Datenschutz

Infrastructure Monitor sammelt nur technische Daten, die für die Überwachung und Fehlerbehebung notwendig sind. Es werden keine personenbezogenen Daten oder sensible Informationen gesammelt.

## Lizenz

Dieses Projekt ist unter der BSL (Business Source License) lizenziert. Weitere Informationen finden Sie in der [LICENSE](LICENSE)-Datei.

## Beitragen

Beiträge sind willkommen! Bitte lesen Sie unsere [Beitragsrichtlinien](CONTRIBUTING.md) für Details.

## Support

Bei Fragen oder Problemen öffnen Sie bitte ein [Issue](https://github.com/404-Labor/Infrastructure-Monitor/issues) auf GitHub.

## Autoren

- Steffen Bahrmann

## Danksagung

Danke an alle [Mitwirkenden](https://github.com/404-Labor/Infrastructure-Monitor/graphs/contributors), die zu diesem Projekt beigetragen haben.
