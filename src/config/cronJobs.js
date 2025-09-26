const cron = require("node-cron");
const ProjectInvitationService = require("../services/ProjectInvitationService");

/**
 * Thiết lập các cronjob cho ứng dụng
 */
function setupCronJobs() {
  // Cronjob để xóa các yêu cầu tham gia đã quá hạn mỗi ngày lúc 0:00
  cron.schedule("0 0 * * *", async () => {
    console.log("Running job: Cleanup expired join requests");
    try {
      const result = await ProjectInvitationService.cleanupExpiredRequests();
      console.log(`Job completed: ${result.message}`);
    } catch (error) {
      console.error("Error in cleanup job:", error.message);
    }
  });

  console.log("Cron jobs initialized");
}

module.exports = { setupCronJobs };
