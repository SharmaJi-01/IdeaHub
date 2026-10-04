const router = require('express').Router();
const { auth, verifiedStudent } = require('../middleware/auth');
const { mediaUpload } = require('../middleware/upload');
const controller = require('../controllers/ideaController');

function optionalAuth(req, res, next) {
  if (!req.headers.authorization) return next();
  return auth(req, res, next);
}

router.get('/', optionalAuth, (req, res, next) => controller.list(req, res).catch(next));
router.get('/:id/comments', (req, res, next) => controller.comments(req, res).catch(next));
router.get('/:id', optionalAuth, (req, res, next) => controller.getOne(req, res).catch(next));
router.post('/reel', auth, mediaUpload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), (req, res, next) => controller.createReel(req, res).catch(next));
router.post('/', auth, verifiedStudent, mediaUpload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), (req, res, next) => controller.create(req, res).catch(next));
router.put('/:id', auth, verifiedStudent, mediaUpload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), (req, res, next) => controller.update(req, res).catch(next));
router.delete('/:id', auth, (req, res, next) => controller.remove(req, res).catch(next));
router.post('/:id/view', optionalAuth, (req, res, next) => controller.recordView(req, res).catch(next));
router.post('/:id/share', optionalAuth, (req, res, next) => controller.share(req, res).catch(next));
router.post('/:id/like', auth, (req, res, next) => controller.toggleLike(req, res).catch(next));
router.post('/:id/save', auth, (req, res, next) => controller.toggleSave(req, res).catch(next));
router.post('/:id/comments', auth, (req, res, next) => controller.addComment(req, res).catch(next));

module.exports = router;
