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
    console.error('❌ MongoDB Atlas connection error:', err.message);
    console.error('Check your internet connection or IP whitelist on Atlas.');
    process.exit(1);
  }
};

module.exports = connectDB;
