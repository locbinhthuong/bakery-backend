require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

const shopRoutes = require('./routes/shopRoutes');

const app = express();

// CORS cho Frontend Bakery App
app.use(cors({
  origin: function (origin, callback) {
    callback(null, true); // Chấp nhận mọi origin
  },
  credentials: true
}));

app.use(helmet({ 
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files serving (đã xóa vì dùng Cloudinary)

// Request Logging
app.use((req, res, next) => {
  console.log(`[Bakery] ${req.method} ${req.originalUrl}`);
  next();
});

// Routes
app.use('/api/shop', shopRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Bakery API đang hoạt động',
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI;

// MongoDB Connection cho Serverless
let cachedDb = null;
async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  const db = await mongoose.connect(MONGO_URI);
  cachedDb = db;
  console.log('✅ Bakery MongoDB Connected');
  return db;
}
connectToDatabase().catch(err => console.error('❌ MongoDB Connection Error:', err));

// Nếu không chạy trên Vercel thì mới listen (để test local)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Bakery Backend running on port ${PORT}`);
  });
}

// Export cho Vercel Serverless
module.exports = app;
