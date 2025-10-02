// index.js
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const { MongoClient } = require("mongodb");

const app = express();
const PORT = process.env.PORT || 3001;

// ------------------- SQLite Setup -------------------
const sqliteDB = new sqlite3.Database("./database/sqlite/wallboard.db", (err) => {
  if (err) {
    console.error("❌ Failed to connect to SQLite:", err.message);
  } else {
    console.log("✅ Connected to SQLite database");
  }
});

// ------------------- MongoDB Setup -------------------
const mongoUrl = "mongodb://localhost:27017";
const mongoClient = new MongoClient(mongoUrl);

async function connectMongo() {
  try {
    await mongoClient.connect();
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ Failed to connect to MongoDB:", err.message);
  }
}

connectMongo();

// ------------------- Routes -------------------
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    sqlite: sqliteDB ? "connected" : "disconnected",
    mongo: mongoClient.isConnected() ? "connected" : "disconnected",
  });
});

// ------------------- Start Server -------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
