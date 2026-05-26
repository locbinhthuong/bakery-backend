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
  maxDeliveryKm: { type: Number, default: 15 }, // Max distance allowed
  pointsConversionRate: { type: Number, default: 1000 }, // 1000 VND = 1 point
  membershipTiers: {
    type: [{
      name: { type: String, required: true },
      minPoints: { type: Number, required: true }
    }],
    default: [
      { name: 'Đồng', minPoints: 0 },
      { name: 'Bạc', minPoints: 1000 },
      { name: 'Vàng', minPoints: 5000 },
      { name: 'Kim Cương', minPoints: 10000 }
    ]
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ShopSettings', shopSettingsSchema);
