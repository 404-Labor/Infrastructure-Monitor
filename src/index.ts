// src/index.ts (Beispiel mit TypeScript)

import { reportQueue } from './reporter';
import { setConfig } from './config';
import { setupConsoleMonitoring } from './consoleMonitor';
import { setupNetworkMonitoring } from './networkMonitor';

export interface MonitoringConfig {
    endpoint: string;
    applicationId: string;
    samplingRate?: number;
    maxBatchSize?: number;
    flushInterval?: number;
}

export class InfrastructureMonitor {
    private isInitialized = false;
    private readonly config: MonitoringConfig;

    constructor(config: MonitoringConfig) {
        this.config = {
            samplingRate: 1.0,
            maxBatchSize: 100,
            flushInterval: 5000,
            ...config
        };
    }

    public start(): void {
        if (this.isInitialized) {
            console.warn('Monitoring wurde bereits initialisiert.');
            return;
        }

        if (!this.config.endpoint || !this.config.applicationId) {
            console.error('endpoint und applicationId sind erforderlich.');
            return;
        }

        setConfig(this.config);
        setupNetworkMonitoring();
        setupConsoleMonitoring();
        reportQueue.startInterval();
        this.isInitialized = true;
        console.log('Infrastructure Monitor gestartet.');
    }

    public stop(): void {
        if (!this.isInitialized) {
            console.warn('Monitoring wurde noch nicht initialisiert.');
            return;
        }

        reportQueue.stopInterval();
        this.isInitialized = false;
        console.log('Infrastructure Monitor gestoppt.');
    }
}