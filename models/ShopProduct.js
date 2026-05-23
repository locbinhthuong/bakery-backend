const mongoose = require('mongoose');

const shopProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true },
  image: { type: String, default: '' },
  category: { type: String, default: 'Bánh ngọt' },
  isActive: { type: Boolean, default: true },
  isBestSeller: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('ShopProduct', shopProductSchema);
