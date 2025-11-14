const jwt = require("jsonwebtoken");
const crypto = require("crypto");

//Tạo Access Token — token dùng để xác thực mỗi lần gọi API.
const generateAccessToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  });

//Tạo Refresh Token — dùng để tạo Access Token mới khi hết hạn.
const generateRefreshToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  });

//Tạo mã OTP 6 chữ số
const generateVerificationToken = () =>
  String(Math.floor(100000 + Math.random() * 900000));
const generatePasswordResetToken = () => crypto.randomBytes(32).toString("hex");

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateVerificationToken,
  generatePasswordResetToken,
};
