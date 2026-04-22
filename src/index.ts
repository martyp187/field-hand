import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';

const configPath = path.resolve(__dirname, '..', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const app = express();
const port = process.env.APP_PORT ? parseInt(process.env.APP_PORT, 10) : 3000;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', config: config });
});

app.listen(port, () => {
  console.log(`[server] FS25 Farm Companion starting on port ${port}`);
  console.log(`[server] NODE_ENV=${process.env.NODE_ENV}`);
  console.log(`[server] DB_PATH=${process.env.DB_PATH ?? './data/fs25companion.db'}`);
});

export default app;
