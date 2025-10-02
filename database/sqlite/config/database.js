const sqlite3 = require('sqlite3').verbose();
const mongoose = require('mongoose');
const path = require('path');

// SQLite Configuration
const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || '../database/sqlite/wallboard.db';

function initSQLite() {
  return new Promise((resolve, reject) => {
    const dbPath = path.resolve(__dirname, SQLITE_DB_PATH);
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ SQLite connection error:', err);
        reject(err);
      } else {
        console.log('✅ Connected to SQLite database');
        console.log(`📁 Database location: ${dbPath}`);
        resolve();
      }
      db.close();
    });
  });
}

// MongoDB Configuration with Retry Logic
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wallboard';

async function connectMongoDB() {
  const maxRetries = 5;
  let currentRetry = 0;
  
  while (currentRetry < maxRetries) {
    try {
      await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000
      });
      console.log('✅ Connected to MongoDB');
      console.log(`📁 Database: ${MONGODB_URI}`);
      return;
      
    } catch (error) {
      currentRetry++;
      console.error(`❌ MongoDB connection attempt ${currentRetry}/${maxRetries} failed:`, error.message);
      
      if (currentRetry >= maxRetries) {
        console.error('❌ All MongoDB connection attempts failed');
        throw new Error(`MongoDB connection failed after ${maxRetries} attempts: ${error.message}`);
      }
      
      const waitTime = Math.min(1000 * Math.pow(2, currentRetry), 10000); // Exponential backoff, max 10s
      console.log(`⏳ Waiting ${waitTime/1000}s before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

// MongoDB connection event handlers
mongoose.connection.on('connected', () => {
  console.log('📊 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🔌 MongoDB connection closed due to app termination');
  process.exit(0);
});

// Export functions
module.exports = {
  initSQLite,
  connectMongoDB,
  SQLITE_DB_PATH: path.resolve(__dirname, SQLITE_DB_PATH)
};