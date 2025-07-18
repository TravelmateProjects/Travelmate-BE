const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');

router.get('/accounts/:userId/pro-status', accountController.getProStatus);
router.get('/accounts/:userId', accountController.getAccountByUserId);

module.exports = router; 