const express = require("express");
const router = express.Router();
const customerController = require("../controllers/customerController");
const { authenticateToken } = require("../middlewares/auth");

// Create customer
router.post(
  "/customers",
  // authenticateToken,
  customerController.create
);

module.exports = router;
