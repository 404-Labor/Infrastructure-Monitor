// src/networkMonitor.ts (vereinfachtes Beispiel für fetch)

import { REPORT_HEADER, sendReport } from './reporter';

import { getConfig } from './config';

export function setupNetworkMonitoring(): void {
    const originalFetch = window.fetch;

    window.fetch = function (...args) {
        const request = new Request(...args);

        // Ignoriere Anfragen vom Reporter selbst
        if (request.headers.has(REPORT_HEADER) || request.url === getConfig()?.endpoint) {
            return originalFetch.apply(this, args);
        }

        const startTime = performance.now();

        return originalFetch.apply(this, args)
            .then(response => {
                const duration = performance.now() - startTime;
                if (!response.ok) {
                    // Fehlerfall (z.B. 4xx, 5xx)
                    const errorData = {
                        type: 'network',
                        level: 'error',
                        url: response.url,
                        status: response.status,
                        statusText: response.statusText,
                        method: request.method,
                        durationMs: Math.round(duration),
                        timestamp: new Date().toISOString()
                    };
                    sendReport(errorData);
                }
                // Optional: Auch erfolgreiche Anfragen loggen
                return response;
            })
            .catch(error => {
                const duration = performance.now() - startTime;
                // Netzwerkfehler (CORS, DNS, etc.)
                const errorData = {
                    type: 'network',
                    level: 'error',
                    url: request.url, // Oder args[0] wenn es ein String war
                    method: request.method,
                    durationMs: Math.round(duration),
                    error: error.message || String(error),
                    timestamp: new Date().toISOString()
                };
                sendReport(errorData);
                throw error; // Fehler weiterwerfen, damit die Anwendung ihn auch bemerkt
            });
    };

    // Ähnliche Logik für XMLHttpRequest hinzufügen (überschreiben von open und send)
    // ...
}