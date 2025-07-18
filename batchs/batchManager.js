const { scheduleJobs } = require('./schedulers/scheduler');

/**
 * Batch Manager
 * Initializes and manages batch jobs and schedulers for the system
 */
class BatchManager {
    /**
     * Initializes batch jobs and schedulers
     * Call this function after successfully connecting to the DB
     * @param {Object} [options] - Options for schedulers
     */
  async init(options = {}) {
    console.log('[BatchManager] Initializing batch jobs...');
    try {
      scheduleJobs(options);
      console.log('[BatchManager] Initialized successfully');
    } catch (error) {
      console.error('[BatchManager] Error initializing schedulers:', error);
    }
  }
}

module.exports = new BatchManager();