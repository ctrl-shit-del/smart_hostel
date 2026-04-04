const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Staff = require('../models/Staff');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user = await Student.findById(decoded.id).select('-password -face_embeddings');

    if (!user) {
      const staffMember = await Staff.findById(decoded.id).select('-password');
      if (staffMember) {
        staffMember.role = staffMember.sys_role || staffMember.role || 'housekeeping';
        user = staffMember;
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    req.user = user;
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
