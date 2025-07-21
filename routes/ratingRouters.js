const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.post('/', verifyToken, ratingController.createRating);
router.get('/my/:travelHistoryId', verifyToken, ratingController.getMyRatingsInTrip);

module.exports = router;
