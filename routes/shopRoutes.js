const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');
const authController = require('../controllers/authController');
const upload = require('../middleware/upload');
const { verifyToken } = require('../middleware/auth');

// Auth Khách hàng
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/customer/profile', verifyToken, authController.getProfile);
router.put('/customer/profile', verifyToken, authController.updateProfile);
router.delete('/customer/profile', verifyToken, authController.deleteProfile);

// Khách hàng
router.get('/products', shopController.getProducts);
router.get('/promos', shopController.getPromos); // Lấy tin tức/khuyến mãi cho khách
router.post('/promos/validate', shopController.validatePromo);
router.post('/orders', shopController.createOrder);
router.get('/customer/orders/:phone', shopController.getCustomerOrders);

// Admin: Product Routes
router.get('/admin/products', shopController.getAllProductsAdmin);
router.post('/admin/products', shopController.createProduct);
router.put('/admin/products/:id', shopController.updateProduct);
router.delete('/admin/products/:id', shopController.deleteProduct);
router.put('/admin/products/:id/bestseller', shopController.toggleBestSeller);

// Admin: Categories
router.get('/categories', shopController.getCategories); // Public route
router.post('/admin/categories', shopController.createCategory);
router.put('/admin/categories/:id', shopController.updateCategory);
router.delete('/admin/categories/:id', shopController.deleteCategory);

// Admin: Upload Image
router.post('/upload', shopController.uploadImage);

// SETTINGS
router.get('/settings', shopController.getSettings);
router.put('/admin/settings', shopController.updateSettings);

router.get('/admin/orders', shopController.getOrdersAdmin);
router.put('/admin/orders/:id/confirm', shopController.confirmOrder);
router.post('/admin/orders/:id/cancel', shopController.cancelOrderAdmin);
router.post('/orders/webhook', shopController.updateOrderStatusWebhook); // Nhận từ AloShipp

// Admin: Promo Routes
router.get('/admin/promos', shopController.getPromosAdmin);
router.post('/admin/promos', shopController.createPromo);
router.put('/admin/promos/:id', shopController.updatePromo);
router.delete('/admin/promos/:id', shopController.deletePromo);

// Admin: Customer Routes
router.get('/admin/customers', shopController.getCustomersAdmin);

module.exports = router;
