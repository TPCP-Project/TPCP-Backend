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

    // Split by product entries (customize based on your PDF structure)
    const lines = text.split("\n").filter((line) => line.trim());

    let currentProduct = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Detect product name (starts with "Dây Chuyền" or "Vòng")
      if (line.match(/^(Dây Chuyền|Vòng|Nhẫn)/)) {
        if (currentProduct) {
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
        };
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

      // Extract price
      else if (line.match(/\d+k$/i)) {
        if (currentProduct) {
          const priceMatch = line.match(/(\d+)k/i);
          if (priceMatch) {
            currentProduct.price = parseInt(priceMatch[1]) * 1000;
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
      products.push(currentProduct);
    }

    // Clean up products
    return products.map((p) => ({
      ...p,
      description: p.description.trim(),
      targetAudience: p.targetAudience.trim(),
      toneOfVoice: p.toneOfVoice.trim(),
    }));
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
