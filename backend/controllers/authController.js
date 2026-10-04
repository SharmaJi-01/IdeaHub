const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

function sign(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function safeUser(user) {
  return {
    id: String(user.id),
    name: user.name,
    username: user.username,
    email: user.email,
    collegeName: user.collegeName,
    studentId: user.studentId,
    institutionEmail: user.institutionEmail,
    verificationStatus: user.verificationStatus,
    role: user.role,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    skills: user.skills || [],
  };
}

async function register(req, res) {
  const { name, username, email, password, collegeName, studentId, institutionEmail } = req.body || {};

  if (!name || !username || !email || !password || !collegeName || !studentId || !institutionEmail) {
    return res.status(400).json({ message: 'Name, username, email, password, college, student ID and institution email are required.' });
  }
  if (String(password).length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });

  const normalizedUsername = String(username).trim().toLowerCase();
  const normalizedEmail = String(email).trim().toLowerCase();
  const exists = await User.findByIdentifier(normalizedEmail);
  const usernameExists = await User.findByIdentifier(normalizedUsername);
  if (exists || usernameExists) return res.status(409).json({ message: 'Email or username already exists.' });

  const passwordHash = await bcrypt.hash(password, 12);
  let user;
  try {
    user = await User.create({
      name: String(name).trim(),
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      collegeName: String(collegeName).trim(),
      studentId: String(studentId).trim(),
      institutionEmail: String(institutionEmail).trim().toLowerCase(),
      verificationStatus: 'pending',
      skills: [],
    });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'Email or username already exists.' });
    throw error;
  }

  return res.status(201).json({
    token: sign(user),
    user: safeUser(user),
    message: 'Account created. Your student profile is pending verification before you can publish ideas.',
  });
}

async function login(req, res) {
  const { identifier, username, email, password } = req.body || {};
  const loginValue = String(identifier ?? username ?? email ?? '').trim().toLowerCase();
  const loginPassword = String(password ?? '');

  if (!loginValue || !loginPassword) {
    return res.status(400).json({ message: 'Username/email and password are required.' });
  }

  const user = await User.findByIdentifier(loginValue);

  if (!user || !(await bcrypt.compare(loginPassword, user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid username/email or password.' });
  }

  await User.recordLogin(user.id, req.ip, req.get('user-agent'));
  return res.json({ token: sign(user), user: safeUser({ ...user, lastLoginAt: new Date().toISOString() }) });
}

async function me(req, res) {
  return res.json({ user: safeUser(req.user) });
}

module.exports = { register, login, me, safeUser };
