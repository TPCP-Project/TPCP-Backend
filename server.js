require("dotenv/config");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const connectDB = require("./src/config/database");
const authRoutes = require("./src/routes/auth");

const app = express();

// Security middlewares
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Routes
app.use("/auth", authRoutes);
app.get("/health", (_req, res) => res.json({ ok: true }));

async function main() {
  await connectDB();
  const port = process.env.PORT || 4000;
  app.listen(port, () => console.log(`API listening on :${port}`));
}

if (process.env.NODE_ENV !== "test") {
  main().catch((err) => {
    console.error("Failed to start:", err);
    process.exit(1);
  });
}
