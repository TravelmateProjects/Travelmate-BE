const express = require('express');
const router = express.Router();
const matchUserController = require('../controllers/matchUserController');

router.get('/:userId', matchUserController.findMatchingUsers);

module.exports = router;
