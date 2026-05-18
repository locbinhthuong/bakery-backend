require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const http = require('http');
const path = require('path');

const shopRoutes = require('./routes/shopRoutes');

const app = express();
const server = http.createServer(app);

// CORS cho Frontend Bakery App
app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(helmet({ 
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (cho hình ảnh upload)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Bakery MongoDB Connected');
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Bakery Backend running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err);
  });
