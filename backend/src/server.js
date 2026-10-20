require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');

// Default matches the documented port in README.md and the frontend's
// API_BASE fallback (frontend/src/services/api.js -> http://localhost:5000).
// A mismatch here makes the UI's /health check fail silently, which drops it
// onto the mock data path and looks like a working demo with fake reports.
const PORT = process.env.PORT || 5000;

const start = async () => {
  // Validate critical configuration
  if (!process.env.MONGO_URI) {
    console.error('FATAL: MONGO_URI environment variable is not set.');
    console.error('Please add a valid MongoDB connection string to your .env file.');
    process.exit(1);
  }

  // Connect to MongoDB before accepting requests
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });
};

start();
