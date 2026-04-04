const jwt = require('jsonwebtoken');

const generateToken = (user, resolvedRole) => {
  return jwt.sign(
    {
      id: user._id,
      role: resolvedRole || user.role || 'student',
      block_name: user.block_name || null,
      register_number: user.register_number || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const generateQRToken = (payload, expiresIn = '12h') => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

const verifyQRToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateToken, generateQRToken, verifyQRToken };
