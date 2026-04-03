const { Server } = require('socket.io');
const { authenticate } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

let io;

const initSocketIO = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Auth middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role, block_name } = socket.user;
    console.log(`🔌 Socket connected: ${role} [${id}]`);

    // Join rooms based on role
    socket.join(`user:${id}`);
    socket.join(`role:${role}`);
    if (block_name) socket.join(`block:${block_name}`);

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${role} [${id}]`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

// Helpers to emit to specific targets
const emitToUser = (userId, event, data) => getIO().to(`user:${userId}`).emit(event, data);
const emitToRole = (role, event, data) => getIO().to(`role:${role}`).emit(event, data);
const emitToBlock = (blockName, event, data) => getIO().to(`block:${blockName}`).emit(event, data);
const emitToAll = (event, data) => getIO().emit(event, data);

module.exports = { initSocketIO, getIO, emitToUser, emitToRole, emitToBlock, emitToAll };
