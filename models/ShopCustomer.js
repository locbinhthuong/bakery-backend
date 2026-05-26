const mongoose = require('mongoose');

const shopCustomerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String }, // Mật khẩu mã hóa (không bắt buộc vì khách có thể mua vãng lai)
  address: { type: String },
  location: {
    lat: { type: Number },
    lng: { type: Number }
  }, // Tọa độ GPS
  totalOrders: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  points: { type: Number, default: 0 }, // Điểm hiện tại dùng để đổi quà
  totalPoints: { type: Number, default: 0 }, // Tổng điểm tích lũy dùng để tính Hạng
  savedVouchers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ShopPromo' }], // Các mã giảm giá khách đã lưu hoặc đổi được
  isBlocked: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('ShopCustomer', shopCustomerSchema);
