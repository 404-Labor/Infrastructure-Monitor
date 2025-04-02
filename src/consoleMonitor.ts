// src/consoleMonitor.ts

import { sendReport } from './reporter';

const consoleMethods = ['log', 'warn', 'error', 'info', 'debug'] as const;
type ConsoleMethodName = typeof consoleMethods[number];

const originalConsole: { [key in ConsoleMethodName]: (...args: any[]) => void } = {} as any;

function formatArgs(args: any[]): string {
    // Einfache Formatierung, ggf. komplexer gestalten
    return args.map(arg => {
        try {
            if (typeof arg === 'object' && arg !== null) {
                return JSON.stringify(arg);
            }
            return String(arg);
        } catch (e) {
            return '[Unserializable Object]';
        }
    }).join(' ');
}

export function setupConsoleMonitoring(): void {
    consoleMethods.forEach(methodName => {
        originalConsole[methodName] = window.console[methodName].bind(window.console);

        window.console[methodName] = (...args: any[]) => {
            // Originale Methode aufrufen
            originalConsole[methodName](...args);

            // Report senden
            const logData = {
                type: 'console',
                level: methodName,
                message: formatArgs(args),
            };
            sendReport(logData);
        };
    });
}