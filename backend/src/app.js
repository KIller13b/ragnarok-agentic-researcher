const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const researchRoutes = require('./routes/research.routes');
const taskRoutes = require('./routes/task.routes');
const reportRoutes = require('./routes/report.routes');
const notFound = require('./middlewares/not-found.middleware');
const errorHandler = require('./middlewares/error.middleware');

const app = express();

// ---------- Global middleware ----------

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ---------- Health check ----------

app.get('/api/v1/health', (_req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});

// ---------- API routes ----------

app.use('/api/v1/research', researchRoutes);
app.use('/api/v1/research', taskRoutes);
app.use('/api/v1/research', reportRoutes);

// ---------- Error handling ----------

app.use(notFound);
app.use(errorHandler);

module.exports = app;
