const express = require('express');
const router = express.Router();
const matchUserController = require('../controllers/matchUserController');
const { verifyToken } = require('../middlewares/authMiddleware');
router.get('/', verifyToken, matchUserController.findMatchingUsers);

module.exports = router;
