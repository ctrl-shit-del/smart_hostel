// shared/constants.js
// SHARED - PR required from everyone before modifying

const ROLES = {
  STUDENT: 'student',
  WARDEN: 'warden',
  FLOOR_ADMIN: 'floor_admin',
  GUARD: 'guard',
  HOSTEL_ADMIN: 'hostel_admin',
  MESS_INCHARGE: 'mess_incharge',
  HOUSEKEEPING: 'housekeeping',
  TECHNICIAN: 'technician',
};

const COMPLAINT_CATEGORIES = {
  ELECTRICAL: 'Electrical',
  PLUMBING: 'Plumbing',
  CIVIL: 'Civil',
  HOUSEKEEPING: 'Housekeeping',
  PEST_CONTROL: 'Pest Control',
  INTERNET: 'Internet',
  OTHER: 'Other',
};

const COMPLAINT_STATUS = {
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  ESCALATED: 'Escalated',
};

const COMPLAINT_SEVERITY = {
  URGENT: 'Urgent',
  NORMAL: 'Normal',
};

const SLA_HOURS = {
  [COMPLAINT_SEVERITY.URGENT]: 2,
  [COMPLAINT_SEVERITY.NORMAL]: 24,
};

const GATEPASS_TYPES = {
  OUTING: 'Outing',   // max 6 hrs, return by 6PM
  LEAVE: 'Leave',     // overnight with parent/guardian details
  HOSPITAL: 'Hospital',
};

const GATEPASS_STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ACTIVE: 'Active',        // after exit scan
  RETURNED: 'Returned',    // after return scan
  EXPIRED: 'Expired',
  RECALLED: 'Recalled',
};

const ATTENDANCE_METHOD = {
  WIFI: 'wifi',
  QR: 'qr',
  MANUAL: 'manual',
};

const ATTENDANCE_STATUS = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  ON_LEAVE: 'On Leave',
  ON_OUTING: 'On Outing',
};

const ROOM_TYPES = {
  BED_2_AC: '2 Bed AC',
  BED_2_NAC: '2 Bed NAC',
  BED_3_AC: '3 Bed AC',
  BED_4_AC: '4 Bed AC',
  BED_4_NAC: '4 Bed NAC',
  BED_6_NAC: '6 Bed NAC',
};

const ROOM_OCCUPANCY_STATUS = {
  VACANT: 'Vacant',
  PARTIAL: 'Partially Occupied',
  OCCUPIED: 'Occupied',
  MAINTENANCE: 'Under Maintenance',
};

const HEALTH_SEVERITY = {
  MINOR: 'Minor',
  MODERATE: 'Moderate',
  CRITICAL: 'Critical',
};

const GUEST_STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CHECKED_IN: 'Checked In',
  CHECKED_OUT: 'Checked Out',
  OVERSTAYED: 'Overstayed',
};

const BLOCKS = {
  A_BLOCK: 'A Block',
  B_BLOCK: 'B Block',
  C_BLOCK: 'C Block',
  D1_BLOCK: 'D1 Block',
  D2_BLOCK: 'D2 Block',
};

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

const SOCKET_EVENTS = {
  // Complaints
  COMPLAINT_NEW: 'complaint:new',
  COMPLAINT_UPDATED: 'complaint:updated',
  COMPLAINT_ESCALATED: 'complaint:escalated',
  // Gatepass
  GATEPASS_APPROVED: 'gatepass:approved',
  GATEPASS_REJECTED: 'gatepass:rejected',
  GATEPASS_OVERDUE: 'gatepass:overdue',
  // Attendance
  ATTENDANCE_ANOMALY: 'attendance:anomaly',
  ATTENDANCE_UPDATED: 'attendance:updated',
  // Health
  HEALTH_SOS: 'health:sos',
  HEALTH_RESOLVED: 'health:resolved',
  // Admin
  DASHBOARD_UPDATE: 'dashboard:update',
  ALERT_NEW: 'alert:new',
  // Guest
  GUEST_OVERSTAY: 'guest:overstay',
  // Security
  INTRUDER_ALERT: 'security:intruder',
  // Laundry
  LAUNDRY_ACCEPTED: 'laundry:accepted',
  LAUNDRY_READY: 'laundry:ready',
  LAUNDRY_OUT_OF_SCHEDULE: 'laundry:out_of_schedule',
};

const LAUNDRY_STATUS = {
  PROCESSING: 'Processing',
  READY: 'Ready',
  PICKED_UP: 'PickedUp',
};

module.exports = {
  ROLES,
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUS,
  COMPLAINT_SEVERITY,
  SLA_HOURS,
  GATEPASS_TYPES,
  GATEPASS_STATUS,
  ATTENDANCE_METHOD,
  ATTENDANCE_STATUS,
  ROOM_TYPES,
  ROOM_OCCUPANCY_STATUS,
  HEALTH_SEVERITY,
  GUEST_STATUS,
  BLOCKS,
  HTTP_STATUS,
  SOCKET_EVENTS,
  LAUNDRY_STATUS,
};
