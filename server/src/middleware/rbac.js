const { ROLES } = require('../../../shared/constants');

// Allow only specific roles
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${req.user.role}`,
      });
    }
    next();
  };
};

// Shorthand role guards
const isStudent = authorize(ROLES.STUDENT);
const isWarden = authorize(ROLES.WARDEN, ROLES.HOSTEL_ADMIN);
const isFloorAdmin = authorize(ROLES.FLOOR_ADMIN, ROLES.WARDEN, ROLES.HOSTEL_ADMIN);
const isGuard = authorize(ROLES.GUARD, ROLES.SECURITY_INCHARGE, ROLES.HOSTEL_ADMIN);
const isAdmin = authorize(ROLES.HOSTEL_ADMIN);
const isMessIncharge = authorize(ROLES.MESS_INCHARGE, ROLES.HOSTEL_ADMIN);
const isStaff = authorize(
  ROLES.WARDEN,
  ROLES.FLOOR_ADMIN,
  ROLES.GUARD,
  ROLES.SECURITY_INCHARGE,
  ROLES.HOSTEL_ADMIN,
  ROLES.MESS_INCHARGE,
  ROLES.HOUSEKEEPING,
  ROLES.TECHNICIAN
);

module.exports = { authorize, isStudent, isWarden, isFloorAdmin, isGuard, isAdmin, isMessIncharge, isStaff };
