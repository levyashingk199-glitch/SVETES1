import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { connectDB } from './config/db.js';
import { initSocket } from './sockets/index.js';
import routes from './routes/index.js';
import errorHandler from './middleware/error.js';
const origin = process.env.CLIENT_URL || true;
const app = express(), server = http.createServer(app), io = new Server(server, { cors: { origin } });
initSocket(io); app.set('io', io);
app.use(cors({ origin })); app.use(express.json({ limit: '50kb' }));
app.use('/api', routes);
app.use('/api', (req, res) => res.status(404).json({ message: 'Маршрут не найден' }));
app.use(errorHandler);
connectDB().then(() => server.listen(process.env.PORT || 4000, () => console.log('API on :' + (process.env.PORT || 4000))))
  .catch(e => { console.error('DB error:', e.message); process.exit(1); });
