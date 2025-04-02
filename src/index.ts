// src/index.ts (Beispiel mit TypeScript)

import { setConfig } from './config'; // Modul zum Speichern der Konfig
import { setupConsoleMonitoring } from './consoleMonitor';
import { setupNetworkMonitoring } from './networkMonitor';

export interface MonitoringConfig {
    reportUrl: string;
    // Weitere Optionen: Batch-Intervall, Filter, etc.
}

let isInitialized = false;

export function init(config: MonitoringConfig): void {
    if (isInitialized) {
        console.warn('Monitoring wurde bereits initialisiert.');
        return;
    }
    if (!config || !config.reportUrl) {
        console.error('Konfiguration mit reportUrl ist erforderlich.');
        return;
    }

    setConfig(config); // Speichere die Konfiguration zentral
    setupNetworkMonitoring();
    setupConsoleMonitoring();
    isInitialized = true;
    console.log('Netzwerk- und Konsolen-Überwachung gestartet.');
}