// src/config.ts

import { MonitoringConfig } from './index';

let currentConfig: MonitoringConfig | null = null;

export function setConfig(config: MonitoringConfig): void {
    currentConfig = config;
}

export function getConfig(): MonitoringConfig | null {
    return currentConfig;
}