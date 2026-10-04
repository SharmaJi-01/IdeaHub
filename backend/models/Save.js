const crypto = require('crypto');
const { query, withTransaction } = require('../config/db');

async function exists(ideaId, userId) {
  const result = await query(
    'SELECT 1 FROM saves WHERE idea_id = $1 AND user_id = $2 LIMIT 1',
    [ideaId, userId]
  );
  return result.rowCount > 0;
}

async function listIdeaIds(userId) {
  const result = await query(
    'SELECT idea_id FROM saves WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows.map((row) => row.idea_id);
}

async function toggle(ideaId, userId) {
  return withTransaction(async (client) => {
    await client.query('SELECT id FROM ideas WHERE id = $1 FOR UPDATE', [ideaId]);
    const existing = await client.query(
      'SELECT id FROM saves WHERE idea_id = $1 AND user_id = $2 LIMIT 1',
      [ideaId, userId]
    );

    if (existing.rowCount) {
      await client.query('DELETE FROM saves WHERE id = $1', [existing.rows[0].id]);
      const result = await client.query(
        `UPDATE ideas SET saves_count = GREATEST(0, saves_count - 1)
         WHERE id = $1 RETURNING saves_count`,
        [ideaId]
      );
      return { saved: false, saves: result.rows[0]?.saves_count || 0 };
    }

    await client.query(
      'INSERT INTO saves (id, idea_id, user_id) VALUES ($1, $2, $3)',
      [crypto.randomUUID(), ideaId, userId]
    );
    const result = await client.query(
      `UPDATE ideas SET saves_count = saves_count + 1
       WHERE id = $1 RETURNING saves_count`,
      [ideaId]
    );
    return { saved: true, saves: result.rows[0]?.saves_count || 0 };
  });
}

module.exports = { exists, listIdeaIds, toggle };
