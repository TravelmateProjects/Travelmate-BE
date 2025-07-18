const cron = require('node-cron');
const travelReminderJob = require('../jobs/travelReminderJob');
const renewVipAccountReminderJob = require('../jobs/RenewVipAccountReminderJob');

/**
 * Schedule all batch jobs
 * @param {Object} options - Scheduler options
 * @param {boolean} options.enableTravelReminders - Enable travel reminder job
 * @param {boolean} options.enableVipReminders - Enable VIP account reminder job
 */
function scheduleJobs(options = { enableTravelReminders: true, enableVipReminders: true }) {
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
  
  // Add other scheduled jobs here
}

module.exports = { scheduleJobs };