// shared/api-endpoints.js
// SHARED - PR required - single source of truth for all API routes
// Dev 2 and Dev 3 import from here, never hardcode endpoint strings

const BASE = '/api/v1';

const ENDPOINTS = {
  // ─── Auth ──────────────────────────────────────────────────────────────────
  AUTH: {
    LOGIN: `${BASE}/auth/login`,
    REGISTER: `${BASE}/auth/register`,
    ME: `${BASE}/auth/me`,
    LOGOUT: `${BASE}/auth/logout`,
    REFRESH: `${BASE}/auth/refresh`,
  },

  // ─── Students / Users ──────────────────────────────────────────────────────
  USERS: {
    LIST: `${BASE}/users`,
    GET: (id) => `${BASE}/users/${id}`,
    UPDATE: (id) => `${BASE}/users/${id}`,
    DELETE: (id) => `${BASE}/users/${id}`,
    PROFILE: `${BASE}/users/me/profile`,
    UPDATE_PROFILE: `${BASE}/users/me/profile`,
  },

  // ─── Rooms ─────────────────────────────────────────────────────────────────
  ROOMS: {
    LIST: `${BASE}/rooms`,
    GET: (id) => `${BASE}/rooms/${id}`,
    GRID: `${BASE}/rooms/grid`,                              // visual grid for admin
    ASSIGN: `${BASE}/rooms/assign`,                          // POST assign student to bed
    VACANCIES: `${BASE}/rooms/vacancies`,                    // vacancy summary
    SWAP_REQUEST: `${BASE}/rooms/swap`,                      // POST swap request
    SWAP_APPROVE: (id) => `${BASE}/rooms/swap/${id}/approve`,
    SWAP_REJECT: (id) => `${BASE}/rooms/swap/${id}/reject`,
    MAINTENANCE_FLAG: (id) => `${BASE}/rooms/${id}/maintenance`,
    EXPORT: `${BASE}/rooms/export`,                          // PDF/CSV export
    FLOOR_VIEW: (block, floor) => `${BASE}/rooms/grid/${block}/${floor}`,
  },

  // ─── Blocks ─────────────────────────────────────────────────────────────────
  BLOCKS: {
    LIST: `${BASE}/blocks`,
    GET: (name) => `${BASE}/blocks/${name}`,
  },

  // ─── Complaints ─────────────────────────────────────────────────────────────
  COMPLAINTS: {
    LIST: `${BASE}/complaints`,
    GET: (id) => `${BASE}/complaints/${id}`,
    CREATE: `${BASE}/complaints`,
    UPDATE: (id) => `${BASE}/complaints/${id}`,
    ASSIGN: (id) => `${BASE}/complaints/${id}/assign`,
    RESOLVE: (id) => `${BASE}/complaints/${id}/resolve`,
    RATE: (id) => `${BASE}/complaints/${id}/rate`,
    HEATMAP: `${BASE}/complaints/analytics/heatmap`,
    STATS: `${BASE}/complaints/analytics/stats`,
    AI_CLASSIFY: `${BASE}/complaints/classify`,
  },

  // ─── Gatepass ──────────────────────────────────────────────────────────────
  GATEPASS: {
    LIST: `${BASE}/gatepass`,
    GET: (id) => `${BASE}/gatepass/${id}`,
    APPLY: `${BASE}/gatepass/apply`,
    APPROVE: (id) => `${BASE}/gatepass/${id}/approve`,
    REJECT: (id) => `${BASE}/gatepass/${id}/reject`,
    SCAN_EXIT: `${BASE}/gatepass/scan/exit`,
    SCAN_ENTRY: `${BASE}/gatepass/scan/entry`,
    ACTIVE: `${BASE}/gatepass/active`,
    HISTORY: `${BASE}/gatepass/history`,
    OVERDUE: `${BASE}/gatepass/overdue`,
  },

  // ─── Attendance ─────────────────────────────────────────────────────────────
  ATTENDANCE: {
    LIST: `${BASE}/attendance`,
    MARK: `${BASE}/attendance/mark`,
    QR_GENERATE: `${BASE}/attendance/qr/generate`,
    QR_SCAN: `${BASE}/attendance/qr/scan`,
    STUDENT_HISTORY: (id) => `${BASE}/attendance/student/${id}`,
    FLOOR_VIEW: (block, floor) => `${BASE}/attendance/floor/${block}/${floor}`,
    HOSTEL_VIEW: `${BASE}/attendance/hostel`,
    ANOMALIES: `${BASE}/attendance/anomalies`,
    WIFI_SYNC: `${BASE}/attendance/wifi/sync`,
  },

  // ─── Analytics / Admin Dashboard ─────────────────────────────────────────────
  ANALYTICS: {
    OVERVIEW: `${BASE}/analytics/overview`,
    COMPLAINT_HEATMAP: `${BASE}/analytics/complaints/heatmap`,
    ATTENDANCE_TREND: `${BASE}/analytics/attendance/trend`,
    ROOM_SUMMARY: `${BASE}/analytics/rooms/summary`,
    STAFF_WORKLOAD: `${BASE}/analytics/staff/workload`,
    HEALTH_SCORE: `${BASE}/analytics/health-score`,
    MESS_CROWD: `${BASE}/analytics/mess/crowd`,
    EVENT_PARTICIPATION: `${BASE}/analytics/events/participation`,
    EXPORT_REPORT: `${BASE}/analytics/export`,
  },

  // ─── Mess & Dining ────────────────────────────────────────────────────────
  MESS: {
    MENU: `${BASE}/mess/menu`,
    MENU_WEEK: `${BASE}/mess/menu/week`,
    UPDATE_MENU: `${BASE}/mess/menu`,
    NIGHT_ORDER: `${BASE}/mess/night-order`,
    FEEDBACK: `${BASE}/mess/feedback`,
    CROWD: `${BASE}/mess/crowd`,
    FOOD_PARK_BALANCE: `${BASE}/mess/food-park/balance`,
  },

  // ─── Laundry ─────────────────────────────────────────────────────────────
  LAUNDRY: {
    SCHEDULE: `${BASE}/laundry/schedule`,
    MY_SCHEDULE: `${BASE}/laundry/schedule/me`,
    UPDATE: `${BASE}/laundry/schedule`,
    STATUS: `${BASE}/laundry/status`,
  },

  // ─── Health / SOS ─────────────────────────────────────────────────────────
  HEALTH: {
    SOS: `${BASE}/health/sos`,
    LIST: `${BASE}/health/events`,
    GET: (id) => `${BASE}/health/events/${id}`,
    RESOLVE: (id) => `${BASE}/health/events/${id}/resolve`,
    ANALYTICS: `${BASE}/health/analytics`,
  },

  // ─── Guest Management ─────────────────────────────────────────────────────
  GUESTS: {
    REQUEST: `${BASE}/guests/request`,
    LIST: `${BASE}/guests`,
    GET: (id) => `${BASE}/guests/${id}`,
    APPROVE: (id) => `${BASE}/guests/${id}/approve`,
    REJECT: (id) => `${BASE}/guests/${id}/reject`,
    SCAN_ENTRY: `${BASE}/guests/scan/entry`,
    SCAN_EXIT: `${BASE}/guests/scan/exit`,
    ACTIVE: `${BASE}/guests/active`,
    OVERSTAY: `${BASE}/guests/overstay`,
  },

  // ─── Staff ────────────────────────────────────────────────────────────────
  STAFF: {
    LIST: `${BASE}/staff`,
    GET: (id) => `${BASE}/staff/${id}`,
    WORKLOAD: `${BASE}/staff/workload`,
    DIRECTORY: `${BASE}/staff/directory`,
  },

  // ─── Events ───────────────────────────────────────────────────────────────
  EVENTS: {
    LIST: `${BASE}/events`,
    GET: (id) => `${BASE}/events/${id}`,
    CREATE: `${BASE}/events`,
    REGISTER: (id) => `${BASE}/events/${id}/register`,
    LEADERBOARD: `${BASE}/events/leaderboard`,
  },

  // ─── Announcements ────────────────────────────────────────────────────────
  ANNOUNCEMENTS: {
    LIST: `${BASE}/announcements`,
    CREATE: `${BASE}/announcements`,
    DELETE: (id) => `${BASE}/announcements/${id}`,
  },

  // ─── AI Service (Python Flask) ────────────────────────────────────────────
  AI: {
    CLASSIFY_COMPLAINT: `/ai/classify-complaint`,
    PREDICT_CROWD: `/ai/predict-crowd`,
    DETECT_ANOMALY: `/ai/detect-anomaly`,
    FACE_VERIFY: `/ai/face/verify`,
    FACE_ENROLL: `/ai/face/enroll`,
  },
};

module.exports = { ENDPOINTS, BASE };
