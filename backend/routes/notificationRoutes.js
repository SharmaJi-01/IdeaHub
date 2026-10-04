const router = require('express').Router();
const { auth } = require('../middleware/auth');
const controller = require('../controllers/notificationController');

router.use(auth);
router.get('/', (req, res, next) => controller.list(req, res).catch(next));
router.patch('/read-all', (req, res, next) => controller.markAllRead(req, res).catch(next));
router.patch('/:id/read', (req, res, next) => controller.markRead(req, res).catch(next));

module.exports = router;
