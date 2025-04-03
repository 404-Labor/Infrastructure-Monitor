import { existsSync, mkdirSync, writeFileSync } from 'fs';

import cors from 'cors';
import express from 'express';
import { join } from 'path';

const app = express();
const port = process.env.PORT || 4040;

// Stelle sicher, dass der data Ordner existiert
const dataDir = join(process.cwd(), 'data');
if (!existsSync(dataDir)) {
    mkdirSync(dataDir);
}

app.use(cors());
app.use(express.json());

app.post('/api/monitoring', (req, res) => {
    const { timestamp, events } = req.body;
    const applicationId = req.headers['x-application-id'];

    if (!applicationId || !Array.isArray(events)) {
        return res.status(400).json({ error: 'Ungültige Anfrage' });
    }

    // Erstelle einen Dateinamen basierend auf Timestamp und Application ID
    const fileName = `${applicationId}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filePath = join(dataDir, fileName);

    try {
        writeFileSync(filePath, JSON.stringify({ timestamp, events }, null, 2));
        console.log(`Ereignisse gespeichert in: ${fileName}`);
        res.json({ success: true, fileName });
    } catch (error) {
        console.error('Fehler beim Speichern:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

app.get('/api/status', (req, res) => {
    res.json({ status: 'online' });
});

app.listen(port, () => {
    console.log(`Monitoring-Server läuft auf Port ${port}`);
}); 