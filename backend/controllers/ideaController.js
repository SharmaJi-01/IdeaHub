const path = require('path');
const Idea = require('../models/Idea');
const Like = require('../models/Like');
const Save = require('../models/Save');
const Comment = require('../models/Comment');
const { probeDuration, trimVideo, createThumbnail, publicUrl, safeRemove } = require('../utils/media');
const { serializeIdea } = require('../utils/serialize');
const { uploadDir } = require('../middleware/upload');

const ALLOWED_CATEGORIES = ['AI / ML', 'Web / App', 'IoT', 'Robotics', 'Cyber Security', 'Electronics', 'Computer Vision', 'Design', 'Mechanical', 'Civil', 'Other'];
const ALLOWED_STATUS = ['Idea', 'Building', 'Prototype', 'Working Prototype', 'Demo Ready', 'Completed'];

function csv(value) {
  return String(value || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 12);
}

async function decorate(idea, userId) {
  const [liked, saved] = userId
    ? await Promise.all([
      Like.exists(idea.id, userId),
      Save.exists(idea.id, userId),
    ])
    : [false, false];
  return serializeIdea(idea, { liked, saved });
}

async function list(req, res) {
  const { search = '', category = '', mine = 'false', saved = 'false', sort = 'latest', contentType = '', page = 1, limit = 12 } = req.query;
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(30, Math.max(1, Number(limit) || 12));

  const filters = {};
  if (mine === 'true' && req.user) {
    filters.creatorId = req.user.id;
  } else if (saved === 'true' && req.user) {
    filters.ideaIds = await Save.listIdeaIds(req.user.id);
    filters.moderationStatus = 'approved';
  } else {
    filters.moderationStatus = 'approved';
  }

  if (contentType === 'reel' || contentType === 'idea') filters.contentType = contentType;
  if (category && category !== 'All') filters.category = category;
  if (search.trim()) filters.search = search.trim();

  const offset = (pageNum - 1) * limitNum;
  const [ideas, total] = await Promise.all([
    Idea.findMany({ ...filters, sort, limit: limitNum, offset }),
    Idea.countMany(filters),
  ]);

  const data = await Promise.all(ideas.map((idea) => decorate(idea, req.user?.id)));
  res.json({ data, page: pageNum, pages: Math.max(1, Math.ceil(total / limitNum)), total });
}

async function getOne(req, res) {
  const idea = await Idea.findById(req.params.id);
  if (!idea) return res.status(404).json({ message: 'Idea not found.' });
  if (idea.moderationStatus !== 'approved' && (!req.user || String(idea.creatorId) !== String(req.user.id)) && req.user?.role !== 'admin') {
    return res.status(404).json({ message: 'Idea not found.' });
  }
  idea.views = await Idea.incrementViews(idea.id);
  res.json(await decorate(idea, req.user?.id));
}

async function recordView(req, res) {
  const idea = await Idea.findById(req.params.id);
  if (!idea) return res.status(404).json({ message: 'Idea not found.' });
  if (idea.moderationStatus !== 'approved' && (!req.user || String(idea.creatorId) !== String(req.user.id)) && req.user?.role !== 'admin') {
    return res.status(404).json({ message: 'Idea not found.' });
  }
  const views = await Idea.incrementViews(idea.id);
  res.json({ views });
}

async function share(req, res) {
  const idea = await Idea.findById(req.params.id);
  if (!idea || (idea.moderationStatus !== 'approved' && (!req.user || String(idea.creatorId) !== String(req.user.id)) && req.user?.role !== 'admin')) {
    return res.status(404).json({ message: 'Idea not found.' });
  }
  const method = ['native', 'copy', 'direct'].includes(req.body?.method) ? req.body.method : 'copy';
  res.json(await Idea.recordShare(idea.id, req.user?.id || null, method));
}

