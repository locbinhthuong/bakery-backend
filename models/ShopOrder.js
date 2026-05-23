const mongoose = require('mongoose');

const shopOrderSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  deliveryAddress: { type: String, required: true },
  customerLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },
  note: { type: String, default: '' },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShopProduct' },
    name: String,
    price: Number,
    quantity: Number
  }],
  subTotal: { type: Number, required: true },
  discountCode: { type: String, default: '' },
  discountAmount: { type: Number, default: 0 },
  shippingFee: { type: Number, default: 0 },
  distanceKm: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'DELIVERED'],
    default: 'PENDING'
  },
  aloShippOrderId: { type: String, default: null } // Mã đơn bên AloShipp khi đẩy qua
}, {
  timestamps: true
});

module.exports = mongoose.model('ShopOrder', shopOrderSchema);
