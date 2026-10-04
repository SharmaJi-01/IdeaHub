const jwt = require('jsonwebtoken');
const User = require('../models/User');

function getToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

async function auth(req, res, next) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ message: 'Authentication required.' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: 'Account not found.' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

function admin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required.' });
  next();
}

function verifiedStudent(req, res, next) {
  if (req.user?.role === 'admin') return next();
  if (req.user?.verificationStatus !== 'verified') {
    return res.status(403).json({ message: 'Your student account must be verified before publishing an idea.' });
  }
  next();
}

module.exports = { auth, admin, verifiedStudent };
