import fs from 'fs';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

let mem;
let connecting = false;
let closing = false;

const ensureDefaultAdmin = async () => {
  try {
    const User = mongoose.models.User;
    if (!User) return;
    if (!(await User.exists({ role: 'admin' }))) {
      await User.create({
        name: 'Администратор',
        email: 'admin@netsveta.dev',
        password: await bcrypt.hash('admin123', 10),
        role: 'admin',
      });
      console.log('Default admin ensured: admin@netsveta.dev');
    }
  } catch (e) {
    console.warn('Default admin check skipped:', e.message);
  }
};

// Состояние БД для /api/health и middleware
export const dbReady = () => mongoose.connection.readyState === 1;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const resolveUri = async () => {
  let uri = process.env.MONGO_URI;
  if (uri) return uri;
  // MONGO_URI пуст -> встроенная MongoDB, данные в ./data/db
  if (!mem) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    fs.mkdirSync('./data/db', { recursive: true });
    mem = await MongoMemoryServer.create({
      instance: { dbPath: './data/db', storageEngine: 'wiredTiger' },
    });
    console.log('Embedded MongoDB started (data in ./data/db)');
  }
  return mem.getUri('netsveta');
};

/**
 * Подключается к MongoDB и НИКОГДА не завершает процесс при ошибке:
 * повторяет попытки с нарастающей паузой (2с → 30с).
 * После подключения mongoose сам переподключается при обрывах.
 */
export const connectDB = async () => {
  if (connecting || dbReady()) return;
  connecting = true;
  let attempt = 0;
  while (!closing) {
    try {
      const uri = await resolveUri();
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
      });
      console.log('MongoDB connected');
      await ensureDefaultAdmin();
      break;
    } catch (err) {
      attempt += 1;
      const delay = Math.min(2000 * 2 ** Math.min(attempt, 4), 30000);
      console.error(`MongoDB connect failed (attempt ${attempt}): ${err.message}. Retry in ${delay / 1000}s`);
      await sleep(delay);
    }
  }
  connecting = false;
};

mongoose.connection.on('disconnected', () => {
  if (closing) return;
  console.warn('MongoDB disconnected — mongoose will try to reconnect');
  // Если драйвер сдался — запускаем свой цикл переподключения
  setTimeout(() => { if (!dbReady() && !closing) connectDB(); }, 5000);
});
mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'));
mongoose.connection.on('error', (e) => console.error('MongoDB error:', e.message));

export const closeDB = async () => {
  closing = true;
  await mongoose.disconnect();
  if (mem) await mem.stop();
};
