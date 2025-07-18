require('dotenv').config();
const mongoose = require('mongoose');
const Account = require('../../models/Account');
const notificationUtils = require('../../utils/notificationUtils');

/**
 * Renew VIP Account Reminder Job
 * - Sends reminders at 3 and 1 days before account expiration
 * - Resets proInfo status if account has expired
 */
async function renewVipAccountReminderJob() {
  try {
    console.log('[VIP Reminder] Starting job - ' + new Date().toISOString());
    
    // Start of today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check for accounts expiring in 3 and 1 days
    const reminderDays = [3, 1];
    let totalNotificationsCreated = 0;
    let totalAccountsReset = 0;

    // Get Socket.IO instance
    const io = global.socketIO || (global.app && global.app.get('io'));
    
    // Process reminder notifications
    for (const daysBeforeExpiration of reminderDays) {
      // Calculate target date
      const targetDate = new Date();
      targetDate.setDate(today.getDate() + daysBeforeExpiration);
      
      // Set to start of day
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(targetDate.getDate() + 1);
      
      // Find accounts expiring on the target date
      const expiringAccounts = await Account.find({
        'proInfo.isPro': true,
        'proInfo.expireAt': {
          $gte: targetDate,
          $lt: nextDay
        }
      }).populate('userId', 'fullName email');
      
      if (expiringAccounts.length === 0) {
        continue; // Skip to next reminder day
      }
      
      console.log(`[VIP Reminder] Found ${expiringAccounts.length} accounts expiring in ${daysBeforeExpiration} days`);
      
      // Process each expiring account
      for (const account of expiringAccounts) {
        try {
          // Skip if userId is not properly populated
          if (!account.userId || !account.userId._id) {
            console.error(`[VIP Reminder] Account ${account._id} has invalid user reference`);
            continue;
          }
          
          // Send VIP renewal reminder notification
          await notificationUtils.createVipAccountRenewReminderNotification(
            account.userId._id,
            daysBeforeExpiration,
            account.proInfo.plan,
            {
              expirationDate: account.proInfo.expireAt,
              accountId: account._id.toString(),
              activatedAt: account.proInfo.activatedAt
            },
            io
          );
          
          totalNotificationsCreated++;
        } catch (accountError) {
          console.error(`[VIP Reminder] Error sending notification to user ${account.userId?._id || 'unknown'}: ${accountError.message}`);
        }
      }
    }

    // Find and reset expired accounts
    const expiredAccounts = await Account.find({
      'proInfo.isPro': true,
      'proInfo.expireAt': { $lt: today }
    }).populate('userId', 'fullName email');
    
    if (expiredAccounts.length > 0) {
      console.log(`[VIP Reminder] Found ${expiredAccounts.length} expired accounts to reset`);
    }
    
    for (const account of expiredAccounts) {
      try {
        // Skip if userId is not properly populated
        if (!account.userId || !account.userId._id) {
          console.error(`[VIP Reminder] Account ${account._id} has invalid user reference`);
          continue;
        }
        
        // Store previous plan before resetting for notification
        const previousPlan = account.proInfo.plan;
        const expireDate = new Date(account.proInfo.expireAt);
        const activatedAt = account.proInfo.activatedAt;
        
        // Reset proInfo using direct MongoDB update to ensure it's applied
        const updateResult = await Account.updateOne(
          { _id: account._id },
          { 
            $set: {
              'proInfo.isPro': false,
              'proInfo.plan': null,
              'proInfo.expireAt': null,
              'proInfo.activatedAt': null
            } 
          },
          { new: true }
        );
        
        if (updateResult.modifiedCount === 1) {
          console.log(`[VIP Reminder] Successfully reset proInfo for account ${account._id}`);
          
          // Double-check that the account was actually updated
          const updatedAccount = await Account.findById(account._id);
          if (updatedAccount && updatedAccount.proInfo && updatedAccount.proInfo.isPro === false) {
            console.log(`[VIP Reminder] Verified reset of proInfo for account ${account._id}`);
            totalAccountsReset++;
            
            console.log(`[VIP Reminder] Reset expired VIP status for user ${account.userId._id}`);
            
            // Only send notification if reset was successful
            // Send expiration notification using the new method with daysRemaining = 0 for expired
            await notificationUtils.createVipAccountRenewReminderNotification(
              account.userId._id,
              0, // 0 days means it's already expired
              previousPlan,
              {
                expirationDate: expireDate,
                accountId: account._id.toString(),
                activatedAt: activatedAt
              },
              io
            );
            
            totalNotificationsCreated++;
          } else {
            console.error(`[VIP Reminder] Failed to verify reset of proInfo for account ${account._id}`);
          }
        } else {
          console.error(`[VIP Reminder] Failed to reset proInfo for account ${account._id}`);
        }
      } catch (resetError) {
        console.error(`[VIP Reminder] Error resetting account ${account._id}: ${resetError.message}`);
      }
    }

    // Log final summary
    if (totalNotificationsCreated > 0 || totalAccountsReset > 0) {
      console.log(`[VIP Reminder] Job completed - Created ${totalNotificationsCreated} notifications, Reset ${totalAccountsReset} expired accounts`);
    } else {
      console.log(`[VIP Reminder] Job completed - No accounts needed processing`);
    }
    
    return { 
      success: true, 
      summary: {
        notificationsCreated: totalNotificationsCreated,
        accountsReset: totalAccountsReset,
        remindersSent: totalNotificationsCreated - totalAccountsReset, // Regular reminders
        expirationNotices: totalAccountsReset // Expiration notices
      },
      completedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`[VIP Reminder] Error in VIP reminder job: ${error.message}`);
    console.error(error.stack);
    return { 
      success: false, 
      error: error.message,
      stack: error.stack,
      completedAt: new Date().toISOString()
    };
  }
}

module.exports = renewVipAccountReminderJob;