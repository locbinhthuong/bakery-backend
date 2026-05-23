const mongoose = require('mongoose');

const shopCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('ShopCategory', shopCategorySchema);
