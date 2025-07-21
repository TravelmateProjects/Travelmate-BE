require('dotenv').config();
const mongoose = require('mongoose');
const TravelHistory = require('../../models/TravelHistory');
const notificationUtils = require('../../utils/notificationUtils');

/**
 * Travel Update Status Reminder Job
 * This job performs several automated status updates for travel histories:
 * 
 * 1. For 'planing' status:
 *    - Send reminders at 5 and 3 days before arrival date
 *    - Auto-cancel if less than 3 days before arrival and still in 'planing'
 * 
 * 2. For 'active' status:
 *    - Auto-update to 'inprogress' on arrival date
 * 
 * 3. For 'inprogress' status:
 *    - Auto-update to 'completed' 1-3 days after return date
 */
async function travelUpdateStatusReminderJob() {
  try {
    console.log('[Travel Status Update] Starting job - ' + new Date().toISOString());
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    // Get Socket.IO instance for real-time notifications
    const io = global.socketIO || (global.app && global.app.get('io'));
    
    // Track statistics
    const stats = {
      remindersSent: 0,
      cancelledPlans: 0,
      startedTrips: 0,
      completedTrips: 0
    };
    
    // ====================================================================
    // PART 1: Handle 'planing' status - send reminders or auto-cancel (Done)
    // ====================================================================
    
    // Check for trips in 'planing' state
    const planningTrips = await TravelHistory.find({
      status: 'planing'
    }).populate('creatorId', 'fullName avatar').populate('participants', 'fullName avatar');
    
    console.log(`[Travel Status Update] Found ${planningTrips.length} trips in 'planing' status`);
    
    for (const trip of planningTrips) {
      try {
        const arrivalDate = new Date(trip.arrivalDate);
        const daysUntilArrival = Math.ceil((arrivalDate - today) / (1000 * 60 * 60 * 24));
        
        // Send reminders at 5 and 3 days before trip
        if (daysUntilArrival === 5 || daysUntilArrival === 3) {
          // Send notification to creator
          await notificationUtils.createTravelPlanningReminderNotification(
            trip.creatorId._id,
            daysUntilArrival,
            trip,
            true, // isCreator = true
            io
          );
          
          // Send notifications to participants
          for (const participant of trip.participants) {
            // Skip creator to avoid duplicate
            if (participant._id.toString() === trip.creatorId._id.toString()) {
              continue;
            }
            
            await notificationUtils.createTravelPlanningReminderNotification(
              participant._id,
              daysUntilArrival,
              trip,
              false, // isCreator = false
              io
            );
          }
          
          stats.remindersSent += trip.participants.length;
          // console.log(`[Travel Status Update] Sent reminders for trip ${trip._id} (${daysUntilArrival} days until arrival)`);
          
        } 
        // Auto-cancel if less than 3 days before arrival and still in 'planing'
        else if (daysUntilArrival < 3) {
          // Update status to cancelled
          await TravelHistory.updateOne(
            { _id: trip._id },
            { $set: { status: 'cancelled' } }
          );
          
          // Notify creator and participants about cancellation
          await notificationUtils.createTravelAutoCancelNotification(
            trip.creatorId._id,
            trip,
            true, // isCreator = true
            io
          );
          
          for (const participant of trip.participants) {
            if (participant._id.toString() === trip.creatorId._id.toString()) {
              continue;
            }
            
            await notificationUtils.createTravelAutoCancelNotification(
              participant._id,
              trip,
              false, // isCreator = false
              io
            );
          }
          
          stats.cancelledPlans++;
          // console.log(`[Travel Status Update] Auto-cancelled trip ${trip._id} (less than 3 days until arrival)`);
        }
      } catch (tripError) {
        console.error(`[Travel Status Update] Error processing planning trip ${trip._id}: ${tripError.message}`);
      }
    }
    
    // ====================================================================
    // PART 2: Handle 'active' status - update to 'inprogress' on arrival date (Done)
    // ====================================================================
    
    // Find trips with 'active' status where arrival date is today specifically
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const activeTrips = await TravelHistory.find({
      status: 'active',
      arrivalDate: { $gte: today, $lt: tomorrow }
    }).populate('creatorId', 'fullName avatar').populate('participants', 'fullName avatar');
    
    console.log(`[Travel Status Update] Found ${activeTrips.length} 'active' trips to update to 'inprogress'`);
    
    for (const trip of activeTrips) {
      try {
        // Update status to inprogress
        await TravelHistory.updateOne(
          { _id: trip._id },
          { $set: { status: 'inprogress' } }
        );
        
        // Notify creator and participants about status change
        await notificationUtils.createTripStartedNotification(
          trip.creatorId._id,
          trip,
          io
        );
        
        for (const participant of trip.participants) {
          if (participant._id.toString() === trip.creatorId._id.toString()) {
            continue;
          }
          
          await notificationUtils.createTripStartedNotification(
            participant._id,
            trip,
            io
          );
        }
        
        stats.startedTrips++;
        // console.log(`[Travel Status Update] Updated trip ${trip._id} from 'active' to 'inprogress'`);
      } catch (tripError) {
        console.error(`[Travel Status Update] Error updating active trip ${trip._id}: ${tripError.message}`);
      }
    }
    
    // ====================================================================
    // PART 3: Handle 'inprogress' status - update to 'completed' after return date (Done)
    // ====================================================================
    
    // Find trips with 'inprogress' status where return date has passed
    const inProgressTrips = await TravelHistory.find({
      status: 'inprogress',
      returnDate: { $lt: today }
    }).populate('creatorId', 'fullName avatar').populate('participants', 'fullName avatar');
    
    console.log(`[Travel Status Update] Found ${inProgressTrips.length} 'inprogress' trips to potentially complete`);
    
    for (const trip of inProgressTrips) {
      try {
        // Auto-complete trips immediately after return date has passed
        // (Tự động cập nhật trạng thái chuyến đi thành 'completed' ngay sau khi đã qua returnDate)
        // (Tự dộng cập nhật chuyến đi đã hoàn thành return date từ 1 đến 3 ngày, có nên nhắc nhở 1-3 ngày rồi mới tự động update không?)

        // Update status to completed
        await TravelHistory.updateOne(
          { _id: trip._id },
          { $set: { status: 'completed' } }
        );
        
        // Notify creator and participants about completion
        await notificationUtils.createTripCompletedNotification(
          trip.creatorId._id,
          trip,
          io
        );
        
        for (const participant of trip.participants) {
          if (participant._id.toString() === trip.creatorId._id.toString()) {
            continue;
          }
          
          await notificationUtils.createTripCompletedNotification(
            participant._id,
            trip,
            io
          );
        }
        
        stats.completedTrips++;
        // console.log(`[Travel Status Update] Updated trip ${trip._id} from 'inprogress' to 'completed'`);
      } catch (tripError) {
        console.error(`[Travel Status Update] Error updating inprogress trip ${trip._id}: ${tripError.message}`);
      }
    }
    
    // Log final summary
    console.log(`[Travel Status Update] Job completed - Reminders sent: ${stats.remindersSent}, Plans cancelled: ${stats.cancelledPlans}, Trips started: ${stats.startedTrips}, Trips completed: ${stats.completedTrips}`);
    
    return {
      success: true,
      stats,
      completedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`[Travel Status Update] Error in travel status update job: ${error.message}`);
    console.error(error.stack);
    return {
      success: false,
      error: error.message,
      stack: error.stack,
      completedAt: new Date().toISOString()
    };
  }
}

module.exports = travelUpdateStatusReminderJob;
