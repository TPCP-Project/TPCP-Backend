// Use dynamic import to load ESM-only pdf-parse in CommonJS context
// Avoid top-level require which triggers ERR_REQUIRE_ESM
async function parsePdfBuffer(pdfBuffer) {
  const mod = await import("pdf-parse");
  // Prefer the class export for current versions
  const PDFParse =
    (mod && mod.PDFParse) ||
    (mod && mod.default && mod.default.PDFParse) ||
    null;

  if (PDFParse) {
    const parser = new PDFParse({ data: pdfBuffer });
    const textResult = await parser.getText();
    return { text: textResult.text || "" };
  }

  // Fallback: some builds expose a default function(pdfBuffer)
  const pdfFn =
    (mod && mod.default && typeof mod.default === "function" && mod.default) ||
    (typeof mod === "function" ? mod : null);

  if (!pdfFn) {
    throw new TypeError(
      "Unable to locate PDFParse class or parser function in pdf-parse module"
    );
  }

  return pdfFn(pdfBuffer);
}

class PDFParserService {
  /**
   * Parse PDF file to extract product data
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @returns {Promise<Array>} Array of products
   */
  async parsePDF(pdfBuffer) {
    try {
      console.log("[PDF Parser] Starting PDF parsing...");

      const data = await parsePdfBuffer(pdfBuffer);
      const text = data.text;

      console.log(`[PDF Parser] Extracted ${text.length} characters from PDF`);

      // Parse products from text
      const products = this.extractProducts(text);

      console.log(`[PDF Parser] Found ${products.length} products`);

      return products;
    } catch (error) {
      console.error("[PDF Parser] Error:", error);
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  }

  /**
   * Extract products from PDF text
   * This is a custom parser for your specific PDF format
   */
  extractProducts(text) {
    const products = [];

    // Log raw text to debug
    console.log("[PDF Parser] === RAW TEXT SAMPLE (first 500 chars) ===");
    console.log(text.substring(0, 500));
    console.log("[PDF Parser] === END RAW TEXT SAMPLE ===");

    // Split by product entries (customize based on your PDF structure)
    const lines = text.split("\n").filter((line) => line.trim());

    let currentProduct = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Debug: Log all lines for products without price
      if (currentProduct && !currentProduct.price && i > currentProduct._debugLineNumber && i < currentProduct._debugLineNumber + 20) {
        console.log(`[PDF Parser] 🔍 Line ${i}: "${line}"`);
      }

      // Detect product name (starts with "Dây Chuyền" or "Vòng")
      if (line.match(/^(Dây Chuyền|Vòng|Nhẫn)/)) {
        if (currentProduct) {
          console.log(`[PDF Parser] Completed product: ${currentProduct.name}, Price: ${currentProduct.price}`);
          products.push(currentProduct);
        }

        currentProduct = {
          name: line,
          description: "",
          targetAudience: "",
          toneOfVoice: "",
          status: "next",
          directUrl: "",
          price: 0,
          category: this.detectCategory(line),
          images: [],
          attributes: {},
          // Track which line we're on for debugging
          _debugLineNumber: i,
        };
        console.log(`[PDF Parser] Started new product at line ${i}: ${line}`);
      }

      // Extract description (bullet points)
      else if (line.startsWith("•")) {
        if (currentProduct) {
          currentProduct.description += line + "\n";
        }
      }

      // Extract target audience
      else if (line.includes("Đối tượng khách hàng") || line.includes("tuổi")) {
        if (currentProduct) {
          currentProduct.targetAudience += line + " ";
        }
      }

      // Extract tone of voice
      else if (
        line.includes("Tone of voice") ||
        line.includes("Trendy") ||
        line.includes("Gần gũi")
      ) {
        if (currentProduct) {
          currentProduct.toneOfVoice += line + " ";
        }
      }

      // Extract price - support formats: "160k", "160,000", "160.000"
      // Check if line contains price (not necessarily standalone)
      else if (currentProduct && !currentProduct.price) {
        // Try to find price in the line - PRIORITY ORDER: separator format > standalone > k format
        let priceMatch;

        // Pattern 1 (HIGHEST PRIORITY): 160,000 or 160.000 (price format with separator)
        // Look for 6-digit numbers with dot/comma separator (e.g., 150.000, 160.000)
        priceMatch = line.match(/(\d{3}[\.,]\d{3})/);
        if (priceMatch) {
          const cleanPrice = priceMatch[1].replace(/[,.]/g, '');
          const numPrice = parseInt(cleanPrice);
          if (!isNaN(numPrice) && numPrice >= 100000 && numPrice <= 1000000) {
            currentProduct.price = numPrice;
            console.log(`[PDF Parser] ✅ Extracted price (separator format): ${currentProduct.price} from line ${i}: "${line}"`);
          }
        }

        // Pattern 2: Standalone number that looks like price (100000-1000000 range)
        if (!currentProduct.price) {
          priceMatch = line.match(/\b(\d{6,7})\b/);
          if (priceMatch) {
            const numPrice = parseInt(priceMatch[1]);
            if (!isNaN(numPrice) && numPrice >= 100000 && numPrice <= 1000000) {
              currentProduct.price = numPrice;
              console.log(`[PDF Parser] ✅ Extracted price (number format): ${currentProduct.price} from line ${i}: "${line}"`);
            }
          }
        }

        // Pattern 3 (LOWEST PRIORITY): 160k or 160K - but NOT in URLs
        // Only check if not found separator/standalone price, and line doesn't look like URL
        if (!currentProduct.price && !line.includes('http') && !line.includes('drive.google')) {
          priceMatch = line.match(/\b(\d+)k\b/i);
          if (priceMatch) {
            const numPrice = parseInt(priceMatch[1]);
            // Only accept reasonable price range (100-1000k = 100,000-1,000,000)
            if (numPrice >= 100 && numPrice <= 1000) {
              currentProduct.price = numPrice * 1000;
              console.log(`[PDF Parser] ✅ Extracted price (k format): ${currentProduct.price} from line ${i}: "${line}"`);
            }
          }
        }
      }

      // Extract URL
      else if (line.includes("drive.google.com") || line.includes("https://")) {
        if (currentProduct) {
          const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
          if (urlMatch) {
            currentProduct.directUrl = urlMatch[1];
            currentProduct.images.push(urlMatch[1]);
          }
        }
      }
    }

    // Push last product
    if (currentProduct) {
      console.log(`[PDF Parser] Completed last product: ${currentProduct.name}, Price: ${currentProduct.price}`);
      products.push(currentProduct);
    }

    // Clean up products
    const cleanedProducts = products.map((p) => {
      const { _debugLineNumber, ...cleanProduct } = p;
      return {
        ...cleanProduct,
        description: p.description.trim(),
        targetAudience: p.targetAudience.trim(),
        toneOfVoice: p.toneOfVoice.trim(),
      };
    });

    console.log(`[PDF Parser] Total products extracted: ${cleanedProducts.length}`);
    cleanedProducts.forEach((p, index) => {
      console.log(`[PDF Parser] Product ${index + 1}: ${p.name} - Price: ${p.price}`);
    });

    return cleanedProducts;
  }

