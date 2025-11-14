const AuthService = require("../services/authservice");
const {
  registerValidation,
  loginValidation,
  changePasswordValidation,
} = require("../validation/auth");

class AuthController {
  
  // * POST /auth/register
  //* Đăng ký + gửi email 6 số
   
  async register(req, res) {
    try {
      /*Validate
      */
      const { error } = registerValidation(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message,
        });
      }

      const user = await AuthService.register(req.body);

      res.status(201).json({
        success: true,
        message:
          "Đăng ký thành công! Vui lòng kiểm tra email và nhập mã xác thực 6 số.",
        data: {
          user,
          note: "Mã xác thực có hiệu lực trong 24 giờ",
        },
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // POST /auth/login
  //Chỉ cho phép login nếu đã xác thực
  
  async login(req, res) {
    try {
      /* Validate */
      const { error } = loginValidation(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message,
        });
      }

      const { email, password } = req.body;
      const result = await AuthService.login(email, password);

      res.json({
        success: true,
        message: "Đăng nhập thành công",
        data: result,
      });
    } catch (error) {
      console.error("Login error:", error);

      /* Trả về status code phù hợp */
      let statusCode = 400;
      if (error.message.includes("chưa được xác thực")) {
        statusCode = 403; // Forbidden
      } else if (error.message.includes("bị khóa")) {
        statusCode = 403; // Forbidden
      }

      res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    }
  }

  //POST /auth/verify-signup
  //Xác thực mã 6 số: { email, code }
  async verifySignup(req, res) {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({
          success: false,
          message: "Email và mã xác thực là bắt buộc",
        });
      }

      const result = await AuthService.verifySignup(email, code);

      res.json({
        success: true,
        message: result.message,
        data: result.user,
      });
    } catch (error) {
      console.error("Verify signup error:", error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

   //POST /auth/resend-verification
   //Gửi lại mã 6 số
  async resendVerificationEmail(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email là bắt buộc",
        });
      }

      const result = await AuthService.resendVerificationEmail(email);

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  
   //POST /auth/change-password
   //Đổi mật khẩu (cần authenticate)
  async changePassword(req, res) {
    try {
      const { error } = changePasswordValidation(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message,
        });
      }

      const { currentPassword, newPassword } = req.body;
      const result = await AuthService.changePassword(
        req.user._id,
        currentPassword,
        newPassword
      );

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  //POST /auth/logout
  async logout(req, res) {
    res.json({
      success: true,
      message: "Đăng xuất thành công",
    });
  }
}

module.exports = new AuthController();
