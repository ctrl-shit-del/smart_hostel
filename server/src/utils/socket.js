const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { SOCKET_EVENTS } = require('../../../shared/constants');

let io;
const portalCallSessions = new Map();

const initSocketIO = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (_err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role, block_name: blockName } = socket.user;
    console.log(`Socket connected: ${role} [${id}]`);

    socket.join(`user:${id}`);
    socket.join(`role:${role}`);
    if (blockName) socket.join(`block:${blockName}`);

    socket.on(SOCKET_EVENTS.PORTAL_CALL_INCOMING, (payload = {}) => {
      const { sessionId, toUserId, gatepassId, callerName, callerRole } = payload;
      if (!sessionId || !toUserId || !gatepassId) return;

      portalCallSessions.set(sessionId, {
        sessionId,
        gatepassId,
        callerId: `${id}`,
        calleeId: `${toUserId}`,
        status: 'ringing',
        createdAt: new Date().toISOString(),
      });

      getIO().to(`user:${toUserId}`).emit(SOCKET_EVENTS.PORTAL_CALL_INCOMING, {
        sessionId,
        gatepassId,
        fromUserId: `${id}`,
        fromRole: callerRole || role,
        fromName: callerName || 'Warden',
      });
    });

    socket.on(SOCKET_EVENTS.PORTAL_CALL_ACCEPTED, (payload = {}) => {
      const session = portalCallSessions.get(payload.sessionId);
      if (!session) return;

      session.status = 'connected';
      getIO().to(`user:${session.callerId}`).emit(SOCKET_EVENTS.PORTAL_CALL_ACCEPTED, {
        sessionId: session.sessionId,
        gatepassId: session.gatepassId,
        fromUserId: `${id}`,
      });
    });

    socket.on(SOCKET_EVENTS.PORTAL_CALL_DECLINED, (payload = {}) => {
      const session = portalCallSessions.get(payload.sessionId);
      if (!session) return;

      session.status = 'declined';
      getIO().to(`user:${session.callerId}`).emit(SOCKET_EVENTS.PORTAL_CALL_DECLINED, {
        sessionId: session.sessionId,
        gatepassId: session.gatepassId,
        fromUserId: `${id}`,
        reason: payload.reason || 'declined',
      });
      portalCallSessions.delete(payload.sessionId);
    });

    socket.on(SOCKET_EVENTS.PORTAL_CALL_SIGNAL, (payload = {}) => {
      const session = portalCallSessions.get(payload.sessionId);
      if (!session || !payload.toUserId) return;

      const isParticipant = [`${session.callerId}`, `${session.calleeId}`].includes(`${id}`);
      if (!isParticipant) return;

      getIO().to(`user:${payload.toUserId}`).emit(SOCKET_EVENTS.PORTAL_CALL_SIGNAL, {
        sessionId: session.sessionId,
        fromUserId: `${id}`,
        description: payload.description,
        candidate: payload.candidate,
      });
    });

    socket.on(SOCKET_EVENTS.PORTAL_CALL_ENDED, (payload = {}) => {
      const session = portalCallSessions.get(payload.sessionId);
      if (!session) return;

      const otherUserId = `${session.callerId}` === `${id}` ? session.calleeId : session.callerId;
      getIO().to(`user:${otherUserId}`).emit(SOCKET_EVENTS.PORTAL_CALL_ENDED, {
        sessionId: session.sessionId,
        gatepassId: session.gatepassId,
        reason: payload.reason || 'ended',
      });
      portalCallSessions.delete(payload.sessionId);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${role} [${id}]`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

const emitToUser = (userId, event, data) => getIO().to(`user:${userId}`).emit(event, data);
const emitToRole = (role, event, data) => getIO().to(`role:${role}`).emit(event, data);
const emitToBlock = (blockName, event, data) => getIO().to(`block:${blockName}`).emit(event, data);
const emitToAll = (event, data) => getIO().emit(event, data);

module.exports = { initSocketIO, getIO, emitToUser, emitToRole, emitToBlock, emitToAll };