async function createContent(req, res, { reelOnly = false } = {}) {
  if (!req.files?.video?.[0]) return res.status(400).json({ message: 'Video is required.' });

  const title = String(req.body.title || '').trim();
  const description = String(req.body.description || '').trim();
  const category = String(req.body.category || 'Other').trim();
  const projectStatus = reelOnly ? 'Idea' : String(req.body.projectStatus || 'Prototype').trim();

  if (title.length < 5) return res.status(400).json({ message: `${reelOnly ? 'Reel' : 'Idea'} title should be at least 5 characters.` });
  if (description.length < 10) return res.status(400).json({ message: `${reelOnly ? 'Reel caption' : 'Idea description'} should be at least 10 characters.` });
  if (!ALLOWED_CATEGORIES.includes(category)) return res.status(400).json({ message: 'Please select a valid category.' });
  if (!reelOnly && !ALLOWED_STATUS.includes(projectStatus)) return res.status(400).json({ message: 'Please select a valid project status.' });

  const video = req.files.video[0];
  const startTime = Number(req.body.startTime || 0);
  const endTime = Number(req.body.endTime || 0);
  let sourceDuration;

  try {
    sourceDuration = await probeDuration(video.path);
  } catch (error) {
    safeRemove(video.path);
    return res.status(400).json({ message: error.message });
  }

  const finalEnd = endTime > 0 ? endTime : sourceDuration;
  const finalStart = Number.isFinite(startTime) ? Math.max(0, startTime) : 0;
  const finalDuration = finalEnd - finalStart;

  const minimumDuration = reelOnly ? 10 : 30;
  if (finalStart >= finalEnd || finalEnd > sourceDuration + 0.25 || finalDuration < minimumDuration || finalDuration > 60) {
    safeRemove(video.path);
    return res.status(400).json({ message: reelOnly ? `Reel must be between 10 and 60 seconds. Current selection: ${Math.round(finalDuration)}s.` : `Idea video must be between 30 and 60 seconds. Current selection: ${Math.round(finalDuration)}s.` });
  }

  const finalFile = path.join(uploadDir, `${Date.now()}-${reelOnly ? 'reel' : 'processed'}.mp4`);
  try {
    await trimVideo(video.path, finalFile, finalStart, finalEnd);
  } catch (error) {
    safeRemove(video.path);
    return res.status(500).json({ message: 'Video processing failed.', details: error.message });
  }
  safeRemove(video.path);

  let thumbnailFile = null;
  if (req.files.thumbnail?.[0]) {
    thumbnailFile = req.files.thumbnail[0];
  } else {
    const generated = path.join(uploadDir, `${Date.now()}-${reelOnly ? 'reel' : 'cover'}.jpg`);
    try {
      await createThumbnail(finalFile, generated, 1);
      thumbnailFile = { filename: path.basename(generated), path: generated };
    } catch {
      safeRemove(generated);
    }
  }

  const created = await Idea.create({
    contentType: reelOnly ? 'reel' : 'idea',
    title,
    description,
    category,
    projectStatus,
    technologies: csv(req.body.technologies),
    tags: csv(req.body.tags).map((tag) => (tag.startsWith('#') ? tag : `#${tag}`)),
    videoUrl: publicUrl(req, path.basename(finalFile)),
    thumbnailUrl: thumbnailFile ? publicUrl(req, thumbnailFile.filename) : '',
    duration: Math.round(finalDuration),
    sourceVideoName: video.originalname,
    creator: req.user.id,
    moderationStatus: 'pending',
  });

  res.status(201).json({
    ...(await decorate(created, req.user.id)),
    message: reelOnly ? 'Reel uploaded and sent for moderation.' : 'Idea uploaded and sent for moderation.',
  });
}

async function create(req, res) {
  return createContent(req, res, { reelOnly: false });
}

async function createReel(req, res) {
  return createContent(req, res, { reelOnly: true });
}

