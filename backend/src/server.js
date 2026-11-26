
import 'dotenv/config';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { connectDB, closeDB, dbReady } from './config/db.js';
import { initSocket } from './sockets/index.js';
import { startKeepAlive } from './services/keepAlive.js';
import { startResolvedCleanup } from './services/outages.js';
import routes from './routes/index.js';
import errorHandler from './middleware/error.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.set('trust proxy', 1);

const allowedOrigins = [
  ...(process.env.CLIENT_URL || '').split(','),
  process.env.RENDER_EXTERNAL_URL || '',
]
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

const corsOrigin = (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
    return callback(null, true);
  }

  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
    return callback(null, true);
  }

  return callback(null, false);
};

const server = http.createServer(app);

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

const io = new Server(server, {
  cors: { origin: corsOrigin }
});

initSocket(io);
app.set('io', io);

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '50kb' }));

app.get(['/api/health', '/health'], (req, res) => {
  res.status(200).json({
    success: true,
    message: 'WarnTech API is working!',
    database: dbReady() ? 'Connected' : 'Connecting',
    uptime: Math.round(process.uptime()),
    time: new Date().toISOString()
  });
});

app.use('/api', (req, res, next) => {
  if (dbReady()) return next();

  res.set('Retry-After', '5');
  res.status(503).json({
    success: false,
    message: 'Сервер подключается к базе данных, повторите через несколько секунд'
  });
});

app.use('/api', routes);

app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Маршрут не найден'
  });
});

const distDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../frontend/dist'
);

if (fs.existsSync(path.join(distDir, 'index.html'))) {
  app.use(express.static(distDir, { index: false, maxAge: '1h' }));

  app.get('*', (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(distDir, 'index.html'));
  });

  console.log(`Frontend is served from ${distDir}`);
} else {
  console.log('frontend/dist not found — serving API only');
}

app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`WarnTech API running on port ${PORT}`);
  console.log(`API health: http://localhost:${PORT}/api/health`);

  startKeepAlive();
  startResolvedCleanup(io);
});

connectDB();

process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err);
});

let shuttingDown = false;

const shutdown = (signal) => {
  if (shuttingDown) return;

  shuttingDown = true;
  console.log(`${signal} received, shutting down gracefully`);

  io.close();

  server.close(async () => {
    try {
      await closeDB();
    } catch {}

    process.exit(0);
  });

  setTimeout(() => process.exit(0), 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
