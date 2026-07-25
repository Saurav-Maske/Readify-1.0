const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const usersRoutes = require('./routes/usersRoutes');
const errorHandler = require('./middleware/errorHandler');
const postsRoute = require('./routes/postsRoutes');
const reviewsRoute = require('./routes/reviewsRoutes');
const booksRoute = require('./routes/booksRoutes');

const app = express();

app.locals.dbReady = false;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const startedAt = Date.now();
  const receivedAt = new Date().toISOString();

  console.log(`[${receivedAt}] [REQ] ${req.method} ${req.originalUrl} -> received`);

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    console.log(`[${new Date().toISOString()}] [REQ] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`);
  });

  next();
});

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.get('/health', (req, res) => {
  if (!app.locals.dbReady) {
    return res.status(503).json({ status: 'db-unavailable', database: 'unavailable' });
  }

  return res.json({ status: 'ok', database: 'ready' });
});

app.use((req, res, next) => {
  if (!app.locals.dbReady && req.path !== '/health') {
    return res.status(503).json({ error: 'Database unavailable. Please try again later.' });
  }

  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

// 404 fallback
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use(errorHandler);

module.exports = app;