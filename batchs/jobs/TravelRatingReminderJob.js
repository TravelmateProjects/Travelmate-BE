require('dotenv').config();
const mongoose = require('mongoose');
const TravelHistory = require('../../models/TravelHistory');
const notificationUtils = require('../../utils/notificationUtils');

/**
 * Travel Rating Reminder Job
 * This job sends rating reminders to trip participants after the trip is completed
 * It sends reminders at 1 and 3 days after return date
 */
async function travelRatingReminderJob() {
  try {
    console.log('[Travel Rating Reminder] Starting job - ' + new Date().toISOString());
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    // Get Socket.IO instance for real-time notifications
    const io = global.socketIO || (global.app && global.app.get('io'));
    
    // Track statistics
    const stats = {
      remindersSent: 0,
      tripsProcessed: 0,
      errors: 0
    };

    // Calculate dates for 1 and 3 days after return date
    const oneDayAfter = new Date(today);
    oneDayAfter.setDate(today.getDate() - 1); // Return date was yesterday
    oneDayAfter.setHours(0, 0, 0, 0);

    const threeDaysAfter = new Date(today);
    threeDaysAfter.setDate(today.getDate() - 3); // Return date was 3 days ago
    threeDaysAfter.setHours(0, 0, 0, 0);

    // Find completed trips where return date was EXACTLY 1 or 3 days ago
    const completedTrips = await TravelHistory.find({
      status: 'completed',
      $or: [
        // Return date was exactly 1 day ago - whole day match
        {
          returnDate: {
            $gte: oneDayAfter,
            $lt: new Date(new Date(oneDayAfter).setDate(oneDayAfter.getDate() + 1))
          }
        },
        // Return date was exactly 3 days ago - whole day match
        {
          returnDate: {
            $gte: threeDaysAfter,
            $lt: new Date(new Date(threeDaysAfter).setDate(threeDaysAfter.getDate() + 1))
          }
        }
      ]
    }).populate('creatorId', 'fullName avatar').populate('participants', 'fullName avatar');
    
    // console.log(`[Travel Rating Reminder] Found ${completedTrips.length} completed trips to send rating reminders for`);
    
    // Process each completed trip
    for (const trip of completedTrips) {
      try {
        stats.tripsProcessed++;
        // Determine exact days since return based on the date ranges we queried
        // Instead of calculating, we'll use the specific days we're targeting
        const returnDate = new Date(trip.returnDate);
        
        // Check if the trip return date is in the one day ago range
        const isOneDayAgo = returnDate >= oneDayAfter && 
                            returnDate < new Date(new Date(oneDayAfter).setDate(oneDayAfter.getDate() + 1));
        
        // If it's one day ago, use 1, otherwise it must be 3 days ago
        const daysSinceReturn = isOneDayAgo ? 1 : 3;
        
        console.log(`[Travel Rating Reminder] Processing trip to ${trip.destination}, ${daysSinceReturn} days since return`);
        
        // Prepare participants data for the creator
        const participantsForCreator = trip.participants.map(p => ({
          _id: p._id,
          fullName: p.fullName,
          avatar: p.avatar
        }));
        
        // Create a notification for the trip creator
        await notificationUtils.createRatingReminderNotification(
          trip.creatorId._id,
          trip,
          daysSinceReturn,
          true, // isCreator = true
          participantsForCreator, // people to rate
          io
        );
        stats.remindersSent++;
        
        // Create notifications for all participants
        for (const participant of trip.participants) {
          // Skip if participant is the creator (already notified)
          if (participant._id.toString() === trip.creatorId._id.toString()) {
            continue;
          }
          
          // Prepare people to rate (creator and other participants except self)
          const peopleToRate = [
            // Add creator
            {
              _id: trip.creatorId._id,
              fullName: trip.creatorId.fullName,
              avatar: trip.creatorId.avatar
            },
            // Add other participants (excluding self)
            ...trip.participants
              .filter(p => p._id.toString() !== participant._id.toString())
              .map(p => ({
                _id: p._id,
                fullName: p.fullName,
                avatar: p.avatar
              }))
          ];
          
          await notificationUtils.createRatingReminderNotification(
            participant._id,
            trip,
            daysSinceReturn,
            false, // isCreator = false
            peopleToRate, // people to rate
            io
          );
          stats.remindersSent++;
        }
        
      } catch (tripError) {
        console.error(`[Travel Rating Reminder] Error processing trip ${trip._id}: ${tripError.message}`);
        stats.errors++;
      }
    }
    
    // Log final summary
    console.log(`[Travel Rating Reminder] Job completed - Trips processed: ${stats.tripsProcessed}, Reminders sent: ${stats.remindersSent}, Errors: ${stats.errors}`);
    
    return {
      success: true,
      stats,
      completedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`[Travel Rating Reminder] Error in travel rating reminder job: ${error.message}`);
    console.error(error.stack);
    return {
      success: false,
      error: error.message,
      stack: error.stack,
      completedAt: new Date().toISOString()
    };
  }
}

module.exports = travelRatingReminderJob;
