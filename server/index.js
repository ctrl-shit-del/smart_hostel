require('dotenv').config();
const app = require('./src/app');
const http = require('http');
const { initSocketIO } = require('./src/utils/socket');
const connectDB = require('./src/config/database');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize Socket.io
initSocketIO(server);

// Connect to DB then start server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`\n🚀 SmartHostel AI Server running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔌 WebSocket ready\n`);
  });
});
