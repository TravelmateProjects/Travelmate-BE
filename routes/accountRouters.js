const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');

router.get('/accounts/:userId/pro-status', accountController.getProStatus);
router.get('/accounts/:userId', accountController.getAccountByUserId);
router.get('/accounts/all', accountController.getAllAccounts);
router.get('/accounts/pro/all', accountController.getAllProAccounts);

module.exports = router; 