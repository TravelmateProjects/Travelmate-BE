const cron = require('node-cron');
const travelReminderJob = require('../jobs/travelReminderJob');

/**
 * Schedule all batch jobs
 * @param {Object} options - Scheduler options
 * @param {boolean} options.enableTravelReminders - Enable travel reminder job
 */
function scheduleJobs(options = { enableTravelReminders: true }) {
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
      console.error('Failed to initialize cron job');
    }
  }
  
  // Add other scheduled jobs here
}

module.exports = { scheduleJobs };