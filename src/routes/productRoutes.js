const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const c = productController; // bind instance methods to keep `this`
const { authenticateToken } = require("../middlewares/auth");
const { requireProSubscription } = require("../middlewares/subscription");
const multer = require("multer");

// Setup multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "text/csv",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel"
    ];
    const allowedExtensions = [".csv", ".pdf", ".xlsx", ".xls"];

    const isValidType = allowedTypes.includes(file.mimetype);
    const isValidExt = allowedExtensions.some((ext) =>
      file.originalname.endsWith(ext)
    );

    if (isValidType || isValidExt) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV, PDF, and XLSX files are allowed"));
    }
  },
});

// Upload products (JSON) - Yêu cầu Pro subscription
router.post(
  "/upload",
  authenticateToken,
  requireProSubscription,
  c.uploadProducts.bind(c)
);

// Upload products (PDF file) - Yêu cầu Pro subscription
router.post(
  "/upload-pdf",
  authenticateToken,
  requireProSubscription,
  upload.single("file"),
  c.uploadPDF.bind(c)
);

// Upload products (CSV file) - Yêu cầu Pro subscription
router.post(
  "/upload-csv",
  authenticateToken,
  requireProSubscription,
  upload.single("file"),
  c.uploadCSV.bind(c)
);

// Upload products (XLSX file) - Yêu cầu Pro subscription
router.post(
  "/upload-xlsx",
  authenticateToken,
  requireProSubscription,
  upload.single("file"),
  c.uploadXLSX.bind(c)
);

// Get all products - Yêu cầu Pro subscription
router.get(
  "/",
  authenticateToken,
  requireProSubscription,
  c.getProducts.bind(c)
);

// Get product statistics - Yêu cầu Pro subscription
router.get(
  "/stats",
  authenticateToken,
  requireProSubscription,
  c.getStats.bind(c)
);

// Get product by ID - Yêu cầu Pro subscription
router.get(
  "/:id",
  authenticateToken,
  requireProSubscription,
  c.getProductById.bind(c)
);

// Delete product by ID - Yêu cầu Pro subscription
router.delete(
  "/:id",
  authenticateToken,
  requireProSubscription,
  c.deleteProduct.bind(c)
);

// Delete all products - Yêu cầu Pro subscription
router.delete(
  "/",
  authenticateToken,
  requireProSubscription,
  c.deleteAllProducts.bind(c)
);

// Migrate data between customers (admin/dev tool)
router.post(
  "/migrate-customer",
  authenticateToken,
  requireProSubscription,
  c.migrateCustomer.bind(c)
);

module.exports = router;
