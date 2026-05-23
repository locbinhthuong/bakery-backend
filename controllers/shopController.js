const ShopProduct = require('../models/ShopProduct');
const ShopOrder = require('../models/ShopOrder');
const ShopCustomer = require('../models/ShopCustomer');
const ShopPromo = require('../models/ShopPromo');
const ShopCategory = require('../models/ShopCategory');
const axios = require('axios');

const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: 'diwioucg8',
  api_key: '845651236621476',
  api_secret: 'rDA5YV4xfAym9qKhwTrGagIY8aA'
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
        folder: 'bakery_uploads',
        cloud_name: 'diwioucg8',
        api_key: '845651236621476',
        api_secret: 'rDA5YV4xfAym9qKhwTrGagIY8aA'
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
      const {
        customerName, customerPhone, deliveryAddress, note, items,
        subTotal, discountCode, discountAmount, totalAmount
      } = req.body;

      const order = new ShopOrder({
        customerName, customerPhone, deliveryAddress, note, items,
        subTotal: subTotal || totalAmount, // Tương thích ngược
        discountCode, discountAmount, totalAmount
      });
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
  },

  validatePromo: async (req, res) => {
    try {
      const { code, totalAmount } = req.body;
      if (!code) return res.status(400).json({ success: false, message: 'Vui lòng nhập mã giảm giá' });

      const promo = await ShopPromo.findOne({ code, isActive: true });
      if (!promo) {
        return res.status(404).json({ success: false, message: 'Mã giảm giá không tồn tại hoặc đã hết hạn' });
      }

      let discountAmount = 0;
      if (promo.discountType === 'PERCENT') {
        discountAmount = (totalAmount * promo.discountValue) / 100;
      } else if (promo.discountType === 'FIXED') {
        discountAmount = promo.discountValue;
      } else {
        return res.status(400).json({ success: false, message: 'Mã giảm giá không hợp lệ' });
      }

      // Không giảm giá vượt quá tổng tiền
      if (discountAmount > totalAmount) discountAmount = totalAmount;

      res.json({
        success: true,
        data: {
          code: promo.code,
          discountAmount,
          title: promo.title
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // CATEGORIES
  getCategories: async (req, res) => {
    try {
      const categories = await ShopCategory.find({ isActive: true }).sort({ order: 1 });
      res.json({ success: true, data: categories });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  createCategory: async (req, res) => {
    try {
      const category = new ShopCategory(req.body);
      await category.save();
      res.status(201).json({ success: true, data: category });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },
  updateCategory: async (req, res) => {
    try {
      const category = await ShopCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json({ success: true, data: category });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },
  deleteCategory: async (req, res) => {
    try {
      await ShopCategory.findByIdAndDelete(req.params.id);
      res.json({ success: true, message: 'Đã xoá bộ lọc' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },
  
  // Update Best Seller status
  toggleBestSeller: async (req, res) => {
    try {
      const product = await ShopProduct.findById(req.params.id);
      if (!product) return res.status(404).json({ success: false, message: 'Not found' });
      product.isBestSeller = req.body.isBestSeller;
      await product.save();
      res.json({ success: true, data: product });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
};

module.exports = shopController;
