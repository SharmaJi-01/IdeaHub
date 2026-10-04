const router = require('express').Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Idea = require('../models/Idea');

router.get('/me/login-history', auth, async (req, res, next) => {
  try { res.json({ data: await User.loginHistory(req.user.id) }); } catch (error) { next(error); }
});

router.get('/:username', async (req, res, next) => {
  try {
    const user = await User.findByUsername(req.params.username.toLowerCase());
    if (!user) return res.status(404).json({ message: 'Creator not found.' });
    const ideas = await Idea.findMany({ creatorId: user.id, moderationStatus: 'approved', sort: 'latest', limit: 50, offset: 0 });
    const publicUser = {
      id: user.id, name: user.name, username: user.username, collegeName: user.collegeName,
      institutionEmail: user.institutionEmail, verificationStatus: user.verificationStatus, role: user.role,
      avatarUrl: user.avatarUrl, bio: user.bio, skills: user.skills, createdAt: user.createdAt,
    };
    res.json({ user: publicUser, ideas });
  } catch (error) { next(error); }
});

module.exports = router;
