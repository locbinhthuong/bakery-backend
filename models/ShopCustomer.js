const mongoose = require('mongoose');

const shopCustomerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Mật khẩu mã hóa
  address: { type: String },
  location: {
    lat: { type: Number },
    lng: { type: Number }
  }, // Tọa độ GPS
  totalOrders: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('ShopCustomer', shopCustomerSchema);
