const bcrypt = require("bcryptjs");
const User = require("../models/user");
const {
  generateAccessToken,
  generateVerificationToken,
  generatePasswordResetToken,
} = require("../utils/token");
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} = require("../config/email");

class AuthService {
  async register(userData) {
    if (!userData || Object.keys(userData).length === 0) {
      throw new Error("Payload đăng ký rỗng hoặc không hợp lệ");
    }
    const { name, username, email, password, role } = userData;

    /* Check trùng email */
    const existedEmail = await User.findOne({ email: email.toLowerCase() });
    if (existedEmail) {
      throw new Error("Email đã được sử dụng");
    }

    /* Check trùng username */
    const existedUsername = await User.findOne({ username });
    if (existedUsername) {
      throw new Error("Username đã được sử dụng");
    }

    /* Hash password */
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    /* Tạo mã xác thực 6 số */
    const verificationToken = generateVerificationToken(); // 6 số
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    /* Tạo user với trạng thái chưa xác thực */
    const newUser = await User.create({
      name,
      username,
      email: email.toLowerCase().trim(),
      passwordHash,
      role: role || "employee",
      isVerified: false, /* Chưa xác thực */
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    });

    /* GỬI EMAIL XÁC THỰC NGAY */
    try {
      await sendVerificationEmail(email, verificationToken, username);
      console.log(
        `✅ Sent verification email to ${email} with code: ${verificationToken}`
      );
    } catch (emailError) {
      console.error("❌ Failed to send verification email:", emailError);
      /* Xóa user nếu không gửi được email */
      await User.findByIdAndDelete(newUser._id);
      throw new Error("Không thể gửi email xác thực. Vui lòng thử lại.");
    }

    const userResponse = newUser.toObject();
    delete userResponse.passwordHash;
    delete userResponse.emailVerificationToken;

    return userResponse;
  }

  async login(email, password) {
    const user = await User.findOne({
      email: email.toLowerCase(),
    }).select("+passwordHash");

    if (!user) {
      throw new Error("Email hoặc mật khẩu không đúng");
    }

    /* KIỂM TRA XÁC THỰC EMAIL */
    if (!user.isVerified) {
      throw new Error(
        "Tài khoản chưa được xác thực. Vui lòng kiểm tra email và nhập mã xác thực."
      );
    }

    /* KIỂM TRA BAN */
    if (user.isBanned) {
      throw new Error(
        "Tài khoản đã bị khóa. Liên hệ admin để biết thêm chi tiết."
      );
    }

    /* Kiểm tra password */
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error("Email hoặc mật khẩu không đúng");
    }

    /* Tạo access token */
    const accessToken = generateAccessToken(user._id);

    const userResponse = user.toJSON();
    delete userResponse.passwordHash;

    return {
      user: userResponse,
      accessToken,
    };
  }
  async verifySignup(email, code) {
    const user = await User.findOne({
      email: email.toLowerCase(),
      emailVerificationToken: code,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new Error("Mã xác thực không hợp lệ hoặc đã hết hạn");
    }

    /* XÁC THỰC THÀNH CÔNG */
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    /* Gửi email chào mừng */
    try {
      await sendWelcomeEmail(user.email, user.username);
      console.log(`✅ Sent welcome email to ${user.email}`);
    } catch (emailError) {
      console.error("❌ Failed to send welcome email:", emailError);
    }

    return {
      message: "Xác thực thành công! Bạn có thể đăng nhập ngay bây giờ.",
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        isVerified: user.isVerified,
      },
    };
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select("+passwordHash");

    if (!user) {
      throw new Error("Không tìm thấy tài khoản");
    }

    if (!user.isVerified) {
      throw new Error("Tài khoản chưa được xác thực");
    }

    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );
    if (!isValidPassword) {
      throw new Error("Mật khẩu hiện tại không đúng");
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    user.passwordHash = await bcrypt.hash(newPassword, saltRounds);
    await user.save();

    return { message: "Mật khẩu đã được thay đổi thành công" };
  }

  async verifyEmail(token) {
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new Error("Token xác thực không hợp lệ hoặc đã hết hạn");
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await user.save();

    /* Gửi email chào mừng */
    await sendWelcomeEmail(user.email, user.username);

    return { message: "Email đã được xác thực thành công" };
  }

  async resendVerificationEmail(email) {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      throw new Error("Không tìm thấy tài khoản với email này");
    }

    if (user.isVerified) {
      throw new Error("Tài khoản đã được xác thực");
    }

    /* Tạo mã mới */
    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpires;
    await user.save();

    /* Gửi email */
    await sendVerificationEmail(email, verificationToken, user.username);
    console.log(
      `✅ Resent verification email to ${email} with code: ${verificationToken}`
    );

    return {
      message: "Mã xác thực mới đã được gửi đến email của bạn",
    };
  }

  async forgotPassword(email) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("Không tìm thấy user với email này");
    }

    /* Tạo reset token */
    const resetToken = generatePasswordResetToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 giờ

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetExpires;

    await user.save();

    /* Gửi email reset password */
    await sendPasswordResetEmail(email, resetToken, user.username);

    return { message: "Email đặt lại mật khẩu đã được gửi" };
  }

  async resetPassword(token, newPassword) {
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new Error("Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn");
    }

    /* Mã hóa mật khẩu mới */
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    user.passwordHash = passwordHash;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    return { message: "Mật khẩu đã được đặt lại thành công" };
  }
}

module.exports = new AuthService();
