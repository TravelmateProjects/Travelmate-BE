const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyToken, authorizeRole } = require('../middlewares/authMiddleware');

// Get the current user's notifications
router.get('/', verifyToken, notificationController.getUserNotifications);

// Get the count of unread notifications
router.get('/unread-count', verifyToken, notificationController.getUnreadCount);

// Create a new notification (admin or system call only)
router.post('/', verifyToken, authorizeRole('admin'), notificationController.createNotification);

// Mark a notification as read
router.put('/:id/read', verifyToken, notificationController.markAsRead);

// Mark all notifications as read
router.put('/read-all', verifyToken, notificationController.markAllAsRead);

// Delete a notification
router.delete('/:id', verifyToken, notificationController.deleteNotification);

module.exports = router;
