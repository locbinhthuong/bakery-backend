const mongoose = require('mongoose');

const shopPromoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  image: { type: String },
  code: { type: String, default: '' },
  postType: { type: String, enum: ['ADS', 'NEWS', 'EVENT', 'VOUCHER'], default: 'VOUCHER' },
  discountType: { type: String, enum: ['PERCENT', 'FIXED', 'NONE'], default: 'NONE' },
  discountValue: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  
  // Advanced fields
  maxUsagePerUser: { type: Number, default: 0 }, // 0 = unlimited
  totalUsageLimit: { type: Number, default: 0 }, // 0 = unlimited
  totalUsed: { type: Number, default: 0 },
  minOrderValue: { type: Number, default: 0 },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('ShopPromo', shopPromoSchema);
