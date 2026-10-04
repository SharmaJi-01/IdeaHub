const crypto = require('crypto');
const { query, withTransaction } = require('../config/db');

async function create({ idea, user, text }) {
  return withTransaction(async (client) => {
    const id = crypto.randomUUID();
    const result = await client.query(
      `INSERT INTO comments (id, idea_id, user_id, text)
       VALUES ($1, $2, $3, $4)
       RETURNING id, text, created_at AS "createdAt", user_id AS "userId", idea_id AS "ideaId"`,
      [id, idea, user, text]
    );
    await client.query('UPDATE ideas SET comments_count = comments_count + 1 WHERE id = $1', [idea]);
    return result.rows[0];
  });
}

async function findByIdea(ideaId, limit = 100) {
  const result = await query(
    `SELECT
       c.id,
       c.text,
       c.created_at AS "createdAt",
       u.name AS "userName",
       u.username,
       u.avatar_url AS "avatarUrl",
       u.verification_status AS "verificationStatus"
     FROM comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.idea_id = $1
     ORDER BY c.created_at DESC
     LIMIT $2`,
    [ideaId, limit]
  );
  return result.rows;
}

module.exports = { create, findByIdea };
