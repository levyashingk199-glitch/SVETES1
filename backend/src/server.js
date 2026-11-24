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

// CORS: в dev CLIENT_URL=http://localhost:5173, в prod — URL фронтенда на Render
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(s => s.trim())
  : true;   // true = разрешить всё (только для локальной разработки без .env)

// HTTP server
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: { origin }
});

initSocket(io);
app.set('io', io);

// Middlewares
app.use(cors({ origin }));
app.use(express.json({ limit: '50kb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'WarnTech API is working!',
    database: 'Connected'
  });
});

// Main API routes
app.use('/api', routes);

// 404 handler
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Маршрут не найден'
  });
});

// Error handler
app.use(errorHandler);

// Connect to DB, then start server
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 WarnTech API running on port ${PORT}`);
      console.log(`🌐 http://localhost:${PORT}`);
      console.log(`✅ API health: http://localhost:${PORT}/api/health`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
