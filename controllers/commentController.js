require('dotenv').config();
const asyncHandler = require('express-async-handler');
const Comment = require('../models/Comment');
const Worker = require('../models/Worker');

const readline            = require('readline');
const { TelegramClient } = require('telegram');
const { StringSession }    = require('telegram/sessions');
// your API_ID / API_HASH from my.telegram.org:
const API_ID = 26389181;
const API_HASH = '86a046a2b78806aa42f056319e9b21e9';
const stringSession = new StringSession(process.env.TELEGRAM_SESSION || '');
const tgClient = new TelegramClient(stringSession, API_ID, API_HASH, {
     connectionRetries: 5,
     useWSS: true,           // ⇐ use WebSocket (port 443) instead of TCP/80
     // proxy: {             // ⇐ optionally, if you run your own MTProto proxy
     //   ip:   process.env.MTPROXY_HOST,
     //   port: Number(process.env.MTPROXY_PORT),
     //   MTProxy: true,
     //   secret: process.env.MTPROXY_SECRET,
     // },
   });


(async () => {
  // if no saved session, do interactive login once
  if (!process.env.TELEGRAM_SESSION) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const question = q => new Promise(res => rl.question(q, res));

    await tgClient.start({
      phoneNumber: async () => process.env.TELEGRAM_PHONE,
      phoneCode:   async () => await question('Enter Telegram SMS code: '),
      password:    async () => process.env.TELEGRAM_2FA,
      onError:     err => console.error('Telegram error', err)
    });

    rl.close();
    console.log('🔌 Telegram client ready (first login)');
    console.log('\n⚡ COPY this into your .env as TELEGRAM_SESSION:\n');
    console.log(tgClient.session.save(), '\n');
  } else {
    // headless reconnect using saved session
    await tgClient.start({ onError: err => console.error('Telegram error', err) });
    console.log('🔌 Telegram client ready (reconnected)');
  }
})();

// @desc    Get comments for a worker
// @route   GET /api/comments/worker/:workerId
// @access  Private
const getWorkerComments = asyncHandler(async (req, res) => {
  const comments = await Comment.find({ worker: req.params.workerId })
    .sort({ createdAt: -1 });

  res.json(comments);
});

// @desc    Get my comments
// @route   GET /api/comments/me
// @access  Private
const getMyComments = asyncHandler(async (req, res) => {
  const comments = await Comment.find({ worker: req.user._id })
   .populate({
     path: 'worker',
     populate: { path: 'department', select: 'name' },
     select:   'name department photo telegramId'
   })
   .sort({ createdAt: -1 });
  // Mark all comments and replies as read
  for (const comment of comments) {
    comment.isNew = false;
    if (comment.replies && comment.replies.length > 0) {
      comment.replies.forEach(reply => {
        reply.isNew = false;
      });
    }
    await comment.save();
  }

  res.json(comments);
});

// @desc    Get all comments (admin)
// @route   GET /api/comments
// @access  Private/Admin
const getAllComments = asyncHandler(async (req, res) => {
  const { subdomain } = req.params;

  if (!subdomain || subdomain == 'main') {
    res.status(400);
    throw new Error('Company name is missing, login again.');
  }

  const comments = await Comment.find({ subdomain })
    .populate({
      path: 'worker',
      populate: {
        path: 'department',
        select: 'name'
      },
      select: 'name department photo username telegramId' // Add more fields
    })
    .sort({ createdAt: -1 });

  // More detailed transformation
  const transformedComments = comments.map(comment => {
    const commentObj = comment.toObject();

    // Provide fallback values
    commentObj.worker = commentObj.worker || {
      name: 'Unknown Worker',
      department: { name: 'Unassigned' }
    };

    return commentObj;
  });

  res.json(transformedComments);
});

const createComment = asyncHandler(async (req, res) => {
  const { text, subdomain } = req.body;
  const workerId = req.user._id;

  // Validate input
  if (!text) {
    res.status(400);
    throw new Error('Comment text is missing');
  }

  if (!subdomain || subdomain == 'main') {
    res.status(400);
    throw new Error('Company name is missing, login again.');
  }

  try {
    const comment = await Comment.create({
      worker: workerId,
      subdomain,
      text
    });

    // Populate worker details
    await comment.populate({
            path: 'worker',
            populate: {
              path: 'department',
              select: 'name'
            },
            select: 'name department photo telegramId'
          });

    console.log('Comment Created Successfully:', comment);

    res.status(201).json(comment);
  } catch (error) {
    console.error('Comment Creation Error:', error);
    res.status(500);
    throw new Error('Failed to create comment');
  }
});
// @desc    Add reply to comment
// @route   POST /api/comments/:id/replies
// @access  Private
const addReply = asyncHandler(async (req, res) => {
  const { text } = req.body;

  if (!text) {
    res.status(400);
    throw new Error('Please add text to your reply');
  }

  const comment = await Comment.findById(req.params.id);

  if (!comment) {
    res.status(404);
    throw new Error('Comment not found');
  }

  // Create new reply
  const newReply = {
    text,
    isAdminReply: req.user.role === 'admin',
    isNew: true
  };

  // Add reply to comment
  comment.replies = comment.replies || [];
  comment.replies.push(newReply);

  // If admin reply, set notification flag
  if (req.user.role === 'admin') {
    comment.hasUnreadAdminReply = true;
    comment.lastReplyTimestamp = new Date();
  }

  comment.isNew = true;

  await comment.save();

 // re-populate so worker.telegramId is available to the client
 await comment.populate({
      path: 'worker',
      populate: { path: 'department', select: 'name' },
      select: 'name department photo username telegramId'
    });

  const toPeer = comment.worker.telegramId;
  if (toPeer) {
    try {
      await tgClient.sendMessage(
        toPeer.startsWith('@') ? toPeer : BigInt(toPeer),
        { message: text }
      );
    } catch (err) {
      console.error('📩 Telegram send failed:', err);
    }
  }

  res.status(201).json(comment);
});


// @desc    Mark comment as read
// @route   PUT /api/comments/:id/read
// @access  Private
const markCommentAsRead = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);

  if (!comment) {
    res.status(404);
    throw new Error('Comment not found');
  }

  comment.isNew = false;

  if (comment.replies && comment.replies.length > 0) {
    comment.replies.forEach(reply => {
      reply.isNew = false;
    });
  }

  await comment.save();

  res.json({ message: 'Comment marked as read' });
});

const getUnreadAdminReplies = asyncHandler(async (req, res) => {
  const comments = await Comment.find({
    worker: req.user._id,
    hasUnreadAdminReply: true
  });

  res.json(comments);
});

const markAdminRepliesAsRead = asyncHandler(async (req, res) => {
  await Comment.updateMany(
    {
      worker: req.user._id,
      hasUnreadAdminReply: true
    },
    {
      hasUnreadAdminReply: false
    }
  );

  res.json({ message: 'Admin replies marked as read' });
});

module.exports = {
  getWorkerComments,
  getMyComments,
  getAllComments,
  createComment,
  addReply,
  markAdminRepliesAsRead,
  getUnreadAdminReplies,
  markCommentAsRead
};
module.exports.tgClient = tgClient;