  /**
   * Detect category from product name
   */
  detectCategory(name) {
    if (name.includes("Dây Chuyền")) return "Dây chuyền";
    if (name.includes("Vòng Tay")) return "Vòng tay";
    if (name.includes("Vòng Cổ")) return "Vòng cổ";
    if (name.includes("Nhẫn")) return "Nhẫn";
    return "Trang sức";
  }

  /**
   * Parse products manually from structured data
   * Use this if automatic parsing doesn't work well
   */
  parseManually(pdfText) {
    // You can manually structure the data here
    // This is more reliable for structured PDFs
    const products = [
      {
        name: "Dây Chuyền Bạc Orenda Chuỗi Hạt Layer Cá tính Trendy",
        description:
          "• Chất liệu: Hợp kim mạ bạc cao cấp, sáng bóng và bền đẹp theo thời gian\n• Kích thước: 32cm + 5cm\n• Kiểu dáng: Dạng chuỗi hạt nhỏ xinh nối liền tạo sự mềm mại và uyển chuyển cho vùng cổ\n• Sản xuất: Sản phẩm được chế tác thủ công, ứng dụng kỹ thuật mạ bạc hiện đại\n• Phong cách: Nhẹ nhàng, thanh lịch – thích hợp cho mọi dịp từ thường ngày đến đi tiệc",
        targetAudience:
          "Nữ (16–30 tuổi, học sinh – sinh viên – nhân viên văn phòng trẻ, couple)",
        toneOfVoice:
          "Trendy / Năng động / Gần gũi / Dễ thương / Lãng mạn / Ngọt ngào",
        status: "next",
        directUrl:
          "https://drive.usercontent.google.com/download?id=13hu3slMGvdAeqGx6GMPm5Ms6sCVhFwd-&authuser=0",
        price: 150000,
        category: "Dây chuyền",
        images: [
          "https://drive.usercontent.google.com/download?id=13hu3slMGvdAeqGx6GMPm5Ms6sCVhFwd-&authuser=0",
        ],
      },
      // Add more products...
    ];

    return products;
  }
}

module.exports = new PDFParserService();
