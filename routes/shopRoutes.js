const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');

// Khách hàng
router.get('/products', shopController.getProducts);
router.get('/promos', shopController.getPromos); // Lấy tin tức/khuyến mãi cho khách
router.post('/orders', shopController.createOrder);

// Admin (Cần thêm middleware Auth sau)
router.get('/admin/products', shopController.getAllProductsAdmin);
router.post('/admin/products', shopController.createProduct);
router.put('/admin/products/:id', shopController.updateProduct);

router.get('/admin/orders', shopController.getOrdersAdmin);
router.post('/admin/orders/:id/confirm', shopController.confirmOrder);

// Admin: Promo Routes
router.get('/admin/promos', shopController.getPromosAdmin);
router.post('/admin/promos', shopController.createPromo);
router.put('/admin/promos/:id', shopController.updatePromo);
router.delete('/admin/promos/:id', shopController.deletePromo);

// Admin: Customer Routes
router.get('/admin/customers', shopController.getCustomersAdmin);

module.exports = router;
