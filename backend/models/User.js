const crypto = require('crypto');
const { query } = require('../config/db');

const USER_COLUMNS = `
  id,
  name,
  username,
  email,
  password_hash AS "passwordHash",
  college_name AS "collegeName",
  student_id AS "studentId",
  institution_email AS "institutionEmail",
  verification_status AS "verificationStatus",
  role,
  avatar_url AS "avatarUrl",
  bio,
  skills,
  last_login_at AS "lastLoginAt",
  verified_at AS "verifiedAt",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

function rowToUser(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    passwordHash: row.passwordHash,
    collegeName: row.collegeName,
    studentId: row.studentId,
    institutionEmail: row.institutionEmail,
    verificationStatus: row.verificationStatus,
    role: row.role,
    avatarUrl: row.avatarUrl,
    bio: row.bio,
    skills: row.skills || [],
    lastLoginAt: row.lastLoginAt,
    verifiedAt: row.verifiedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function findById(id) {
  if (!id) return null;
  const result = await query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1 LIMIT 1`, [id]);
  return rowToUser(result.rows[0]);
}

async function findByUsername(username) {
  const result = await query(`SELECT ${USER_COLUMNS} FROM users WHERE username = LOWER($1) LIMIT 1`, [username]);
  return rowToUser(result.rows[0]);
}

async function findByIdentifier(identifier) {
  const result = await query(`SELECT ${USER_COLUMNS} FROM users WHERE email = LOWER($1) OR username = LOWER($1) LIMIT 1`, [identifier]);
  return rowToUser(result.rows[0]);
}

async function findByIdWithPassword(id) { return findById(id); }

async function create(data) {
  const id = crypto.randomUUID();
  const result = await query(`
    INSERT INTO users (
      id,name,username,email,password_hash,college_name,student_id,
      institution_email,verification_status,role,avatar_url,bio,skills
    ) VALUES ($1,$2,LOWER($3),LOWER($4),$5,$6,$7,LOWER($8),$9,$10,$11,$12,$13)
    RETURNING ${USER_COLUMNS}
  `, [
    id, data.name, data.username, data.email, data.passwordHash,
    data.collegeName, data.studentId, data.institutionEmail,
    data.verificationStatus || 'pending', data.role || 'user',
    data.avatarUrl || '', data.bio || 'Engineering student building useful ideas.', data.skills || [],
  ]);
  return rowToUser(result.rows[0]);
}

async function count(filters = {}) {
  const conditions = [];
  const params = [];
  if (filters.verificationStatus) {
    params.push(filters.verificationStatus);
    conditions.push(`verification_status = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await query(`SELECT COUNT(*)::int AS count FROM users ${where}`, params);
  return result.rows[0].count;
}

async function pending(limit = 100) {
  const result = await query(`
    SELECT ${USER_COLUMNS}
    FROM users WHERE verification_status = 'pending'
    ORDER BY created_at DESC LIMIT $1
  `, [limit]);
  return result.rows.map(rowToUser);
}

async function updateVerification(id, status) {
  const result = await query(`
    UPDATE users
    SET verification_status = $2,
        verified_at = CASE WHEN $2 = 'verified' THEN NOW() ELSE NULL END
    WHERE id = $1
    RETURNING ${USER_COLUMNS}
  `, [id, status]);
  return rowToUser(result.rows[0]);
}

async function recordLogin(userId, ipAddress, userAgent) {
  await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [userId]);
  await query(
    'INSERT INTO login_history (id,user_id,ip_address,user_agent) VALUES ($1,$2,$3,$4)',
    [crypto.randomUUID(), userId, ipAddress || null, userAgent || null]
  );
}

async function loginHistory(userId, limit = 12) {
  const result = await query(`
    SELECT id, logged_in_at AS "loggedInAt", ip_address AS "ipAddress", user_agent AS "userAgent"
    FROM login_history WHERE user_id = $1
    ORDER BY logged_in_at DESC LIMIT $2
  `, [userId, Math.min(Math.max(Number(limit) || 12, 1), 50)]);
  return result.rows;
}

module.exports = { findById, findByUsername, findByIdentifier, findByIdWithPassword, create, count, pending, updateVerification, recordLogin, loginHistory };
