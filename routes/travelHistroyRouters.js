const express = require('express');
const router = express.Router();
const travelHistoryController = require('../controllers/travelHistoryController');
const { verifyToken, authorizeRole } = require('../middlewares/authMiddleware');

// Protect all routes with authentication middleware
// router.use(verifyToken);

// Create travel history
// router.post('/', verifyToken, authorizeRole("user"), travelHistoryController.createTravelHistory);

// Admin route to get all travel histories (with filtering, sorting, and pagination)
router.get('/all', verifyToken, authorizeRole("admin"), travelHistoryController.getAllTravelHistories);

// Get all travel histories for authenticated user
router.get('/', verifyToken, authorizeRole("user"),  travelHistoryController.getAllUserTravelHistory);

// Get specific travel history by ID
router.get('/:id', verifyToken, authorizeRole("user"), travelHistoryController.getTravelHistoryById);

// Update basic travel history information
router.put('/:id', verifyToken, authorizeRole("user"), travelHistoryController.updateTravelHistory);

// Add participant to travel history
router.post('/:id/participants', verifyToken, authorizeRole("user"), travelHistoryController.addParticipant);

// Remove participant from travel history
router.delete('/:id/participants', verifyToken, authorizeRole("user"), travelHistoryController.removeParticipant);

// Delete/cancel an upcoming trip
router.delete('/:id', verifyToken, authorizeRole("user"), travelHistoryController.cancelTravelHistory);

module.exports = router;