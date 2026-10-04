const router = require('express').Router();
const { auth, admin } = require('../middleware/auth');
const controller = require('../controllers/adminController');

router.use(auth, admin);
router.get('/dashboard', (req, res, next) => controller.dashboard(req, res).catch(next));
router.get('/users/pending', (req, res, next) => controller.pendingUsers(req, res).catch(next));
router.patch('/users/:id/verification', (req, res, next) => controller.verifyUser(req, res).catch(next));
router.get('/ideas/pending', (req, res, next) => controller.pendingIdeas(req, res).catch(next));
router.patch('/ideas/:id/moderation', (req, res, next) => controller.moderateIdea(req, res).catch(next));
module.exports = router;
