// shared/constants.js
// SHARED - PR required from everyone before modifying

const ROLES = {
  STUDENT: 'student',
  WARDEN: 'warden',
  PROCTOR: 'proctor',
  FLOOR_ADMIN: 'floor_admin',
  GUARD: 'guard',
  SECURITY_INCHARGE: 'security_incharge',
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

const LATE_RETURN_STATUS = {
  NOT_APPLICABLE: 'not_applicable',
  PENDING_STUDENT: 'pending_student',
  SUBMITTED: 'submitted',
  REVIEWED: 'reviewed',
  EXPIRED: 'expired',
};

const LATE_RETURN_DECISION = {
  PENDING: 'pending',
  CLEAR: 'clear',
  MEET_WARDEN: 'meet_warden',
  CALL_STUDENT: 'call_student',
};

const LATE_RETURN_CALL_STATUS = {
  NOT_REQUIRED: 'not_required',
  PENDING: 'pending',
  RINGING: 'ringing',
  COMPLETED: 'completed',
  NOT_PICKED: 'not_picked',
  DECLINED: 'declined',
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

const COMMUNITY_CATEGORIES = {
  GENERAL: 'General',
  LOST_FOUND: 'Lost & Found',
  BOOK_EXCHANGE: 'Book Exchange',
  EVENTS: 'Events',
  QUESTIONS: 'Questions',
  MEMES: 'Memes',
  RANT: 'Rant',
  HOSTEL_FEEDBACK: 'Hostel Feedback',
};

const COMMUNITY_POST_STATUS = {
  ACTIVE: 'active',
  HIDDEN: 'hidden',
  REMOVED: 'removed',
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
  GATEPASS_LATE_RETURN_UPDATED: 'gatepass:late_return_updated',
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
  // Community
  COMMUNITY_NEW_POST: 'community:new_post',
  COMMUNITY_POST_FLAGGED: 'community:post_flagged',
  // Portal calling
  PORTAL_CALL_INCOMING: 'portal_call:incoming',
  PORTAL_CALL_ACCEPTED: 'portal_call:accepted',
  PORTAL_CALL_DECLINED: 'portal_call:declined',
  PORTAL_CALL_SIGNAL: 'portal_call:signal',
  PORTAL_CALL_ENDED: 'portal_call:ended',
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
  LATE_RETURN_STATUS,
  LATE_RETURN_DECISION,
  LATE_RETURN_CALL_STATUS,
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
  COMMUNITY_CATEGORIES,
  COMMUNITY_POST_STATUS,
};
