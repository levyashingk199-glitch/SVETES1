import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { connectDB, closeDB, dbReady } from './config/db.js';
import { initSocket } from './sockets/index.js';
import { startKeepAlive } from './services/keepAlive.js';
import routes from './routes/index.js';
import errorHandler from './middleware/error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, '../../frontend/dist');

const app = express();
const PORT = process.env.PORT || 4000;

// За прокси (Render, nginx, Docker) нужен реальный IP клиента — иначе rate-limit ломается
app.set('trust proxy', 1);

// Разрешаем запросы с любых доменов (API публичный, авторизация по Bearer-токену в заголовке),
// чтобы у всех пользователей на любом домене/зеркале/браузере сайт работал одинаково.
const server = http.createServer(app);
// Таймауты выше, чем у балансировщиков (Render ~ 60с) — иначе будут обрывы keep-alive соединений
server.keepAliveTimeout = 65 * 1000;
server.headersTimeout = 66 * 1000;

const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});
initSocket(io);
app.set('io', io);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50kb' }));

// Раздача статики фронтенда (если фронтенд собран в frontend/dist для единого сервиса)
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
}

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

// Корневой адрес: если есть собранный фронтенд — отдаем index.html, иначе JSON-статус
app.get('/', (req, res, next) => {
  if (fs.existsSync(frontendDist)) {
    return res.sendFile(path.join(frontendDist, 'index.html'));
  }
  res.status(200).json({
    name: 'WarnTech API',
    status: 'online',
    health: '/api/health',
    outages: '/api/outages',
    database: dbReady() ? 'Connected' : 'Connecting',
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

// SPA fallback для роутов фронтенда (если фронтенд раздаётся бэкендом)
if (fs.existsSync(frontendDist)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use(errorHandler);

// ── Запуск: порт открываем сразу, БД подключается в фоне с ретраями ──────────
server.listen(PORT, () => {
  console.log(`WarnTech API running on port ${PORT}`);
  console.log(`API health: http://localhost:${PORT}/api/health`);
  startKeepAlive();
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
