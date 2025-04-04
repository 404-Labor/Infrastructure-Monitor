// src/reporter.ts

import { getConfig } from './config';

// Flag oder Mechanismus, um eigene Anfragen zu ignorieren
export const REPORT_HEADER = 'X-Monitoring-Report';

interface ReportData {
    type: string;
    level: string;
    [key: string]: any;
}

class ReportQueue {
    private readonly queue: ReportData[] = [];
    private timer: number | null = null;
    private intervalTimer: number | null = null;

    constructor() {
        this.processQueue = this.processQueue.bind(this);
        this.startInterval = this.startInterval.bind(this);
    }

    public startInterval(): void {
        const config = getConfig();
        if (!config) return;

        if (this.intervalTimer) {
            clearInterval(this.intervalTimer);
        }

        this.intervalTimer = window.setInterval(
            this.processQueue,
            config.flushInterval || 5000
        );
    }

    public stopInterval(): void {
        if (this.intervalTimer) {
            clearInterval(this.intervalTimer);
            this.intervalTimer = null;
        }
    }

    public add(data: ReportData): void {
        const config = getConfig();
        if (!config) return;

        // Sampling-Rate anwenden
        if (Math.random() > (config.samplingRate || 1.0)) {
            return;
        }

        this.queue.push(data);

        // Batch-Größe prüfen
        if (this.queue.length >= (config.maxBatchSize || 100)) {
            this.processQueue();
        }
    }

    private async processQueue(): Promise<void> {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        if (this.queue.length === 0) return;

        const config = getConfig();
        if (!config) return;

        const batch = this.queue.splice(0);

        try {
            await fetch(config.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [REPORT_HEADER]: 'true',
                    'X-Application-Id': config.applicationId
                },
                body: JSON.stringify({
                    timestamp: new Date().toISOString(),
                    events: batch
                }),
                keepalive: true
            });
        } catch (error) {
            console.error('Fehler beim Senden des Reports:', error);
            // Bei Fehler die Events wieder in die Queue einfügen
            this.queue.unshift(...batch);
        }
    }
}

const reportQueue = new ReportQueue();

export { reportQueue };
export function sendReport(data: ReportData): void {
    reportQueue.add(data);
}