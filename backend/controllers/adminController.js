const { query } = require('../config/db');
const User = require('../models/User');
const Idea = require('../models/Idea');

async function dashboard(_req, res) {
  const [users, ideas, pendingUsers, pendingIdeas, approvedIdeas, views] = await Promise.all([
    User.count(),
    Idea.countMany(),
    User.count({ verificationStatus: 'pending' }),
    Idea.countMany({ moderationStatus: 'pending' }),
    Idea.countMany({ moderationStatus: 'approved' }),
    query('SELECT COALESCE(SUM(views), 0)::int AS total FROM ideas'),
  ]);
  res.json({ users, ideas, pendingUsers, pendingIdeas, approvedIdeas, views: views.rows[0].total });
}

async function pendingUsers(_req, res) {
  const users = await User.pending(100);
  res.json(users.map(({ passwordHash, ...user }) => user));
}

async function verifyUser(req, res) {
  const { status } = req.body || {};
  if (!['verified', 'rejected'].includes(status)) return res.status(400).json({ message: 'Status must be verified or rejected.' });
  const user = await User.updateVerification(req.params.id, status);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  const { passwordHash, ...safeUser } = user;
  res.json(safeUser);
}

async function pendingIdeas(_req, res) {
  const ideas = await Idea.findMany({ moderationStatus: 'pending', sort: 'latest', limit: 100, offset: 0 });
  res.json(ideas);
}

async function moderateIdea(req, res) {
  const { status, rejectionReason = '' } = req.body || {};
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ message: 'Status must be approved or rejected.' });
  const idea = await Idea.update(req.params.id, {
    moderationStatus: status,
    rejectionReason: status === 'rejected' ? String(rejectionReason).trim() : '',
  });
  if (!idea) return res.status(404).json({ message: 'Idea not found.' });
  res.json(idea);
}

module.exports = { dashboard, pendingUsers, verifyUser, pendingIdeas, moderateIdea };
