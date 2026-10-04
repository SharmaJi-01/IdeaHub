require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const ideaRoutes = require('./routes/ideaRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { uploadDir } = require('./middleware/upload');
const frontendDir = path.join(__dirname, '..', 'frontend');

const app = express();
const PORT = Number(process.env.PORT || 5000);
const CLIENT_URLS = new Set([
  process.env.CLIENT_URL || 'http://localhost:5000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        mediaSrc: ["'self'", 'blob:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
      },
    },
  })
);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || CLIENT_URLS.has(origin)) return callback(null, true);
    return callback(new Error('CORS origin not allowed'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use('/uploads', express.static(uploadDir, { maxAge: '1d' }));
app.use(express.static(frontendDir, { extensions: ['html'] }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 80, standardHeaders: true, legacyHeaders: false });
app.use('/api/auth', authLimiter);

app.get('/', (_req, res) => res.sendFile(path.join(frontendDir, 'index.html')));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', app: 'IdeaHub API', database: 'postgresql' }));
app.use('/api/auth', authRoutes);
app.use('/api/ideas', ideaRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.get(/^\/(?!api(?:\/|$)|uploads(?:\/|$)).*/, (_req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  const message = err.code === 'LIMIT_FILE_SIZE' ? 'The uploaded file is too large.' : (err.message || 'Request failed.');
  res.status(err.status || 400).json({ message });
});

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => console.log(`IdeaHub API running at http://localhost:${PORT}`));
  } catch (error) {
    console.error(`Backend startup failed: ${error.message}`);
    process.exit(1);
  }
}

start();
