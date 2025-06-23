const dotenv = require('dotenv');
const express = require('express');
const cors    = require('cors');
const http    = require('http');
const { Server } = require('socket.io');
const app = express();

const path = require('path');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');



app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));


// Load env vars first
dotenv.config();

// Connect to database
connectDB();

// Routes
const authRoutes = require('./routes/authRoutes');
const attendanceRoutes = require('./routes/attedanceRoutes');
const workerRoutes = require('./routes/workerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const taskRoutes = require('./routes/taskRoutes');
const topicRoutes = require('./routes/topicRoutes');
const commentRoutes = require('./routes/commentRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const columnRoutes = require('./routes/columnRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const foodRequestRoutes = require('./routes/foodRequestRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const salaryRoutes = require('./routes/salaryRoutes');
const settingsRoutes = require('./routes/settingsRoutes');




// Configure CORS to allow requests from your client with credentials
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000', 
      'https://tvtasks.netlify.app', 
      'https://client-seven-ruby.vercel.app',
      'https://client-santhoshsekar999-gmailcoms-projects.vercel.app'
    ];
    const regex = /^http:\/\/.*\.localhost:3000$/; // Allow subdomains of localhost:3000

    if (!origin || allowedOrigins.includes(origin) || regex.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/columns', columnRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/food-requests', foodRequestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);

// Route for checking API status
app.get('/', (req, res) => {
  res.json({ message: 'Task Tracker API is running' });
});

// Initialize schedulers and cron jobs
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_SCHEDULERS === 'true') {
  console.log('🚀 Starting production schedulers...');
  
  // Initialize food request schedulers
  const { initializeFoodRequestSchedulers } = require('./schedulers/foodRequestScheduler');
  initializeFoodRequestSchedulers();
  
  // Initialize other cron jobs if they exist
  const { startCronJobs } = require('./services/cronJobs');
  startCronJobs();
} else {
  console.log('⚠️ Schedulers disabled. Set NODE_ENV=production or ENABLE_SCHEDULERS=true to enable');
}

// Error handler (should be last)
app.use(errorHandler);


const { NewMessage } = require('telegram/events');
const { tgClient } = require('./controllers/commentController');


// … your existing Express middleware, routes, etc.

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
      origin: 'http://localhost:3000',
      methods: ['GET','POST'],
      credentials: true
    }
  });

io.on('connection', socket => {
  console.log('🔥 socket connected:', socket.id);
  socket.on('sendTelegramMessage', data => {
    // call tgClient.sendMessage(…)
  });
});

// Inbound: Telegram → browser
tgClient.addEventHandler(async update => {
    // only care about new incoming messages
    if (update.className === 'UpdateNewMessage' && update.message) {
      const { message } = update;
      const fromId   = message.senderId?.userId ?? message.peerId?.userId;
      let   fromName = fromId.toString();
      try {
        const user = await tgClient.getEntity(fromId);
        fromName    = `${user.firstName||''} ${user.lastName||''}`.trim();
      } catch {}
  
      io.emit('telegramMessage', {
        from:      fromId.toString(),
        fromName,
        text:      message.message,
        timestamp: message.date * 1000
      });
    }
  }, new NewMessage({}));

server.listen(process.env.PORT||5000, () => {
  console.log('Server running on port', process.env.PORT||5000);
});
