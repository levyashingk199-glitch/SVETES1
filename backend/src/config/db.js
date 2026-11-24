import fs from 'fs';
import mongoose from 'mongoose';
let mem;
// MONGO_URI set -> use that MongoDB. Empty -> embedded MongoDB, data persists in ./data/db
export const connectDB = async () => {
  let uri = process.env.MONGO_URI;
  if (!uri) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    fs.mkdirSync('./data/db', { recursive: true });
    mem = await MongoMemoryServer.create({ instance: { dbPath: './data/db', storageEngine: 'wiredTiger' } });
    uri = mem.getUri('netsveta');
    console.log('Embedded MongoDB started (data in ./data/db)');
  }
  await mongoose.connect(uri);
  console.log('MongoDB connected');
};
export const closeDB = async () => { await mongoose.disconnect(); if (mem) await mem.stop(); };
