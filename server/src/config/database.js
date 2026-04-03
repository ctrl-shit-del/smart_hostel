const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/hostel_db';
    const conn = await mongoose.connect(uri, {
      dbName: 'hostel_db',
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    if (err.message.includes('ECONNREFUSED') || err.message.includes('timeout') || err.message.includes('ENOTFOUND')) {
      console.log('🔄 Primary MongoDB unreachable. Trying local MongoDB, then in-memory fallback...');

      try {
        const localConn = await mongoose.connect('mongodb://127.0.0.1:27017/hostel_db', {
          dbName: 'hostel_db',
        });
        console.log(`✅ Local MongoDB connected: ${localConn.connection.host}`);
        return localConn;
      } catch (_localErr) {
        console.log('ℹ️ Local MongoDB unavailable. Falling back to in-memory MongoDB...');
      }

      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create({
        instance: {
          ip: '127.0.0.1',
        },
      });
      const memUri = mongoServer.getUri();
      const conn = await mongoose.connect(memUri, { dbName: 'hostel_db' });
      
      console.log('🌱 Seeding fallback database with your requested credentials...');
      const { exec } = require('child_process');
      const path = require('path');
      const scriptPath = path.join(__dirname, '..', '..', '..', 'scripts', 'seed', 'seed_users.js');
      exec(`node "${scriptPath}"`, { env: { ...process.env, MONGO_URI: memUri } });
      return conn;
    }
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
