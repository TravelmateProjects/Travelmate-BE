require('dotenv').config();
const mongoose = require('mongoose');
const TravelHistory = require('../../models/TravelHistory');
const notificationUtils = require('../../utils/notificationUtils');

/**
 * Travel reminder job
 * Checks for active travel histories with arrival dates at specific intervals (5, 3, 1 days)
 * and sends reminder notifications to all participants
 */
async function travelReminderJob() {
  try {
    console.log('[Travel reminder] Starting job - ' + new Date().toISOString());
    
    const today = new Date();
    
    // Check for trips 5 days, 3 days and 1 day before arrival
    const reminderDays = [5, 3, 1];
    let totalNotificationsCreated = 0;
    
    for (const daysBeforeTrip of reminderDays) {
      // Calculate target date
      const targetDate = new Date();
      targetDate.setDate(today.getDate() + daysBeforeTrip);
      
      // Set time to beginning of day for accurate date comparison
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(targetDate.getDate() + 1);
      
      // Find active travel histories with arrival date exactly X days from now
      const upcomingTrips = await TravelHistory.find({
        status: 'active',
        arrivalDate: {
          $gte: targetDate,
          $lt: nextDay
        }
      }).populate('creatorId', 'fullName avatar').populate('participants', 'fullName avatar');
      
      if (upcomingTrips.length === 0) {
        continue; // Skip to next reminder day
      }
      
      // console.log(`[Travel reminder] Found ${upcomingTrips.length} trips ${daysBeforeTrip} days away`);
      
      
      // Get Socket.IO instance - notificationUtils will now automatically use global.socketIO if available
      const io = global.socketIO || (global.app && global.app.get('io'));
      
      // Process each trip
      let notificationsCreated = 0;
      for (const trip of upcomingTrips) {
        try {
          
          // Send notification to creator
          await notificationUtils.createTravelReminderNotification(
            trip.creatorId._id,
            daysBeforeTrip,
            trip.destination,
            true, // isCreator = true
            {
              travelId: trip._id,
              destination: trip.destination,
              arrivalDate: trip.arrivalDate
            },
            io // Pass socket.io instance for real-time notification
          );
          notificationsCreated++;
          
          // Send notifications to all participants (excluding creator)
          for (const participant of trip.participants) {
            try {
              // Skip if participant is the creator (to avoid duplicate notification)
              if (participant._id.toString() === trip.creatorId._id.toString()) {
                continue;
              }
              
              await notificationUtils.createTravelReminderNotification(
                participant._id,
                daysBeforeTrip,
                trip.destination,
                false, // isCreator = false (participant)
                {
                  travelId: trip._id,
                  destination: trip.destination,
                  arrivalDate: trip.arrivalDate,
                  creatorId: trip.creatorId._id,
                  creatorName: trip.creatorId.fullName
                },
                io // Pass socket.io instance for real-time notification
              );
              notificationsCreated++;
            } catch (participantError) {
              console.error(`[Travel reminder] Error sending notification to participant ${participant._id}: ${participantError.message}`);
              // Continue with other participants
            }
          }
        } catch (tripError) {
          console.error(`[Travel reminder] Error processing trip ${trip._id}: ${tripError.message}`);
          // Continue with other trips
        }
      }
      
      totalNotificationsCreated += notificationsCreated;
    }

    // Log final summary
    if (totalNotificationsCreated > 0) {
      console.log(`[Travel reminder] Job completed - Created ${totalNotificationsCreated} notifications in total`);
    }
    
    return { 
      success: true, 
      notificationsCreated: totalNotificationsCreated,
      completedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`[Travel reminder] Error in travel reminder job: ${error.message}`);
    console.error(error.stack); // Log stack trace for better debugging
    return { 
      success: false, 
      error: error.message,
      stack: error.stack,
      completedAt: new Date().toISOString()
    };
  }
}

module.exports = travelReminderJob;