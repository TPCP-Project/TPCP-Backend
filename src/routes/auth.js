const express = require("express");
const router = express.Router();

const AuthController = require("../controllers/authcontroller");
const { authenticateToken } = require("../middlewares/auth");

/* Public */
router.post("/register", AuthController.register); /* tạo user(status='inactive') + gửi OTP 6 số */
router.post("/login", AuthController.login); /* login: chặn nếu status='inactive' */
router.post("/verify-signup", AuthController.verifySignup); /* xác thực OTP:{ email, code } */
router.post("/resend-verification", AuthController.resendVerificationEmail); /* gửi lại OTP(rate-limit) */
/* Protected */
router.post(
  "/change-password",
  authenticateToken,
  AuthController.changePassword
);
router.post("/logout", authenticateToken, AuthController.logout);

module.exports = router;
