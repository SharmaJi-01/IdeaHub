const crypto = require('crypto');
const { query, withTransaction } = require('../config/db');

const IDEA_SELECT = `
  i.id,
  i.id AS "_id",
  i.content_type AS "contentType",
  i.title,
  i.description,
  i.category,
  i.project_status AS "projectStatus",
  i.technologies,
  i.tags,
  i.video_url AS "videoUrl",
  i.thumbnail_url AS "thumbnailUrl",
  i.duration,
  i.source_video_name AS "sourceVideoName",
  i.creator_id AS "creatorId",
  i.views,
  i.likes_count AS "likesCount",
  i.comments_count AS "commentsCount",
  i.saves_count AS "savesCount",
  i.shares_count AS "sharesCount",
  i.moderation_status AS "moderationStatus",
  i.rejection_reason AS "rejectionReason",
  i.created_at AS "createdAt",
  i.updated_at AS "updatedAt",
  u.id AS "creator_id_join",
  u.name AS "creator_name",
  u.username AS "creator_username",
  u.avatar_url AS "creator_avatar",
  u.verification_status AS "creator_verification",
  u.college_name AS "creator_college"
`;

function mapIdea(row) {
  if (!row) return null;
  return {
    id: row.id,
    _id: row._id,
    contentType: row.contentType,
    title: row.title,
    description: row.description,
    category: row.category,
    projectStatus: row.projectStatus,
    technologies: row.technologies || [],
    tags: row.tags || [],
    videoUrl: row.videoUrl,
    thumbnailUrl: row.thumbnailUrl,
    duration: row.duration,
    sourceVideoName: row.sourceVideoName,
    creatorId: row.creatorId,
    views: Number(row.views || 0),
    likesCount: Number(row.likesCount || 0),
    commentsCount: Number(row.commentsCount || 0),
    savesCount: Number(row.savesCount || 0),
    sharesCount: Number(row.sharesCount || 0),
    moderationStatus: row.moderationStatus,
    rejectionReason: row.rejectionReason || '',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    creator: row.creator_id_join ? {
      id: row.creator_id_join,
      _id: row.creator_id_join,
      name: row.creator_name,
      username: row.creator_username,
      avatarUrl: row.creator_avatar || '',
      verificationStatus: row.creator_verification,
      collegeName: row.creator_college,
    } : null,
  };
}

function buildWhere(filters = {}, params = []) {
  const conditions = [];
  if (filters.moderationStatus) {
    params.push(filters.moderationStatus);
    conditions.push(`i.moderation_status = $${params.length}`);
  }
  if (filters.contentType) {
    params.push(filters.contentType);
    conditions.push(`i.content_type = $${params.length}`);
  }
  if (filters.category) {
    params.push(filters.category);
    conditions.push(`i.category = $${params.length}`);
  }
  if (filters.creatorId) {
    params.push(filters.creatorId);
    conditions.push(`i.creator_id = $${params.length}`);
  }
  if (filters.ideaIds) {
    if (!filters.ideaIds.length) return 'FALSE';
    params.push(filters.ideaIds);
    conditions.push(`i.id = ANY($${params.length}::uuid[])`);
  }
  if (filters.search) {
    params.push(filters.search.trim());
    conditions.push(`(
      i.search_vector @@ websearch_to_tsquery('simple', $${params.length})
      OR i.title ILIKE '%' || $${params.length} || '%'
      OR i.description ILIKE '%' || $${params.length} || '%'
      OR i.category ILIKE '%' || $${params.length} || '%'
    )`);
  }
  return conditions.length ? conditions.join(' AND ') : 'TRUE';
}

function sortSql(sort) {
  if (sort === 'popular') return 'i.views DESC, i.likes_count DESC, i.created_at DESC';
  if (sort === 'likes') return 'i.likes_count DESC, i.created_at DESC';
  if (sort === 'discussed') return 'i.comments_count DESC, i.created_at DESC';
  if (sort === 'shared') return 'i.shares_count DESC, i.created_at DESC';
  return 'i.created_at DESC';
}

async function findById(id) {
  const result = await query(`
    SELECT ${IDEA_SELECT}
    FROM ideas i
    JOIN users u ON u.id = i.creator_id
    WHERE i.id = $1
    LIMIT 1
  `, [id]);
  return mapIdea(result.rows[0]);
}

