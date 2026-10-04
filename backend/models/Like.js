const crypto = require('crypto');
const { query, withTransaction } = require('../config/db');

async function exists(ideaId, userId) {
  const result = await query(
    'SELECT 1 FROM likes WHERE idea_id = $1 AND user_id = $2 LIMIT 1',
    [ideaId, userId]
  );
  return result.rowCount > 0;
}

async function toggle(ideaId, userId) {
  return withTransaction(async (client) => {
    await client.query('SELECT id FROM ideas WHERE id = $1 FOR UPDATE', [ideaId]);
    const existing = await client.query(
      'SELECT id FROM likes WHERE idea_id = $1 AND user_id = $2 LIMIT 1',
      [ideaId, userId]
    );

    if (existing.rowCount) {
      await client.query('DELETE FROM likes WHERE id = $1', [existing.rows[0].id]);
      const result = await client.query(
        `UPDATE ideas SET likes_count = GREATEST(0, likes_count - 1)
         WHERE id = $1 RETURNING likes_count`,
        [ideaId]
      );
      return { liked: false, likes: result.rows[0]?.likes_count || 0 };
    }

    await client.query(
      'INSERT INTO likes (id, idea_id, user_id) VALUES ($1, $2, $3)',
      [crypto.randomUUID(), ideaId, userId]
    );
    const result = await client.query(
      `UPDATE ideas SET likes_count = likes_count + 1
       WHERE id = $1 RETURNING likes_count`,
      [ideaId]
    );
    return { liked: true, likes: result.rows[0]?.likes_count || 0 };
  });
}

module.exports = { exists, toggle };
