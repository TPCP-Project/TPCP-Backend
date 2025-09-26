require("dotenv/config");

// Imports
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const connectDB = require("./src/config/database");
const authRoutes = require("./src/routes/auth");
const projectInvitationRoutes = require("./src/routes/projectInvitationRoutes");
const { setupCronJobs } = require("./src/config/cronJobs");

const app = express();

// === CẤU HÌNH MIDDLEWARES ===

// 1. Cấu hình CORS một cách an toàn
const allowlist = [
  process.env.CLIENT_URL, // ví dụ: http://localhost:5173
  "http://127.0.0.1:5173",
  "http://localhost:3000",
].filter(Boolean); // Lọc ra các giá trị undefined/null nếu có

const corsOptions = {
  origin: function (origin, callback) {
    // Cho phép các request không có origin (ví dụ: Postman, mobile apps)
    if (!origin || allowlist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Cho phép gửi cookie
};

// Sử dụng CORS với cấu hình đã định nghĩa
app.use(cors(corsOptions));

// 2. Middleware để parse JSON body
app.use(express.json({ limit: "10mb" }));

// 3. Rate Limiting để chống tấn công brute-force
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // Giới hạn mỗi IP 100 request trong 15 phút
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again after 15 minutes",
});
app.use(limiter);

// === KHAI BÁO ROUTES ===
app.use("/auth", authRoutes);
app.use("/api", projectInvitationRoutes); // Thêm routes mới

app.get("/health", (_req, res) =>
  res.json({ ok: true, message: "Server is healthy" })
);

// === MIDDLEWARE XỬ LÝ LỖI TOÀN CỤC ===
// Middleware này phải được đặt ở cuối cùng
app.use((err, req, res, next) => {
  console.error(err.stack); // Log lỗi ra console để debug

  // Trả về một lỗi chung chung cho client để không lộ chi tiết
  res.status(500).json({
    success: false,
    message: "Something went wrong on the server!",
  });
});

// === KHỞI ĐỘNG SERVER ===
async function main() {
  await connectDB();

  // Khởi tạo các cronjob
  setupCronJobs();

  const port = process.env.PORT || 4000;
  app.listen(port, () => console.log(`🚀 API listening on port: ${port}`));
}

if (process.env.NODE_ENV !== "test") {
  main().catch((err) => {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  });
}

module.exports = app; // Export app cho testing
