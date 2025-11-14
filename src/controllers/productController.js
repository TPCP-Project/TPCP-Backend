const advancedRAGService = require("../services/advancedRAGService");
const Product = require("../models/Product");
const ProductChunk = require("../models/ProductChunk");
const csv = require("csv-parser");
const { Readable } = require("stream");
const XLSX = require("xlsx");

class ProductController {
  // Resolve canonical customerId from request: prefer Customer._id mapped from ownerId
  async resolveCustomerId(req) {
    try {
      if (req?.user?._id) {
        const Customer = require("../models/Customer");
        const cust = await Customer.findOne({ ownerId: req.user._id }).select(
          "_id"
        );
        if (cust?._id) return cust._id.toString();
      }
    } catch (_err) {}

    if (req.body?.customerId) return req.body.customerId;
    if (req.query?.customerId) return req.query.customerId;
    return req.user?._id?.toString() || undefined;
  }
  /**
   * Upload products from JSON/CSV
   * POST /api/products/upload
   */
  async uploadProducts(req, res) {
    try {
      const customerId = await this.resolveCustomerId(req);
      const { products, format = "json" } = req.body;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          message: "customerId is required",
        });
      }

      if (!products || !Array.isArray(products) || products.length === 0) {
        return res.status(400).json({
          success: false,
          message: "products array is required and must not be empty",
        });
      }

      console.log(
        `[Product] Uploading ${products.length} products for customer ${customerId}`
      );

      // Validate products
      const validatedProducts = products.map((p) => ({
        name: p.name || p["Tên sản phẩm"] || "Unknown",
        description:
          p.description || p["Thông tin mô tả sản phẩm"] || p["Mô tả"] || "",
        targetAudience: p.targetAudience || p["Đối tượng khách hàng"] || "",
        toneOfVoice: p.toneOfVoice || p["Tone of voice"] || "",
        status: p.status || p["Status"] || "next",
        directUrl: p.directUrl || p["Direct URL"] || "",
        price: parseFloat(p.price || p["Giá"] || 0),
        category: p.category || p["Danh mục"] || "",
        images: p.images || [],
        attributes: p.attributes || {},
      }));

      // Ingest into Advanced RAG system
      const result = await advancedRAGService.ingestCustomerData(
        customerId,
        validatedProducts
      );

      res.status(200).json({
        success: true,
        data: result,
        message: "Products uploaded and processed successfully",
      });
    } catch (error) {
      console.error("[Product] Upload error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Upload products from PDF file
   * POST /api/products/upload-pdf (with multipart/form-data)
   */
  async uploadPDF(req, res) {
    try {
      const customerId = await this.resolveCustomerId(req);

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "PDF file is required",
        });
      }

      console.log(`[Product] Parsing PDF file: ${req.file.originalname}`);

      // Parse PDF
      const pdfParserService = require("../services/pdfParserService");
      const products = await pdfParserService.parsePDF(req.file.buffer);

      if (products.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No products found in PDF",
        });
      }

      console.log(`[Product] Found ${products.length} products in PDF`);

      // Ingest into Advanced RAG system
      const result = await advancedRAGService.ingestCustomerData(
        customerId,
        products
      );

      res.status(200).json({
        success: true,
        data: result,
        products: products, // Return parsed products for verification
      });
    } catch (error) {
      console.error("[Product] PDF upload error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Upload products from CSV file
   * POST /api/products/upload-csv (with multipart/form-data)
   */
  async uploadCSV(req, res) {
    try {
      const customerId = await this.resolveCustomerId(req);

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "CSV file is required",
        });
      }

      const products = [];
      const stream = Readable.from(req.file.buffer.toString());

      stream
        .pipe(csv())
        .on("data", (row) => {
          products.push({
            name: row["Tên sản phẩm"] || row.name,
            description:
              row["Thông tin mô tả sản phẩm"] ||
              row["Mô tả"] ||
              row.description,
            targetAudience: row["Đối tượng khách hàng"] || row.targetAudience,
            toneOfVoice: row["Tone of voice"] || row.toneOfVoice,
            status: row.Status || row.status || "next",
            directUrl: row["Direct URL"] || row.directUrl,
            price: parseFloat(row["Giá"] || row.price || 0),
            category: row["Danh mục"] || row.category,
          });
        })
        .on("end", async () => {
          try {
            const result = await advancedRAGService.ingestCustomerData(
              customerId,
              products
            );
            res.status(200).json({
              success: true,
              data: result,
            });
          } catch (error) {
            res.status(500).json({
              success: false,
              message: error.message,
            });
          }
        });
    } catch (error) {
      console.error("[Product] CSV upload error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Upload products from XLSX file
   * POST /api/products/upload-xlsx (with multipart/form-data)
   */
  async uploadXLSX(req, res) {
    try {
      const customerId = await this.resolveCustomerId(req);

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "XLSX file is required",
        });
      }

      console.log(`[Product] Parsing XLSX file: ${req.file.originalname}`);

      // Parse XLSX file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0]; // Get first sheet
      const worksheet = workbook.Sheets[sheetName];

      // Convert sheet to JSON
      const rows = XLSX.utils.sheet_to_json(worksheet);

      console.log(`[Product] Found ${rows.length} rows in XLSX`);

      // Map rows to products
      const products = rows.map((row) => {
        // Parse price: remove dots/commas and convert to number
        let price = 0;
        if (row["Price"]) {
          const priceStr = String(row["Price"]).replace(/[,.\s]/g, '');
          price = parseInt(priceStr) || 0;
        }

        return {
          name: row["Tên sản phẩm"] || row["name"] || "",
          description: row["Thông tin mô tả sản phẩm"] || row["description"] || "",
          targetAudience: row["Đối tượng khách hàng"] || row["targetAudience"] || "",
          toneOfVoice: row["Tone of voice"] || row["toneOfVoice"] || "",
          status: row["Status"] || row["status"] || "next",
          directUrl: row["Direct URL"] || row["directUrl"] || "",
          price: price,
          category: row["Category"] || row["category"] || "Trang sức",
          images: row["Image"] ? [row["Image"]] : [],
        };
      }).filter(p => p.name); // Filter out rows without name

      console.log(`[Product] Parsed ${products.length} valid products from XLSX`);

      // Log first product for debugging
      if (products.length > 0) {
        console.log(`[Product] Sample product:`, products[0]);
      }

      // Ingest into Advanced RAG system
      const result = await advancedRAGService.ingestCustomerData(
        customerId,
        products
      );

      res.status(200).json({
        success: true,
        data: result,
        products: products, // Return parsed products for verification
      });
    } catch (error) {
      console.error("[Product] XLSX upload error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get all products for a customer
   * GET /api/products
   */
  async getProducts(req, res) {
    try {
      const customerId = await this.resolveCustomerId(req);

      const products = await Product.find({ customerId })
        .sort({ createdAt: -1 })
        .select("-__v");

      res.status(200).json({
        success: true,
        data: products,
        count: products.length,
      });
    } catch (error) {
      console.error("[Product] Get error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get product by ID
   * GET /api/products/:id
   */
  async getProductById(req, res) {
    try {
      const { id } = req.params;
      const customerId = await this.resolveCustomerId(req);

      const product = await Product.findOne({ _id: id, customerId });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      console.error("[Product] Get by ID error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Delete product
   * DELETE /api/products/:id
   */
  async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      const customerId = await this.resolveCustomerId(req);

      // Delete product
      const product = await Product.findOneAndDelete({ _id: id, customerId });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Delete associated chunks
      await ProductChunk.deleteMany({ productId: id });

      res.status(200).json({
        success: true,
        message: "Product deleted successfully",
      });
    } catch (error) {
      console.error("[Product] Delete error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Delete all products for customer
   * DELETE /api/products/all
   */
  async deleteAllProducts(req, res) {
    try {
      const customerId = await this.resolveCustomerId(req);

      if (!customerId) {
        return res.status(400).json({
          success: false,
          message: "Customer ID not found",
        });
      }

      const result = await advancedRAGService.deleteCustomerData(customerId);

      res.status(200).json({
        success: true,
        data: result,
        message: "All products deleted successfully",
      });
    } catch (error) {
      console.error("[Product] Delete all error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get statistics
   * GET /api/products/stats
   */
  async getStats(req, res) {
    try {
      const customerId = await this.resolveCustomerId(req);

      const productCount = await Product.countDocuments({ customerId });
      const chunkCount = await ProductChunk.countDocuments({ customerId });

      const categories = await Product.aggregate([
        {
          $match: {
            customerId: new (require("mongoose").Types.ObjectId)(customerId),
          },
        },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      res.status(200).json({
        success: true,
        data: {
          totalProducts: productCount,
          totalChunks: chunkCount,
          categories: categories.map((c) => ({
            category: c._id,
            count: c.count,
          })),
        },
      });
    } catch (error) {
      console.error("[Product] Stats error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Migrate all products and chunks from one customer to another
   * POST /api/products/migrate-customer
   * Body: { fromCustomerId, toCustomerId }
   */
  async migrateCustomer(req, res) {
    try {
      const { fromCustomerId, toCustomerId } = req.body;
      if (!fromCustomerId || !toCustomerId) {
        return res.status(400).json({
          success: false,
          message: "fromCustomerId and toCustomerId are required",
        });
      }

      const Product = require("../models/Product");
      const ProductChunk = require("../models/ProductChunk");

      const prodResult = await Product.updateMany(
        { customerId: fromCustomerId },
        { $set: { customerId: toCustomerId } }
      );
      const chunkResult = await ProductChunk.updateMany(
        { customerId: fromCustomerId },
        { $set: { customerId: toCustomerId } }
      );

      return res.json({
        success: true,
        data: {
          productsModified: prodResult.modifiedCount || prodResult.nModified,
          chunksModified: chunkResult.modifiedCount || chunkResult.nModified,
        },
      });
    } catch (error) {
      console.error("[Product] Migrate error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new ProductController();
