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


const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI;

// MongoDB Connection cho Serverless
let cachedDb = null;
async function connectToDatabase() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }
  const db = await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000 // Timeout 5s thay vì treo mãi mãi
  });
  cachedDb = db;
  console.log('✅ Bakery MongoDB Connected');
  return db;
}

// Middleware đảm bảo DB đã kết nối trước khi vào routes
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    console.error('❌ Database connection error:', error);
    res.status(500).json({ success: false, message: 'Lỗi kết nối cơ sở dữ liệu (Database Connection Error)' });
  }
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

// Nếu không chạy trên Vercel thì mới listen (để test local)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Bakery Backend running on port ${PORT}`);
  });
}

// Export cho Vercel Serverless
module.exports = app;
