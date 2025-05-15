const express = require('express');
const router = express.Router();
const travelPlanController = require('../controllers/travelPlanController');
const { verifyToken, authorizeRole } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, travelPlanController.getAllTravelPlans);
router.get('/:id', verifyToken, travelPlanController.getTravelPlanById);
router.get('/user/:userId', verifyToken, authorizeRole('user'), verifyToken, travelPlanController.getTravelPlansByUserId);
router.post('/', verifyToken, authorizeRole('user'), travelPlanController.createTravelPlan);
router.put('/:id', verifyToken, authorizeRole('user'), travelPlanController.updateTravelPlan);
router.delete('/:id', verifyToken, authorizeRole('user'), travelPlanController.deleteTravelPlan);


module.exports = router;