// src/reporter.ts

import { getConfig } from './config';

// Flag oder Mechanismus, um eigene Anfragen zu ignorieren
export const REPORT_HEADER = 'X-Monitoring-Report';

export async function sendReport(data: any): Promise<void> {
    const config = getConfig();
    if (!config) return;

    const { reportUrl } = config;

    try {
        await fetch(reportUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                [REPORT_HEADER]: 'true', // Markiere diese Anfrage
            },
            body: JSON.stringify({
                timestamp: new Date().toISOString(),
                data: data,
                // Evtl. weitere Metadaten wie window.location.href
            }),
            keepalive: true // Wichtig, damit Anfragen auch beim Schließen der Seite noch gesendet werden können
        });
        // Kein Logging hier, um Schleifen zu vermeiden
    } catch (error) {
        // Minimales Logging im Fehlerfall, aber nicht per Reporter senden!
        console.error('Fehler beim Senden des Reports:', error);
    }
}