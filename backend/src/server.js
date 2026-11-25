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

// За прокси (Render, nginx, Docker) нужен реальный IP клиента — иначе rate-limit ломается
app.set('trust proxy', 1);

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((s) => s.trim())
  : true;

const server = http.createServer(app);
// Таймауты выше, чем у балансировщиков (Render ~ 60с) — иначе будут обрывы keep-alive соединений
server.keepAliveTimeout = 65 * 1000;
server.headersTimeout = 66 * 1000;

const io = new Server(server, { cors: { origin: allowedOrigins } });
initSocket(io);
app.set('io', io);

// Разрешаем адреса из CLIENT_URL и любые деплои на *.vercel.app (в т.ч. preview)
const corsOrigin = (origin, cb) => {
  if (!origin || allowedOrigins === true) return cb(null, true);
  if (allowedOrigins.includes(origin) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return cb(null, true);
  return cb(null, false);
};
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '50kb' }));

// Health: всегда 200, пока жив процесс (иначе хостинг будет перезапускать сервис,
// пока БД переподключается). Реальное состояние БД — в поле database.
app.get(['/api/health', '/health'], (req, res) => {
  res.status(200).json({
    success: true,
    message: 'WarnTech API is working!',
    database: dbReady() ? 'Connected' : 'Connecting',
    uptime: Math.round(process.uptime()),
    time: new Date().toISOString(),
  });
});

// Пока БД недоступна — быстрый понятный 503 вместо зависших запросов
app.use('/api', (req, res, next) => {
  if (dbReady()) return next();
  res.set('Retry-After', '5');
  res.status(503).json({ success: false, message: 'Сервер подключается к базе данных, повторите через несколько секунд' });
});

app.use('/api', routes);

app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'Маршрут не найден' });
});

// ── Фронтенд: если собран frontend/dist — отдаём его с этого же сервера ─────
// Так сайт и API живут на одном адресе (один сервис на Render), CORS не нужен.
const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');
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

// ── Запуск: порт открываем сразу, БД подключается в фоне с ретраями ──────────
server.listen(PORT, () => {
  console.log(`WarnTech API running on port ${PORT}`);
  console.log(`API health: http://localhost:${PORT}/api/health`);
  startKeepAlive();
  startResolvedCleanup(io);
});
connectDB();

// ── Защита от падений процесса ───────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err);
  // Не выходим: один необработанный сбой не должен валить API для всех.
  // Если процесс всё же упадёт — его перезапустит PM2 / Docker / Render.
});

let shuttingDown = false;
const shutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down gracefully`);
  io.close();
  server.close(async () => {
    try { await closeDB(); } catch { /* ignore */ }
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 10000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
