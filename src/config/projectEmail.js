const nodemailer = require("nodemailer");
const { CLIENT_URL, EMAIL_USER, EMAIL_PASSWORD, SMTP_HOST, SMTP_PORT } =
  process.env;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: Number(SMTP_PORT) === 465, // false với port 587
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
});

/**
 * Gửi email mời tham gia project
 * @param {string} toEmail - Email người nhận
 * @param {string} username - Tên người nhận
 * @param {string} inviterName - Tên người gửi lời mời
 * @param {string} projectName - Tên project
 * @param {string} inviteCode - Mã mời
 */
const sendProjectInvitation = async (
  toEmail,
  username,
  inviterName,
  projectName,
  inviteCode
) => {
  const joinUrl = `${CLIENT_URL}/projects/join?code=${inviteCode}`;

  const mailOptions = {
    from: `"LPCP" <${EMAIL_USER}>`,
    to: toEmail,
    subject: `Lời mời tham gia Project: ${projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Lời mời tham gia Project</h2>
        <p>Xin chào <strong>${username}</strong>,</p>
        <p><strong>${inviterName}</strong> đã mời bạn tham gia project <strong>${projectName}</strong>.</p>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Mã tham gia:</strong> <code>${inviteCode}</code></p>
        </div>
        
        <p>Để tham gia project, bạn có thể:</p>
        <ol>
          <li>Click vào nút bên dưới để tham gia trực tiếp</li>
          <li>Hoặc sử dụng mã tham gia trên trang chủ của ứng dụng LPCP</li>
        </ol>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${joinUrl}" style="padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Tham gia Project
          </a>
        </div>
        
        <p style="color: #666; font-size: 12px;">Lưu ý: Lời mời này có thể yêu cầu phê duyệt từ người quản lý project.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Gửi email thông báo khi request tham gia project được phê duyệt
 * @param {string} toEmail - Email người nhận
 * @param {string} username - Tên người nhận
 * @param {string} projectName - Tên project
 * @param {string} approverName - Tên người phê duyệt
 */
const sendJoinRequestApproved = async (
  toEmail,
  username,
  projectName,
  approverName
) => {
  const projectUrl = `${CLIENT_URL}/projects`;

  const mailOptions = {
    from: `"LPCP" <${EMAIL_USER}>`,
    to: toEmail,
    subject: `Yêu cầu tham gia Project ${projectName} đã được chấp nhận`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #22C55E;">Yêu cầu tham gia đã được chấp nhận</h2>
        <p>Xin chào <strong>${username}</strong>,</p>
        <p>Yêu cầu tham gia project <strong>${projectName}</strong> của bạn đã được <strong>${approverName}</strong> chấp nhận.</p>
        <p>Bây giờ bạn là thành viên của project và có thể bắt đầu tham gia ngay.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${projectUrl}" style="padding: 12px 24px; background: #22C55E; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Truy cập Project
          </a>
        </div>
        
        <p>Cảm ơn bạn đã tham gia!</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Gửi email thông báo khi request tham gia project bị từ chối
 * @param {string} toEmail - Email người nhận
 * @param {string} username - Tên người nhận
 * @param {string} projectName - Tên project
 * @param {string} reason - Lý do từ chối (nếu có)
 */
const sendJoinRequestRejected = async (
  toEmail,
  username,
  projectName,
  reason = null
) => {
  const mailOptions = {
    from: `"LPCP" <${EMAIL_USER}>`,
    to: toEmail,
    subject: `Yêu cầu tham gia Project ${projectName} không được chấp nhận`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6B7280;">Yêu cầu tham gia không được chấp nhận</h2>
        <p>Xin chào <strong>${username}</strong>,</p>
        <p>Yêu cầu tham gia project <strong>${projectName}</strong> của bạn đã không được chấp nhận.</p>
        
        ${reason ? `<p><strong>Lý do:</strong> ${reason}</p>` : ""}
        
        <p>Nếu bạn cho rằng đây là sai sót, vui lòng liên hệ với người quản lý project hoặc gửi yêu cầu tham gia lại sau.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Gửi email thông báo cho chủ project khi có người xin tham gia
 * @param {string} toEmail - Email chủ project
 * @param {string} ownerName - Tên chủ project
 * @param {string} requesterName - Tên người yêu cầu
 * @param {string} projectName - Tên project
 */
const sendJoinRequestNotification = async (
  toEmail,
  ownerName,
  requesterName,
  projectName
) => {
  const approvalUrl = `${CLIENT_URL}/projects/manage-members`;

  const mailOptions = {
    from: `"LPCP" <${EMAIL_USER}>`,
    to: toEmail,
    subject: `Yêu cầu tham gia mới cho Project: ${projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Yêu cầu tham gia mới</h2>
        <p>Xin chào <strong>${ownerName}</strong>,</p>
        <p><strong>${requesterName}</strong> đã yêu cầu tham gia project <strong>${projectName}</strong> của bạn.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${approvalUrl}" style="padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Quản lý yêu cầu
          </a>
        </div>
        
        <p>Vui lòng xem xét và phê duyệt yêu cầu này trong hệ thống.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendProjectInvitation,
  sendJoinRequestApproved,
  sendJoinRequestRejected,
  sendJoinRequestNotification,
};
