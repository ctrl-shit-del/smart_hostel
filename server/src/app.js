const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const roomRoutes = require('./routes/rooms');
const blockRoutes = require('./routes/blocks');
const complaintRoutes = require('./routes/complaints');
const gatepassRoutes = require('./routes/gatepass');
const attendanceRoutes = require('./routes/attendance');
const analyticsRoutes = require('./routes/analytics');
const messRoutes = require('./routes/mess');
const laundryRoutes = require('./routes/laundry');
const healthRoutes = require('./routes/health');
const guestRoutes = require('./routes/guests');
const staffRoutes = require('./routes/staff');
const eventRoutes = require('./routes/events');
const announcementRoutes = require('./routes/announcements');
const communityRoutes = require('./routes/community');
const chatbotRoutes = require('./routes/chatbot');
const { errorHandler } = require('./middleware/errorHandler');


const app = express();

// ─── Security & Middleware ───────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'SmartHostel AI', timestamp: new Date().toISOString() });
});

// ─── API Routes ──────────────────────────────────────────────────────────────
const API = '/api/v1';
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/rooms`, roomRoutes);
app.use(`${API}/blocks`, blockRoutes);
app.use(`${API}/complaints`, complaintRoutes);
app.use(`${API}/gatepass`, gatepassRoutes);
app.use(`${API}/attendance`, attendanceRoutes);
app.use(`${API}/analytics`, analyticsRoutes);
app.use(`${API}/mess`, messRoutes);
app.use(`${API}/laundry`, laundryRoutes);
app.use(`${API}/health`, healthRoutes);
app.use(`${API}/guests`, guestRoutes);
app.use(`${API}/staff`, staffRoutes);
app.use(`${API}/events`, eventRoutes);
app.use(`${API}/announcements`, announcementRoutes);
app.use(`${API}/community`, communityRoutes);
app.use(`${API}/chatbot`, chatbotRoutes);

// ─── 404 ────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Error Handler ───────────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
// Re-trigger