async function update(req, res) {
  const idea = await Idea.findById(req.params.id);
  if (!idea) return res.status(404).json({ message: 'Idea not found.' });
  if (String(idea.creatorId) !== String(req.user.id) && req.user.role !== 'admin') return res.status(403).json({ message: 'You can only edit your own ideas.' });

  const updates = {};
  if (req.body.title !== undefined) {
    updates.title = String(req.body.title).trim();
    if (updates.title.length < 8) return res.status(400).json({ message: 'Idea title should be at least 8 characters.' });
  }
  if (req.body.description !== undefined) {
    updates.description = String(req.body.description).trim();
    if (updates.description.length < 30) return res.status(400).json({ message: 'Please add at least 30 characters explaining the problem and prototype.' });
  }
  if (req.body.category !== undefined) updates.category = String(req.body.category).trim();
  if (req.body.projectStatus !== undefined) updates.projectStatus = String(req.body.projectStatus).trim();
  if (req.body.technologies !== undefined) updates.technologies = csv(req.body.technologies);
  if (req.body.tags !== undefined) updates.tags = csv(req.body.tags).map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));

  if (req.files?.video?.[0]) {
    const incoming = req.files.video[0];
    let sourceDuration;
    try {
      sourceDuration = await probeDuration(incoming.path);
    } catch (error) {
      safeRemove(incoming.path);
      return res.status(400).json({ message: error.message });
    }

    const start = Number(req.body.startTime || 0);
    const end = Number(req.body.endTime || sourceDuration);
    const duration = end - start;
    const minimumDuration = idea.contentType === 'reel' ? 10 : 30;
    if (start < 0 || end > sourceDuration + 0.25 || duration < minimumDuration || duration > 60) {
      safeRemove(incoming.path);
      return res.status(400).json({ message: idea.contentType === 'reel' ? 'Edited Reel must remain between 10 and 60 seconds.' : 'Edited clip must remain between 30 and 60 seconds.' });
    }

    const processed = path.join(uploadDir, `${Date.now()}-edited.mp4`);
    try {
      await trimVideo(incoming.path, processed, start, end);
    } catch (error) {
      safeRemove(incoming.path);
      return res.status(500).json({ message: 'Video processing failed.', details: error.message });
    }
    safeRemove(incoming.path);
    if (idea.videoUrl) {
      try { safeRemove(path.join(uploadDir, path.basename(new URL(idea.videoUrl).pathname))); } catch {}
    }
    updates.videoUrl = publicUrl(req, path.basename(processed));
    updates.duration = Math.round(duration);
    updates.sourceVideoName = incoming.originalname;
    updates.moderationStatus = 'pending';
  }

  if (req.files?.thumbnail?.[0]) {
    if (idea.thumbnailUrl) {
      try { safeRemove(path.join(uploadDir, path.basename(new URL(idea.thumbnailUrl).pathname))); } catch {}
    }
    updates.thumbnailUrl = publicUrl(req, req.files.thumbnail[0].filename);
  }

  if (req.user.role !== 'admin') updates.moderationStatus = 'pending';

  const updated = await Idea.update(req.params.id, updates);
  res.json(await decorate(updated, req.user.id));
}

async function remove(req, res) {
  const idea = await Idea.findById(req.params.id);
  if (!idea) return res.status(404).json({ message: 'Idea not found.' });
  if (String(idea.creatorId) !== String(req.user.id) && req.user.role !== 'admin') return res.status(403).json({ message: 'You can only delete your own ideas.' });

  try { if (idea.videoUrl) safeRemove(path.join(uploadDir, path.basename(new URL(idea.videoUrl).pathname))); } catch {}
  try { if (idea.thumbnailUrl) safeRemove(path.join(uploadDir, path.basename(new URL(idea.thumbnailUrl).pathname))); } catch {}
  await Idea.deleteById(idea.id);
  res.status(204).end();
}

async function toggleLike(req, res) {
  const idea = await Idea.findById(req.params.id);
  if (!idea) return res.status(404).json({ message: 'Idea not found.' });
  res.json(await Like.toggle(idea.id, req.user.id));
}

async function toggleSave(req, res) {
  const idea = await Idea.findById(req.params.id);
  if (!idea) return res.status(404).json({ message: 'Idea not found.' });
  res.json(await Save.toggle(idea.id, req.user.id));
}

async function addComment(req, res) {
  const text = String(req.body?.text || '').trim();
  if (!text) return res.status(400).json({ message: 'Comment cannot be empty.' });
  if (text.length > 400) return res.status(400).json({ message: 'Comment is too long.' });

  const idea = await Idea.findById(req.params.id);
  if (!idea || idea.moderationStatus !== 'approved') return res.status(404).json({ message: 'Idea not found.' });

  const comment = await Comment.create({ idea: idea.id, user: req.user.id, text });
  const user = req.user;

  res.status(201).json({
    id: String(comment.id),
    text: comment.text,
    createdAt: comment.createdAt,
    user: user.name,
    username: user.username,
    avatarUrl: user.avatarUrl,
    verificationStatus: user.verificationStatus,
  });
}

async function comments(req, res) {
  const items = await Comment.findByIdea(req.params.id, 100);
  res.json(items.map((item) => ({
    id: String(item.id),
    text: item.text,
    createdAt: item.createdAt,
    user: item.userName,
    username: item.username,
    avatarUrl: item.avatarUrl,
    verificationStatus: item.verificationStatus,
  })));
}

module.exports = { list, getOne, create, createReel, update, remove, recordView, share, toggleLike, toggleSave, addComment, comments };
