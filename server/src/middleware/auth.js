const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Staff = require('../models/Staff');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Try students first
    let user = await User.findById(decoded.id).select('-password');

    // Fallback to staff collection
    if (!user) {
      const staffMember = await Staff.findById(decoded.id).select('-password');
      if (staffMember) {
        // Normalize to match what routes expect
        staffMember.role = staffMember.sys_role || 'housekeeping';
        user = staffMember;
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    req.user = user;
    // Always trust the role embedded in the JWT (critical for staff users)
    if (decoded.role) req.user.role = decoded.role;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

module.exports = { authenticate };
