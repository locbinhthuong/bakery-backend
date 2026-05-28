const mongoose = require('mongoose');

const shopPromoSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  content: { type: String, default: '' },
  image: { type: String },
  images: [{ type: String }],
  code: { type: String, default: '' },
  postType: { type: String, enum: ['ADS', 'NEWS', 'EVENT', 'VOUCHER'], default: 'VOUCHER' },
  discountType: { type: String, enum: ['PERCENT', 'FIXED', 'FREESHIP', 'NONE'], default: 'NONE' },
  discountValue: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  
  // Advanced fields
  maxUsagePerUser: { type: Number, default: 0 }, // 0 = unlimited
  totalUsageLimit: { type: Number, default: 0 }, // 0 = unlimited
  totalUsed: { type: Number, default: 0 },
  minOrderValue: { type: Number, default: 0 },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  pointsCost: { type: Number, default: 0 } // Số điểm cần để đổi mã này (0 = miễn phí)
}, { timestamps: true });

module.exports = mongoose.model('ShopPromo', shopPromoSchema);
