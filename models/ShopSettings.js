const mongoose = require('mongoose');

const shopSettingsSchema = new mongoose.Schema({
  // Only one settings document should exist, we can enforce it by a hardcoded ID or just picking the first one
  storeLocation: {
    lat: { type: Number, default: 10.8037 }, // Default somewhere in HCMC (Bình Thạnh)
    lng: { type: Number, default: 106.7145 }
  },
  shippingBaseFee: { type: Number, default: 15000 },
  shippingBaseKm: { type: Number, default: 3 },
  shippingExtraFeePerKm: { type: Number, default: 5000 },
  maxDeliveryKm: { type: Number, default: 15 } // Max distance allowed
}, {
  timestamps: true
});

module.exports = mongoose.model('ShopSettings', shopSettingsSchema);
