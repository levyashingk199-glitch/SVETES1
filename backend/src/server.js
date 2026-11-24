
import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { connectDB } from './config/db.js';
import { initSocket } from './sockets/index.js';
import routes from './routes/index.js';
import errorHandler from './middleware/error.js';

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(s => s.trim())
  : true;

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: allowedOrigins }
});

initSocket(io);
app.set('io', io);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '50kb' }));

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'WarnTech API is working!',
    database: 'Connected'
  });
});

app.use('/api', routes);

app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Маршрут не найден'
  });
});

app.use(errorHandler);

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`WarnTech API running on port ${PORT}`);
      console.log(`http://localhost:${PORT}`);
      console.log(`API health: http://localhost:${PORT}/api/health`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
