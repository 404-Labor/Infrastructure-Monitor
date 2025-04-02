export interface MonitoringConfig {
    endpoint: string;
    applicationId: string;
    samplingRate?: number;
    maxBatchSize?: number;
    flushInterval?: number;
}

export class InfrastructureMonitor {
    constructor(config: MonitoringConfig);
    start(): void;
    stop(): void;
} 