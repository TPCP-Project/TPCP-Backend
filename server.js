require("dotenv/config");

// Imports
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const connectDB = require("./src/config/database");
const authRoutes = require("./src/routes/auth");
const projectRoutes = require("./src/routes/projectRoutes");
const projectInvitationRoutes = require("./src/routes/projectInvitationRoutes");
const profileRoutes = require("./src/routes/profileRoutes");
const productRoutes = require("./src/routes/productRoutes");
const chatbotRoutes = require("./src/routes/chatbotRoutes");
const customerRoutes = require("./src/routes/customerRoutes");
const chatRoutes = require("./src/routes/chatRoutes");

const taskRoutes = require("./src/routes/taskRoutes");
const kpiRoutes = require('./src/routes/kpiRoutes');

const facebookRoutes = require("./src/routes/facebookRoutes");
const subscriptionRoutes = require("./src/routes/subscriptionRoutes");

const { setupCronJobs } = require("./src/config/cronJobs");
const SocketManager = require("./src/config/socket");


const app = express();

// === CẤU HÌNH MIDDLEWARES ===

// 1. Cấu hình CORS một cách an toàn
// Trust only safe proxy ranges to satisfy express-rate-limit without being permissive
app.set("trust proxy", ["loopback", "linklocal", "uniquelocal"]);
const allowlist = [
  process.env.CLIENT_URL, // ví dụ: http://localhost:5173
  "http://127.0.0.1:5173",
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
app.use("/api", projectRoutes); // Routes quản lý project
app.use("/api", projectInvitationRoutes); // Routes invitation
app.use("/api", profileRoutes); // Routes quản lý profile
app.use("/api", chatRoutes); // Routes chat

app.use("/api", taskRoutes); // Routes quản lý task
app.use('/api/kpi', kpiRoutes); // Routes quản lý KPI


app.use("/api/products", productRoutes); // Routes products
app.use("/api/chatbot", chatbotRoutes); // Routes chatbot
app.use("/api", customerRoutes); // Routes customers
app.use("/api", facebookRoutes); // Facebook manual connect + webhook
app.use("/api/subscription", subscriptionRoutes); // Subscription & payment routes


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
  const server = app.listen(port, () =>
    console.log(`🚀 API listening on port: ${port}`)
  );

  // Khởi tạo Socket.IO
  const { Server } = require("socket.io");
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  // Khởi tạo Socket Manager
  global.socketManager = new SocketManager(io);

  console.log(`🔌 Socket.IO server running on port: ${port}`);
}

if (process.env.NODE_ENV !== "test") {
  main().catch((err) => {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  });
}

module.exports = app; // Export app cho testing
