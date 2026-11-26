
import fs from 'fs';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

let mem;
let connecting = false;
let closing = false;

const ensureDefaultAdmin = async () => {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '');

  if (!email || !password) {
    console.warn('ADMIN_EMAIL or ADMIN_PASSWORD is not configured; initial admin was not created');
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12) {
    console.warn('Initial admin credentials are invalid; use a valid email and a password of at least 12 characters');
    return;
  }

  try {
    const User = mongoose.models.User;
    if (!User) return;

    const existingAdmin = await User.findOne({ role: 'admin' }).select('+password');

    if (!existingAdmin) {
      await User.create({
        name: 'Администратор',
        email,
        password: await bcrypt.hash(password, 12),
        role: 'admin',
      });
      console.log(`Initial administrator created: ${email}`);
    } else if (existingAdmin.email === email && !(await bcrypt.compare(password, existingAdmin.password))) {
      existingAdmin.password = await bcrypt.hash(password, 12);
      await existingAdmin.save();
      console.log('Initial administrator password synchronized from environment');
    }
  } catch (error) {
    console.warn('Initial admin check skipped:', error.message);
  }
};

export const dbReady = () => mongoose.connection.readyState === 1;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const resolveUri = async () => {
  let uri = process.env.MONGO_URI;

  if (uri) return uri;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('MONGO_URI is required in production');
  }

  if (!mem) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');

    fs.mkdirSync('./data/db', { recursive: true });

    mem = await MongoMemoryServer.create({
      instance: {
        dbPath: './data/db',
        storageEngine: 'wiredTiger',
      },
    });

    console.log('Embedded MongoDB started (data in ./data/db)');
  }

  return mem.getUri('netsveta');
};

export const connectDB = async () => {
  if (connecting || dbReady() || closing) return;

  connecting = true;
  let attempt = 0;

  try {
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
        if (closing) break;

        attempt += 1;

        const delay = Math.min(
          2000 * 2 ** Math.min(attempt, 4),
          30000
        );

        console.error(
          `MongoDB connect failed (attempt ${attempt}): ${err.message}. Retry in ${delay / 1000}s`
        );

        await sleep(delay);
      }
    }
  } finally {
    connecting = false;
  }
};

mongoose.connection.on('disconnected', () => {
  if (closing) return;

  console.warn('MongoDB disconnected');

  setTimeout(() => {
    if (!dbReady() && !closing) connectDB();
  }, 5000);
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

mongoose.connection.on('error', (e) => {
  console.error('MongoDB error:', e.message);
});

export const closeDB = async () => {
  closing = true;

  await mongoose.disconnect();

  if (mem) {
    await mem.stop();
    mem = null;
  }
};
