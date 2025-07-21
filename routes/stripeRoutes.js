const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripeController');

// priceId: FE gửi lên, accountId: lấy từ user đăng nhập
router.post('/create-checkout-session', stripeController.createCheckoutSession);

// Xác nhận thanh toán không cần webhook
router.post('/verify-session', stripeController.verifySession);

router.get('/pro-revenue-stats', stripeController.getProRevenueStats);

module.exports = router; 