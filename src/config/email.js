const nodemailer = require("nodemailer");
const { CLIENT_URL, EMAIL_USER, EMAIL_PASSWORD, SMTP_HOST, SMTP_PORT } =
  process.env;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: Number(SMTP_PORT) === 465, //false với port là 587
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
});

async function sendVerificationEmail(toEmail, token, username) {
  const verifyUrl = `${CLIENT_URL}/verify-signup?email=${encodeURIComponent(
    toEmail
  )}&code=${token}`;

  const mailOptions = {
    from: `"LPCP" <${EMAIL_USER}>`,
    to: toEmail,
    subject: "Mã xác thực tài khoản LPCP",
    text: `Chào ${username},\n\nMã xác thực của bạn là: ${token}\n\nHoặc bạn có thể click vào đây để xác thực tự động:\n${verifyUrl}`,
    html: `
            <p>Chào <strong>${username}</strong>,</p>
            <p><strong>Mã xác thực của bạn là :</strong> <code>${token}</code></p>
            <p>Nếu muốn xác thực nhanh, bạn có thể click vào nút bên dưới :</p>
            <p><a href="${verifyUrl}" style="padding:8px 16px;background:#4F46E5;color:white;text-decoration:none;border-radius:4px">Xác thực tài khoản</a></p>
            <p>Nếu link bị lỗi , copy đường dẫn này vào trình duyệt :</p>
            <p>${verifyUrl}</p>
        `,
  };

  await transporter.sendMail(mailOptions);
}

const sendPasswordResetEmail = async (email, resetToken, username) => {
  const resetUrl = `${CLIENT_URL}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: `"LPCP" <${EMAIL_USER}>`,
    to: email,
    subject: "Đặt lại mật khẩu",
    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Xin chào ${username}!</h2>
                <p>Bạn đã yêu cầu đặt lại mật khẩu. Click vào link bên dưới để tạo mật khẩu mới:</p>
                <a href="${resetUrl}" 
                   style="background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">
                   Đặt lại mật khẩu
                </a>
                <p>Hoặc copy link này vào trình duyệt:</p>
                <p style="word-break: break-all;">${resetUrl}</p>
                <p>Link này sẽ hết hạn sau 1 giờ .</p>
                <hr>
                <p style="color: #666; font-size: 12px;">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
            </div>
        `,
  };

  await transporter.sendMail(mailOptions);
};

const sendWelcomeEmail = async (email, username) => {
  const mailOptions = {
    from: `"LPCP" <${EMAIL_USER}>`,
    to: email,
    subject: "Chào mừng bạn đến với LPCP!",
    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #28a745;">Chào mừng ${username}!</h2>
                <p>Tài khoản của bạn đã được xác thực thành công !</p>
                <p>Bạn có thể bắt đầu sử dụng tất cả các tính năng của hệ thống.</p>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="color: #333;">Thông tin tài khoản:</h3>
                    <p><strong>Tên đăng nhập:</strong> ${username}</p>
                    <p><strong>Email :</strong> ${email}</p>
                    <p><strong>Cấp độ :</strong> 1 (Bronze)</p>
                    <p><strong>Điểm số :</strong> 0</p>
                </div>
                <p>Cảm ơn bạn đã tham gia cộng đồng của chúng tôi!</p>
            </div>
        `,
  };

  await transporter.sendMail(mailOptions);
};

const sendAccountBannedEmail = async (email, username, reason = null) => {
  const mailOptions = {
    from: `"LaunchPad" <${EMAIL_USER}>`,
    to: email,
    subject: "⚠️ Thông báo khóa tài khoản - LPCP",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #dc3545;">⚠️ Tài khoản đã bị khóa</h1>
        <p>Xin chào <strong>${username}</strong>,</p>
        <p>Tài khoản của bạn đã bị khóa do vi phạm chính sách hệ thống.</p>
        ${reason ? `<p><strong>Lý do:</strong> ${reason}</p>` : ""}
        <p>Liên hệ admin nếu có thắc mắc: <a href="mailto:${EMAIL_USER}">${EMAIL_USER}</a></p>
        <p>Trân trọng,<br><em>Đội ngũ LPCP</em></p>
      </div>
    `,
  };
  await transporter.sendMail(mailOptions);
};
module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,

  sendAccountBannedEmail,
};
