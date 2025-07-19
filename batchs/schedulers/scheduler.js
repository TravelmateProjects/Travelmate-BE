const cron = require('node-cron');
const travelReminderJob = require('../jobs/travelReminderJob');
const renewVipAccountReminderJob = require('../jobs/RenewVipAccountReminderJob');
const travelUpdateStatusReminderJob = require('../jobs/TravelUpdateStatusReminderJob');

/**
 * Schedule all batch jobs
 * @param {Object} options - Scheduler options
 * @param {boolean} options.enableTravelReminders - Enable travel reminder job
 * @param {boolean} options.enableVipReminders - Enable VIP account reminder job
 * @param {boolean} options.enableTravelStatusUpdates - Enable travel status update job
 */
function scheduleJobs(options = { enableTravelReminders: true, enableVipReminders: true, enableTravelStatusUpdates: true }) {
  // Schedule travel reminder job to run every day at 19:00
  if (options.enableTravelReminders) {
    console.log('Setting up travel reminder cron job: every day at 19:00');
    const job = cron.schedule('0 19 * * *', async () => {
      try {
          await travelReminderJob();
      } catch (error) {
        console.error('Error in travel reminder job:', error);
      }
    }, {
      timezone: 'Asia/Ho_Chi_Minh',
      scheduled: true
    });
    
    if (!job) {
      console.error('Failed to initialize travel reminder cron job');
    }
  }
  
  // Schedule VIP account reminder job to run every day at 10:00
  if (options.enableVipReminders) {
    console.log('Setting up VIP account reminder cron job: every day at 10:00');
    const vipJob = cron.schedule('0 10 * * *', async () => {
      try {
          await renewVipAccountReminderJob();
      } catch (error) {
        console.error('Error in VIP account reminder job:', error);
      }
    }, {
      timezone: 'Asia/Ho_Chi_Minh',
      scheduled: true
    });
    
    if (!vipJob) {
      console.error('Failed to initialize VIP account reminder cron job');
    }
  }
  
  // Schedule travel status update job to run every day at 00:01
  if (options.enableTravelStatusUpdates) {
    console.log('Setting up travel status update cron job: every day at 00:01');
    const statusUpdateJob = cron.schedule('1 0 * * *', async () => {
      try {
          await travelUpdateStatusReminderJob();
      } catch (error) {
        console.error('Error in travel status update job:', error);
      }
    }, {
      timezone: 'Asia/Ho_Chi_Minh',
      scheduled: true
    });
    
    if (!statusUpdateJob) {
      console.error('Failed to initialize travel status update cron job');
    }
  }
}

module.exports = { scheduleJobs };