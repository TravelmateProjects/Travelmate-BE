const express = require('express');
const router = express.Router();
const travelHistoryController = require('../controllers/travelHistoryController');
const { verifyToken, authorizeRole } = require('../middlewares/authMiddleware');
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Protect all routes with authentication middleware
// router.use(verifyToken);

// Create travel history
// router.post('/', verifyToken, authorizeRole("user"), upload.fields([{ name: "images", maxCount: 10 }]), travelHistoryController.createTravelHistory);

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

// Change travel history status
router.put('/:id/status', verifyToken, authorizeRole("user"), travelHistoryController.changeStatus);

// // Update travel notes (legacy endpoint)
// router.put('/:id/notes', verifyToken, authorizeRole("user"), travelHistoryController.updateTravelNotes);

// Add a new note with images
router.post('/:id/notes', verifyToken, authorizeRole("user"), upload.fields([{ name: "images", maxCount: 10 }]), travelHistoryController.addTravelNote);

// Update an existing note
router.put('/:id/notes/:noteId', verifyToken, authorizeRole("user"), upload.fields([{ name: "images", maxCount: 10 }]), travelHistoryController.updateTravelNote);

// Delete a note
router.delete('/:id/notes/:noteId', verifyToken, authorizeRole("user"), travelHistoryController.deleteTravelNote);

// Add expenses
router.post('/:id/expenses', verifyToken, authorizeRole("user"), travelHistoryController.addExpense);

// Update expense
router.put('/:id/expenses/:expenseId', verifyToken, authorizeRole("user"), travelHistoryController.updateExpense);

// Delete expense
router.delete('/:id/expenses/:expenseId', verifyToken, authorizeRole("user"), travelHistoryController.deleteExpense);

module.exports = router;