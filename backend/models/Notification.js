const crypto = require('crypto');
const { query } = require('../config/db');

function map(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    isRead: row.is_read,
    createdAt: row.created_at,
    actor: row.actor_id ? { id: row.actor_id, name: row.actor_name, username: row.actor_username } : null,
    idea: row.idea_id ? { id: row.idea_id, title: row.idea_title } : null,
  };
}

async function listForUser(userId, { unreadOnly = false, limit = 30 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
  const result = await query(`
    SELECT n.*, u.name AS actor_name, u.username AS actor_username, i.title AS idea_title
    FROM notifications n
    LEFT JOIN users u ON u.id = n.actor_id
    LEFT JOIN ideas i ON i.id = n.idea_id
    WHERE n.user_id = $1 ${unreadOnly ? 'AND n.is_read = FALSE' : ''}
    ORDER BY n.created_at DESC
    LIMIT $2
  `, [userId, safeLimit]);
  return result.rows.map(map);
}

async function unreadCount(userId) {
  const result = await query('SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE', [userId]);
  return result.rows[0].count;
}

async function markRead(id, userId) {
  const result = await query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
  return Boolean(result.rows[0]);
}

async function markAllRead(userId) {
  const result = await query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE', [userId]);
  return result.rowCount;
}

async function createSystem(userId, title, message) {
  const id = crypto.randomUUID();
  await query('INSERT INTO notifications (id,user_id,type,title,message) VALUES ($1,$2,$3,$4,$5)', [id, userId, 'system', title, message]);
  return id;
}

module.exports = { listForUser, unreadCount, markRead, markAllRead, createSystem };