async function findMany({ moderationStatus, contentType, category, creatorId, ideaIds, search, sort = 'latest', limit = 12, offset = 0 } = {}) {
  const params = [];
  const where = buildWhere({ moderationStatus, contentType, category, creatorId, ideaIds, search }, params);
  params.push(Math.min(Math.max(Number(limit) || 12, 1), 30));
  params.push(Math.max(Number(offset) || 0, 0));
  const result = await query(`
    SELECT ${IDEA_SELECT}
    FROM ideas i
    JOIN users u ON u.id = i.creator_id
    WHERE ${where}
    ORDER BY ${sortSql(sort)}
    LIMIT $${params.length - 1}
    OFFSET $${params.length}
  `, params);
  return result.rows.map(mapIdea);
}

async function countMany({ moderationStatus, contentType, category, creatorId, ideaIds, search } = {}) {
  const params = [];
  const where = buildWhere({ moderationStatus, contentType, category, creatorId, ideaIds, search }, params);
  const result = await query(`SELECT COUNT(*)::int AS count FROM ideas i WHERE ${where}`, params);
  return result.rows[0].count;
}

async function create(data) {
  const id = crypto.randomUUID();
  await query(`
    INSERT INTO ideas (
      id, content_type, title, description, category, project_status,
      technologies, tags, video_url, thumbnail_url, duration, source_video_name,
      creator_id, views, likes_count, comments_count, saves_count, shares_count,
      moderation_status, rejection_reason
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20
    )
  `, [
    id,
    data.contentType || 'idea',
    data.title,
    data.description,
    data.category,
    data.projectStatus,
    data.technologies || [],
    data.tags || [],
    data.videoUrl,
    data.thumbnailUrl || '',
    data.duration,
    data.sourceVideoName || '',
    data.creator,
    data.views || 0,
    data.likesCount || 0,
    data.commentsCount || 0,
    data.savesCount || 0,
    data.sharesCount || 0,
    data.moderationStatus || 'pending',
    data.rejectionReason || '',
  ]);
  return findById(id);
}

async function update(id, data) {
  const fields = [];
  const params = [];
  const allowed = new Map([
    ['title', 'title'],
    ['description', 'description'],
    ['category', 'category'],
    ['projectStatus', 'project_status'],
    ['technologies', 'technologies'],
    ['tags', 'tags'],
    ['videoUrl', 'video_url'],
    ['thumbnailUrl', 'thumbnail_url'],
    ['duration', 'duration'],
    ['sourceVideoName', 'source_video_name'],
    ['moderationStatus', 'moderation_status'],
    ['rejectionReason', 'rejection_reason'],
  ]);

  for (const [key, column] of allowed) {
    if (data[key] === undefined) continue;
    params.push(data[key]);
    fields.push(`${column} = $${params.length}`);
  }
  if (!fields.length) return findById(id);
  params.push(id);
  const idPosition = params.length;
  await query(`UPDATE ideas SET ${fields.join(', ')} WHERE id = $${idPosition}`, params);
  return findById(id);
}

async function deleteById(id) {
  const result = await query('DELETE FROM ideas WHERE id = $1 RETURNING id', [id]);
  return Boolean(result.rows[0]);
}

async function incrementViews(id) {
  const result = await query('UPDATE ideas SET views = views + 1 WHERE id = $1 RETURNING views', [id]);
  return Number(result.rows[0]?.views || 0);
}

async function recordShare(ideaId, userId, method = 'copy') {
  return withTransaction(async (client) => {
    const id = crypto.randomUUID();
    await client.query(
      `INSERT INTO shares (id, idea_id, user_id, share_method) VALUES ($1,$2,$3,$4)`,
      [id, ideaId, userId || null, method]
    );
    const result = await client.query(
      `UPDATE ideas SET shares_count = shares_count + 1 WHERE id = $1 RETURNING shares_count`,
      [ideaId]
    );
    return { shares: Number(result.rows[0]?.shares_count || 0) };
  });
}

module.exports = {
  findById, findMany, countMany, create, update, deleteById, incrementViews, recordShare,
};
