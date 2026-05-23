const ShopProduct = require('../models/ShopProduct');
const ShopOrder = require('../models/ShopOrder');
const ShopCustomer = require('../models/ShopCustomer');
const ShopPromo = require('../models/ShopPromo');
const axios = require('axios');

const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const shopController = {
  // UPLOAD
  uploadImage: async (req, res) => {
    try {
      const { image } = req.body; // base64 string
      if (!image) {
        return res.status(400).json({ success: false, message: 'Không có dữ liệu ảnh.' });
      }
      
      const result = await cloudinary.uploader.upload(image, {
        folder: 'bakery_uploads'
      });
      
      res.status(200).json({ success: true, url: result.secure_url });
    } catch (error) {
      console.error('Lỗi Upload Cloudinary:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // PRODUCTS
  getProducts: async (req, res) => {
    try {
      const products = await ShopProduct.find({ isActive: true });
      res.json({ success: true, data: products });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  
  getAllProductsAdmin: async (req, res) => {
    try {
      const products = await ShopProduct.find().sort({ createdAt: -1 });
      res.json({ success: true, data: products });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  createProduct: async (req, res) => {
    try {
      const product = new ShopProduct(req.body);
      await product.save();
      res.status(201).json({ success: true, data: product });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  updateProduct: async (req, res) => {
    try {
      const product = await ShopProduct.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json({ success: true, data: product });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  deleteProduct: async (req, res) => {
    try {
      await ShopProduct.findByIdAndDelete(req.params.id);
      res.json({ success: true, message: 'Đã xoá sản phẩm' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // ORDERS
  createOrder: async (req, res) => {
    try {
      const order = new ShopOrder(req.body);
      await order.save();

      // Lưu lại thông tin khách hàng hoặc cập nhật lịch sử mua
      let customer = await ShopCustomer.findOne({ phone: req.body.customerPhone });
      if (!customer) {
        customer = new ShopCustomer({
          name: req.body.customerName,
          phone: req.body.customerPhone,
          address: req.body.deliveryAddress,
          totalOrders: 1,
          totalSpent: req.body.totalAmount
        });
      } else {
        customer.totalOrders += 1;
        customer.totalSpent += req.body.totalAmount;
        if (req.body.deliveryAddress) customer.address = req.body.deliveryAddress;
      }
      await customer.save();
      // TODO: Có thể bắn Socket về Admin Bánh ở đây nếu cần realtime
      res.status(201).json({ success: true, data: order });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  getOrdersAdmin: async (req, res) => {
    try {
      const orders = await ShopOrder.find().sort({ createdAt: -1 });
      res.json({ success: true, data: orders });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Khi Admin xác nhận, đẩy qua AloShipp
  confirmOrder: async (req, res) => {
    try {
      const order = await ShopOrder.findById(req.params.id);
      if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn' });
      
      if (order.status !== 'PENDING') {
        return res.status(400).json({ success: false, message: 'Đơn này đã được xử lý' });
      }

      order.status = 'CONFIRMED';
      
      // Đẩy sang AloShipp
      try {
        const aloshippPayload = {
          serviceType: 'GIAO_HANG',
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          pickupAddress: 'Cửa hàng Bánh Bakery (Địa chỉ mặc định)', // Có thể cấu hình sau
          deliveryAddress: order.deliveryAddress,
          codAmount: order.totalAmount, // Thu hộ bằng tổng tiền bánh
          note: order.note + ' (Đơn từ Bakery App)',
          items: order.items.map(i => `${i.name} (x${i.quantity})`),
          senderName: 'Bakery Shop',
          senderPhone: '0900000000'
        };

        const ALOSHIPP_API = process.env.ALOSHIPP_API_URL || 'http://localhost:5000/api/orders/customer';
        
        // Vì API /api/orders/customer của AloShipp yêu cầu verifyToken (authMiddleware)
        // Chúng ta có thể phải tạo 1 endpoint riêng bên AloShipp cho Merchant hoặc bypass.
        // Tạm thời gửi request. Nếu lỗi auth, sẽ báo lỗi để setup lại bên AloShipp.
        // => Ghi chú: Cần tạo 1 tài khoản User vai trò SHOP bên AloShipp lấy token gắn vào đây.
        
        // Mock success for now, in reality needs a valid token:
        // const response = await axios.post(ALOSHIPP_API, aloshippPayload, { headers: { Authorization: `Bearer ${SHOP_TOKEN}` } });
        // order.aloShippOrderId = response.data.data._id;
        
      } catch (err) {
        console.error('Lỗi đẩy sang AloShipp:', err.message);
        // Tạm thời vẫn cho pass để test nội bộ Bakery
      }

      await order.save();
      res.json({ success: true, data: order, message: 'Đã xác nhận và đẩy đơn sang AloShipp (Mock)' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // CUSTOMERS
  getCustomersAdmin: async (req, res) => {
    try {
      const customers = await ShopCustomer.find().sort({ totalSpent: -1 });
      res.json({ success: true, data: customers });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // PROMOS (TIN TỨC / KHUYẾN MÃI)
  getPromos: async (req, res) => {
    try {
      const promos = await ShopPromo.find({ isActive: true }).sort({ createdAt: -1 });
      res.json({ success: true, data: promos });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getPromosAdmin: async (req, res) => {
    try {
      const promos = await ShopPromo.find().sort({ createdAt: -1 });
      res.json({ success: true, data: promos });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  createPromo: async (req, res) => {
    try {
      const promo = new ShopPromo(req.body);
      await promo.save();
      res.status(201).json({ success: true, data: promo });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  updatePromo: async (req, res) => {
    try {
      const promo = await ShopPromo.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json({ success: true, data: promo });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  deletePromo: async (req, res) => {
    try {
      await ShopPromo.findByIdAndDelete(req.params.id);
      res.json({ success: true, message: 'Đã xoá tin tức/khuyến mãi' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
};

module.exports = shopController;
