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

// Admin: Product Routes
router.get('/admin/products', shopController.getAllProductsAdmin);
router.post('/admin/products', shopController.createProduct);
router.put('/admin/products/:id', shopController.updateProduct);
router.delete('/admin/products/:id', shopController.deleteProduct);

// Admin: Upload Image
router.post('/admin/upload', shopController.uploadImage);

router.get('/admin/orders', shopController.getOrdersAdmin);
router.put('/admin/orders/:id/confirm', shopController.confirmOrder);

// Admin: Promo Routes
router.get('/admin/promos', shopController.getPromosAdmin);
router.post('/admin/promos', shopController.createPromo);
router.put('/admin/promos/:id', shopController.updatePromo);
router.delete('/admin/promos/:id', shopController.deletePromo);

// Admin: Customer Routes
router.get('/admin/customers', shopController.getCustomersAdmin);

module.exports = router;
