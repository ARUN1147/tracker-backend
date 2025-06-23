const express = require('express');
const router  = express.Router();
const {
  getWorkerComments,
  getMyComments,
  getAllComments,
  createComment,
  addReply,
  markCommentAsRead,
  getUnreadAdminReplies,
  markAdminRepliesAsRead
} = require('../controllers/commentController');
const { protect, adminOnly, adminOrWorker } = require('../middleware/authMiddleware');

router.post('/', protect, createComment);
// 1) Top‐level comment creation
router.post('/:id/replies', protect, adminOrWorker, addReply);

// 2) Employee endpoints
router.get('/me',protect,getMyComments);
router.get('/worker/:workerId', protect, adminOnly,  getWorkerComments);

// 3) Reply endpoints (both employee & admin can post replies; only admin can fetch replies)
router.get(
     '/:id/replies',
     protect, adminOrWorker,
     async (req, res) => {
       const Comment = require('../models/Comment');
       const comment = await Comment.findById(req.params.id);
       if (!comment) return res.status(404).json({ message: 'Comment not found' });
       res.json(comment.replies || []);
     }
   );
  
router.put('/:id/read',protect,markCommentAsRead);
router.get('/unread-admin-replies',protect,getUnreadAdminReplies);
router.put('/mark-admin-replies-read',protect,markAdminRepliesAsRead);

// 4) Admin‐only: fetch all comments for a subdomain
router.get('/:subdomain',protect, adminOnly, getAllComments);

module.exports = router;