const Notification = require('../models/Notification');

async function list(req, res) {
  const unreadOnly = String(req.query.unreadOnly || 'false') === 'true';
  const limit = Math.min(Math.max(Number(req.query.limit || 30), 1), 100);
  const [data, unreadCount] = await Promise.all([
    Notification.listForUser(req.user.id, { unreadOnly, limit }),
    Notification.unreadCount(req.user.id),
  ]);
  res.json({ data, unreadCount });
}

async function markRead(req, res) {
  const ok = await Notification.markRead(req.params.id, req.user.id);
  if (!ok) return res.status(404).json({ message: 'Notification not found.' });
  res.json({ ok: true });
}

async function markAllRead(req, res) {
  const marked = await Notification.markAllRead(req.user.id);
  res.json({ ok: true, marked });
}

module.exports = { list, markRead, markAllRead };
