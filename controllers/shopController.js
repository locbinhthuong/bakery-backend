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
        subTotal, discountCode, discountAmount, freeshipCode, freeshipAmount, totalAmount, customerLocation,
        shippingFee, distanceKm, deliveryMethod, pickupTime
      } = req.body;

      const isPickup = deliveryMethod === 'PICKUP';
      const safeShippingFee = isPickup ? 0 : (shippingFee || 0);
      const safeDistanceKm = isPickup ? 0 : (distanceKm || 0);

      const calculatedTotalAmount = (subTotal || totalAmount) - (discountAmount || 0) + safeShippingFee - (freeshipAmount || 0);

      // Check if blocked
      const existingCustomer = await ShopCustomer.findOne({ phone: customerPhone });
      if (existingCustomer && existingCustomer.isBlocked) {
        return res.status(403).json({ success: false, message: 'Số điện thoại này đã bị khóa, không thể đặt hàng.' });
      }

      const order = new ShopOrder({
        customerName, customerPhone, 
        deliveryAddress: isPickup ? '' : deliveryAddress, 
        deliveryMethod: isPickup ? 'PICKUP' : 'DELIVERY',
        pickupTime: isPickup ? pickupTime : null,
        note, items,
        customerLocation: isPickup ? null : customerLocation,
        subTotal: subTotal || totalAmount, 
        discountCode, discountAmount, 
        freeshipCode, freeshipAmount,
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
      }
      await customer.save();

      // Nâng cấp: Cập nhật lượt sử dụng mã giảm giá
      if (discountCode) {
        await ShopPromo.findOneAndUpdate(
          { code: { $regex: new RegExp(`^${discountCode}$`, 'i') } },
          { $inc: { totalUsed: 1 } }
        );
      }
      if (freeshipCode) {
        await ShopPromo.findOneAndUpdate(
          { code: { $regex: new RegExp(`^${freeshipCode}$`, 'i') } },
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
      
      // Nếu là đơn lấy tại quán thì KHÔNG gọi AloShipp
      if (order.deliveryMethod === 'PICKUP') {
        await order.save();
        return res.json({ success: true, data: order, message: 'Đã xác nhận đơn khách đến lấy' });
      }

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
          codAmount: order.totalAmount, // Thu hộ tổng tiền đơn hàng
          bakeryOrderId: order._id.toString()
        };

        const ALOSHIPP_API = process.env.ALOSHIPP_API_URL || 'https://api.aloshipp.com/api/orders/integration';
        
        // Gọi API Integration của AloShip
        const response = await axios.post(ALOSHIPP_API, aloshippPayload, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        console.log('AloShipp Response:', response.data);
        
        if (response.data && response.data.data) {
          order.aloShippOrderId = response.data.data.orderId;
        }

      } catch (err) {
        console.error('Lỗi đẩy sang AloShipp:', err.response?.data || err.message);
        return res.status(400).json({ success: false, message: 'Lỗi từ AloShipp: ' + (err.response?.data?.message || err.message) });
      }

      await order.save();
      res.json({ success: true, data: order, message: 'Đã xác nhận và đẩy đơn sang AloShipp' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Webhook nhận trạng thái từ AloShipp
  updateOrderStatusWebhook: async (req, res) => {
    try {
      const { aloShippOrderId, status } = req.body;
      if (!aloShippOrderId || !status) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin' });
      }

      const order = await ShopOrder.findOne({ aloShippOrderId });
      if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn' });

      // Nếu trạng thái chuyển thành COMPLETED (và trước đó chưa COMPLETED)
      if (status === 'COMPLETED' && order.status !== 'COMPLETED') {
        const settings = await ShopSettings.findOne() || new ShopSettings();
        const conversionRate = settings.pointsConversionRate || 1000;
        const gainedPoints = Math.floor(order.totalAmount / conversionRate);
        
        const customer = await ShopCustomer.findOne({ phone: order.customerPhone });
        if (customer) {
          customer.points = (customer.points || 0) + gainedPoints;
          customer.totalPoints = (customer.totalPoints || 0) + gainedPoints;
          await customer.save();
        }
      }

      order.status = status;
      await order.save();

      res.json({ success: true, message: 'Đã cập nhật trạng thái', data: order });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Admin Hủy Đơn
  cancelOrderAdmin: async (req, res) => {
    try {
      const { id } = req.params;
      const order = await ShopOrder.findById(id);

      if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn' });

      // Nếu đơn chưa đẩy qua AloShipp (hoặc đơn PICKUP) thì hủy luôn trên Bakery App
      if (order.status === 'PENDING' || (order.deliveryMethod === 'PICKUP' && order.status === 'CONFIRMED')) {
        order.status = 'CANCELLED';
        await order.save();
        return res.json({ success: true, message: 'Đã hủy đơn thành công' });
      }

      // Nếu đã đẩy sang AloShipp (CONFIRMED) thì gọi API AloShipp để xin hủy
      if (order.status === 'CONFIRMED' && order.aloShippOrderId) {
        try {
          const ALOSHIPP_API = process.env.ALOSHIPP_API_URL || 'https://api.aloshipp.com/api/orders/integration';
          await axios.post(`${ALOSHIPP_API}/${order.aloShippOrderId}/cancel`);
          
          order.status = 'CANCELLED';
          await order.save();
          return res.json({ success: true, message: 'Đã hủy đơn bên vận chuyển thành công' });
        } catch (err) {
          console.error('Lỗi khi hủy đơn bên AloShipp:', err.response?.data || err.message);
          return res.status(400).json({ success: false, message: 'Không thể hủy: ' + (err.response?.data?.message || err.message) });
        }
      }

      return res.status(400).json({ success: false, message: 'Đơn hàng đã được tài xế nhận hoặc đang giao, không thể hủy' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Admin Hoàn Thành Đơn PICKUP
  completeOrderAdmin: async (req, res) => {
    try {
      const { id } = req.params;
      const order = await ShopOrder.findById(id);

      if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn' });
      if (order.deliveryMethod !== 'PICKUP') {
        return res.status(400).json({ success: false, message: 'Chỉ hỗ trợ hoàn thành tay cho đơn ĐẾN LẤY' });
      }
      
      // Nếu trạng thái chuyển thành COMPLETED (và trước đó chưa COMPLETED)
      if (order.status !== 'COMPLETED') {
        const settings = await ShopSettings.findOne() || new ShopSettings();
        const conversionRate = settings.pointsConversionRate || 1000;
        const gainedPoints = Math.floor(order.totalAmount / conversionRate);
        
        const customer = await ShopCustomer.findOne({ phone: order.customerPhone });
        if (customer) {
          customer.points = (customer.points || 0) + gainedPoints;
          customer.totalPoints = (customer.totalPoints || 0) + gainedPoints;
          await customer.save();
        }
      }

      order.status = 'COMPLETED';
      await order.save();
      return res.json({ success: true, message: 'Đã giao bánh cho khách thành công', data: order });
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
      const { code, totalAmount, shippingFee = 0, customerPhone } = req.body;
      if (!code) return res.status(400).json({ success: false, message: 'Vui lòng nhập mã giảm giá' });

      const promo = await ShopPromo.findOne({ 
        code: { $regex: new RegExp(`^${code}$`, 'i') }, 
        isActive: true 
      });
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
        if (discountAmount > totalAmount) discountAmount = totalAmount;
      } else if (promo.discountType === 'FIXED') {
        discountAmount = promo.discountValue;
        if (discountAmount > totalAmount) discountAmount = totalAmount;
      } else if (promo.discountType === 'PERCENT_SHIPPING') {
        discountAmount = (shippingFee * promo.discountValue) / 100;
      } else if (promo.discountType === 'FIXED_SHIPPING') {
        discountAmount = promo.discountValue;
      } else if (promo.discountType === 'FREESHIP') {
        // FREESHIP value is either max freeship amount or unlimited
        discountAmount = promo.discountValue > 0 ? promo.discountValue : 999999;
      } else {
        return res.status(400).json({ success: false, message: 'Mã giảm giá không hợp lệ' });
      }

      res.json({
        success: true,
        data: {
          code: promo.code,
          discountAmount,
          discountType: promo.discountType,
          title: promo.title
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Đổi điểm lấy mã giảm giá
  redeemPromo: async (req, res) => {
    try {
      const { promoId } = req.body;
      const customerId = req.user.id; // from verifyToken

      const promo = await ShopPromo.findById(promoId);
      if (!promo) return res.status(404).json({ success: false, message: 'Không tìm thấy ưu đãi' });
      if (promo.pointsCost <= 0) return res.status(400).json({ success: false, message: 'Ưu đãi này không thể đổi bằng điểm' });

      const customer = await ShopCustomer.findById(customerId);
      if (!customer) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });

      if (customer.points < promo.pointsCost) {
        return res.status(400).json({ success: false, message: 'Bạn không đủ điểm để đổi ưu đãi này' });
      }

      if (customer.savedVouchers.includes(promoId)) {
        return res.status(400).json({ success: false, message: 'Bạn đã đổi mã này rồi' });
      }

      // Trừ điểm và thêm mã vào giỏ
      customer.points -= promo.pointsCost;
      customer.savedVouchers.push(promoId);
      await customer.save();

      res.json({ success: true, message: 'Đổi mã thành công!', data: customer });
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
  },

  // CUSTOMERS ADMIN
  getCustomersAdmin: async (req, res) => {
    try {
      const customers = await ShopCustomer.find().sort({ createdAt: -1 }).select('-password');
      res.json({ success: true, data: customers });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  updateCustomerAdmin: async (req, res) => {
    try {
      const { name, phone, password } = req.body;
      const customer = await ShopCustomer.findById(req.params.id);
      if (!customer) return res.status(404).json({ success: false, message: 'Không tìm thấy KH' });
      
      if (name) customer.name = name;
      if (phone) customer.phone = phone;
      if (password) {
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        customer.password = await bcrypt.hash(password, salt);
      }
      
      await customer.save();
      res.json({ success: true, data: customer, message: 'Cập nhật thành công' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  deleteCustomerAdmin: async (req, res) => {
    try {
      await ShopCustomer.findByIdAndDelete(req.params.id);
      res.json({ success: true, message: 'Đã xoá khách hàng' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  toggleBlockCustomerAdmin: async (req, res) => {
    try {
      const customer = await ShopCustomer.findById(req.params.id);
      if (!customer) return res.status(404).json({ success: false, message: 'Không tìm thấy KH' });
      
      customer.isBlocked = !customer.isBlocked;
      await customer.save();
      res.json({ success: true, data: customer, message: customer.isBlocked ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
};

module.exports = shopController;
