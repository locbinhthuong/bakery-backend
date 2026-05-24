const ShopProduct = require('../models/ShopProduct');
const ShopOrder = require('../models/ShopOrder');
const ShopCustomer = require('../models/ShopCustomer');
const ShopPromo = require('../models/ShopPromo');
const ShopCategory = require('../models/ShopCategory');
const ShopSettings = require('../models/ShopSettings');
const axios = require('axios');

// Haversine formula to calculate distance in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);  
  const dLon = (lon2 - lon1) * (Math.PI / 180); 
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  const distance = R * c; 
  return distance;
}

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

  // SETTINGS
  getSettings: async (req, res) => {
    try {
      let settings = await ShopSettings.findOne();
      if (!settings) {
        settings = new ShopSettings();
        await settings.save();
      }
      res.json({ success: true, data: settings });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  updateSettings: async (req, res) => {
    try {
      let settings = await ShopSettings.findOne();
      if (!settings) {
        settings = new ShopSettings(req.body);
      } else {
        Object.assign(settings, req.body);
      }
      await settings.save();
      res.json({ success: true, data: settings });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
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
        subTotal, discountCode, discountAmount, totalAmount, customerLocation,
        shippingFee, distanceKm
      } = req.body;

      const safeShippingFee = shippingFee || 0;
      const safeDistanceKm = distanceKm || 0;

      const calculatedTotalAmount = (subTotal || totalAmount) - (discountAmount || 0) + safeShippingFee;

      const order = new ShopOrder({
        customerName, customerPhone, deliveryAddress, note, items,
        customerLocation,
        subTotal: subTotal || totalAmount, 
        discountCode, discountAmount, 
        shippingFee: safeShippingFee,
        distanceKm: safeDistanceKm,
        totalAmount: calculatedTotalAmount
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
          totalSpent: calculatedTotalAmount
        });
      } else {
        customer.totalOrders += 1;
        customer.totalSpent += calculatedTotalAmount;
        if (req.body.deliveryAddress) customer.address = req.body.deliveryAddress;
      await customer.save();

      // Nâng cấp: Cập nhật lượt sử dụng mã giảm giá
      if (discountCode) {
        await ShopPromo.findOneAndUpdate(
          { code: discountCode },
          { $inc: { totalUsed: 1 } }
        );
      }

      // TODO: Có thể bắn Socket về Admin Bánh ở đây nếu cần realtime
      res.status(201).json({ success: true, data: order });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  getCustomerOrders: async (req, res) => {
    try {
      const phone = req.params.phone;
      if (!phone) return res.status(400).json({ success: false, message: 'Thiếu số điện thoại' });
      
      const orders = await ShopOrder.find({ customerPhone: phone }).sort({ createdAt: -1 });
      res.json({ success: true, data: orders });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
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
      
      // Lấy thông tin tọa độ quán từ ShopSettings
      let settings = await ShopSettings.findOne();
      if (!settings) settings = new ShopSettings();

      // Đẩy sang AloShipp
      try {
        const aloshippPayload = {
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          pickupAddress: 'Cửa hàng Bánh Bakery', // Có thể thêm trường này vào settings sau
          pickupCoordinates: {
            lat: settings.storeLocation.lat,
            lng: settings.storeLocation.lng
          },
          deliveryAddress: order.deliveryAddress,
          deliveryCoordinates: {
            lat: order.customerLocation?.lat || 10.776889,
            lng: order.customerLocation?.lng || 106.700806
          },
          items: order.items.map(i => `${i.quantity} ${i.name}`),
          note: order.note + ' (Đơn từ Bakery App)',
          codAmount: order.totalAmount // Thu hộ tổng tiền đơn hàng (Đã bao gồm tiền ship nếu bạn cộng ở Bakery App)
        };

        const ALOSHIPP_API = process.env.ALOSHIPP_API_URL || 'https://api.aloshipp.com/api/orders/integration';
        
        // Gọi API Integration của AloShip
        const response = await axios.post(ALOSHIPP_API, aloshippPayload, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        console.log('AloShipp Response:', response.data);
        
        // Tùy chọn: Lưu lại mã đơn hàng bên AloShipp vào Bakery order
        if (response.data && response.data.data) {
          order.status = 'CONFIRMED';
          // order.aloShippOrderId = response.data.data.orderId;
        }

      } catch (err) {
        console.error('Lỗi đẩy sang AloShipp:', err.response?.data || err.message);
        // Nếu muốn chặn không cho Confirm nếu AloShipp lỗi thì Uncomment dòng dưới:
        // return res.status(400).json({ success: false, message: 'Lỗi từ AloShipp: ' + (err.response?.data?.message || err.message) });
      }

      await order.save();
      res.json({ success: true, data: order, message: 'Đã xác nhận và đẩy đơn sang AloShipp' });
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
      const { code, totalAmount, customerPhone } = req.body;
      if (!code) return res.status(400).json({ success: false, message: 'Vui lòng nhập mã giảm giá' });

      const promo = await ShopPromo.findOne({ code, isActive: true });
      if (!promo) {
        return res.status(404).json({ success: false, message: 'Mã giảm giá không tồn tại hoặc đã bị khóa' });
      }

      // 1. Kiểm tra Ngày/Giờ
      const now = new Date();
      if (promo.startDate && new Date(promo.startDate) > now) {
        return res.status(400).json({ success: false, message: 'Mã giảm giá chưa đến thời gian áp dụng' });
      }
      if (promo.endDate && new Date(promo.endDate) < now) {
        return res.status(400).json({ success: false, message: 'Mã giảm giá đã hết hạn sử dụng' });
      }

      // 2. Kiểm tra Giá trị Đơn tối thiểu
      if (promo.minOrderValue > 0 && totalAmount < promo.minOrderValue) {
        return res.status(400).json({ success: false, message: `Đơn hàng tối thiểu để áp mã này là ${promo.minOrderValue.toLocaleString('vi-VN')}đ` });
      }

      // 3. Kiểm tra Giới hạn lượt dùng (Toàn hệ thống)
      if (promo.totalUsageLimit > 0 && promo.totalUsed >= promo.totalUsageLimit) {
        return res.status(400).json({ success: false, message: 'Mã giảm giá này đã hết lượt sử dụng' });
      }

      // 4. Kiểm tra Giới hạn lượt dùng mỗi khách hàng (Dựa theo SĐT)
      if (promo.maxUsagePerUser > 0) {
        if (!customerPhone) {
          return res.status(400).json({ success: false, message: 'Bạn cần Đăng Nhập (cung cấp SĐT) để dùng mã giảm giá này' });
        }
        
        // Đếm xem SĐT này đã dùng mã này bao nhiêu lần trong các đơn hàng hợp lệ
        const usageCount = await ShopOrder.countDocuments({
          customerPhone,
          discountCode: promo.code,
          status: { $ne: 'CANCELLED' } // Không tính các đơn đã hủy
        });

        if (usageCount >= promo.maxUsagePerUser) {
          return res.status(400).json({ success: false, message: `Bạn đã dùng quá số lần quy định cho mã này (${promo.maxUsagePerUser} lần)` });
        }
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
