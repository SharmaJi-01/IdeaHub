require('dotenv').config();
const { query, closeDB } = require('../config/db');

async function main() {
  const tables = ['users','login_history','ideas','likes','saves','shares','comments','notifications'];
  const result = await query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ANY($1::text[])
    ORDER BY table_name
  `, [tables]);
  const counts = {};
  for (const table of tables) {
    const row = await query(`SELECT COUNT(*)::int AS count FROM ${table}`);
    counts[table] = row.rows[0].count;
  }
  console.log('IdeaHub PostgreSQL social DB check');
  console.log('Tables:', result.rows.map(r => r.table_name).join(', '));
  console.table(counts);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { try { await closeDB(); } catch {} });
