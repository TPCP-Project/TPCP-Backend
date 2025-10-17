const crypto = require("crypto");
const axios = require("axios");

class PaymentService {
  constructor() {
    // VNPay URLs
    this.vnpayUrl =
      process.env.VNPAY_URL ||
      "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    this.vnpayReturnUrl =
      process.env.VNPAY_RETURN_URL ||
      "http://localhost:4000/api/subscription/payment-return";

    // VNPay credentials
    this.vnpayTmnCode = process.env.VNPAY_TMN_CODE;
    this.vnpaySecretKey =
      process.env.VNPAY_SECRET_KEY || process.env.VNPAY_HASH_SECRET;

    this.vnpayApiUrl =
      process.env.VNPAY_API_URL ||
      "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction";

    // Validate required credentials
    this.validateConfig();

    console.log("✅ PaymentService initialized successfully");
  }

  validateConfig() {
    const required = {
      VNPAY_TMN_CODE: this.vnpayTmnCode,
      VNPAY_SECRET_KEY: this.vnpaySecretKey,
    };

    const missing = Object.entries(required)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      const error = `❌ Missing required VNPay credentials: ${missing.join(
        ", "
      )}`;
      console.error(error);
      console.error("Please add these to your .env file:");
      missing.forEach((key) => console.error(`  ${key}=your_value_here`));
      throw new Error(error);
    }

    // Log thông tin config (ẩn một phần secret key)
    console.log("[Payment] VNPay Config:");
    console.log("  TMN Code:", this.vnpayTmnCode);
    console.log("  Secret Key:", this.vnpaySecretKey?.substring(0, 10) + "...");
    console.log("  Return URL:", this.vnpayReturnUrl);
  }

  /**
   * Tạo URL thanh toán VNPay
   */
  async createPaymentUrl(params) {
    try {
      const {
        amount = 1500000,
        orderId,
        orderDescription = "Đăng ký gói Pro - AI Chatbot",
        customerInfo = {},
        returnUrl = this.vnpayReturnUrl,
      } = params;

      const txnRef = orderId || this.generateOrderId();

      // Normalize IP address - VNPay không chấp nhận IPv6
      let ipAddr = customerInfo.ipAddr || "127.0.0.1";
      if (ipAddr === "::1" || ipAddr === "::ffff:127.0.0.1") {
        ipAddr = "127.0.0.1";
      }

      const paymentData = {
        vnp_Version: "2.1.0",
        vnp_Command: "pay",
        vnp_TmnCode: this.vnpayTmnCode,
        vnp_Amount: amount * 100,
        vnp_CurrCode: "VND",
        vnp_TxnRef: txnRef,
        vnp_OrderInfo: orderDescription,
        vnp_OrderType: "other",
        vnp_Locale: "vn",
        vnp_ReturnUrl: returnUrl,
        vnp_IpAddr: ipAddr,
        vnp_CreateDate: this.formatDate(new Date()),
      };

      // Log để debug
      console.log("[Payment] Creating payment with data:", {
        txnRef,
        amount: paymentData.vnp_Amount,
        createDate: paymentData.vnp_CreateDate,
        returnUrl: paymentData.vnp_ReturnUrl,
        ipAddr: paymentData.vnp_IpAddr,
      });

      const sortedParams = this.sortObject(paymentData);
      const queryString = this.createQueryString(sortedParams);

      // Debug log
      console.log(
        "[Payment] Query string:",
        queryString.substring(0, 150) + "..."
      );
      console.log(
        "[Payment] Secret key (first 10 chars):",
        this.vnpaySecretKey.substring(0, 10)
      );

      const secureHash = this.createSecureHash(queryString);
      console.log("[Payment] SecureHash:", secureHash);

      const paymentUrl = `${this.vnpayUrl}?${queryString}&vnp_SecureHash=${secureHash}`;

      console.log("[Payment] Created payment URL for order:", txnRef);
      console.log("[Payment] Full URL:", paymentUrl.substring(0, 100) + "...");

      return {
        success: true,
        paymentUrl,
        txnRef,
        amount,
        orderDescription,
        data: paymentData,
      };
    } catch (error) {
      console.error("[Payment] Create URL error:", error);
      throw new Error(`Tạo URL thanh toán thất bại: ${error.message}`);
    }
  }

  /**
   * Xác thực kết quả thanh toán từ VNPay
   * @param {Object} queryParams - Query parameters từ VNPay return
   * @returns {Object} - Kết quả xác thực
   */
  async verifyPayment(queryParams) {
    try {
      const {
        vnp_Amount,
        vnp_BankCode,
        vnp_BankTranNo,
        vnp_CardType,
        vnp_OrderInfo,
        vnp_PayDate,
        vnp_ResponseCode,
        vnp_TmnCode,
        vnp_TransactionNo,
        vnp_TxnRef,
        vnp_SecureHash,
      } = queryParams;

      // Kiểm tra mã phản hồi
      if (vnp_ResponseCode !== "00") {
        return {
          success: false,
          code: vnp_ResponseCode,
          message: this.getResponseMessage(vnp_ResponseCode),
          txnRef: vnp_TxnRef,
        };
      }

      // Tạo lại chuỗi để xác thực chữ ký
      const verifyData = {
        vnp_Amount,
        vnp_BankCode,
        vnp_BankTranNo,
        vnp_CardType,
        vnp_OrderInfo,
        vnp_PayDate,
        vnp_ResponseCode,
        vnp_TmnCode,
        vnp_TransactionNo,
        vnp_TxnRef,
      };

      const sortedParams = this.sortObject(verifyData);
      const queryString = this.createQueryString(sortedParams);
      const secureHash = this.createSecureHash(queryString);

      // Xác thực chữ ký
      if (secureHash !== vnp_SecureHash) {
        return {
          success: false,
          code: "INVALID_SIGNATURE",
          message: "Chữ ký không hợp lệ",
          txnRef: vnp_TxnRef,
        };
      }

      return {
        success: true,
        code: vnp_ResponseCode,
        message: "Thanh toán thành công",
        txnRef: vnp_TxnRef,
        amount: parseInt(vnp_Amount) / 100, // Chuyển về VND
        transactionNo: vnp_TransactionNo,
        bankTranNo: vnp_BankTranNo,
        payDate: vnp_PayDate,
        orderInfo: vnp_OrderInfo,
      };
    } catch (error) {
      console.error("[Payment] Verify error:", error);
      throw new Error(`Xác thực thanh toán thất bại: ${error.message}`);
    }
  }

  /**
   * Kiểm tra trạng thái giao dịch
   * @param {String} txnRef - Mã giao dịch
   * @returns {Object} - Trạng thái giao dịch
   */
  async checkTransactionStatus(txnRef) {
    try {
      const data = {
        vnp_RequestId: this.generateOrderId(),
        vnp_Version: "2.1.0",
        vnp_Command: "querydr",
        vnp_TmnCode: this.vnpayTmnCode,
        vnp_TxnRef: txnRef,
        vnp_OrderInfo: "Kiem tra trang thai giao dich",
        vnp_TransactionDate: this.formatDate(new Date()),
        vnp_CreateDate: this.formatDate(new Date()),
        vnp_IpAddr: "127.0.0.1",
      };

      const sortedParams = this.sortObject(data);
      const queryString = this.createQueryString(sortedParams);
      const secureHash = this.createSecureHash(queryString);

      const response = await axios.post(this.vnpayApiUrl, {
        ...data,
        vnp_SecureHash: secureHash,
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error("[Payment] Check status error:", error);
      throw new Error(`Kiểm tra trạng thái thất bại: ${error.message}`);
    }
  }

  /**
   * Tạo mã đơn hàng duy nhất
   */
  generateOrderId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `ORDER_${timestamp}_${random}`;
  }

  /**
   * Format ngày theo định dạng VNPay
   */
  formatDate(date) {
    // VNPay cần format YYYYMMDDHHMMSS (14 số)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  /**
   * Sắp xếp object theo key
   */
  sortObject(obj) {
    const sorted = {};
    Object.keys(obj)
      .sort()
      .forEach((key) => {
        if (obj[key] !== null && obj[key] !== undefined && obj[key] !== "") {
          sorted[key] = obj[key];
        }
      });
    return sorted;
  }

  /**
   * Tạo query string từ object
   */
  createQueryString(obj) {
    return Object.keys(obj)
      .map((key) => `${key}=${encodeURIComponent(obj[key])}`)
      .join("&");
  }

  /**
   * Tạo chữ ký bảo mật
   */
  createSecureHash(queryString) {
    // VNPay yêu cầu hash theo chuẩn HMAC-SHA512
    const hmac = crypto.createHmac("sha512", this.vnpaySecretKey);
    hmac.update(queryString, "utf8");
    return hmac.digest("hex");
  }

  /**
   * Lấy thông báo từ mã phản hồi
   */
  getResponseMessage(code) {
    const messages = {
      "00": "Giao dịch thành công",
      "07": "Trừ tiền thành công. Giao dịch bị nghi ngờ",
      "09": "Thẻ/Tài khoản chưa đăng ký InternetBanking",
      10: "Xác thực thông tin không đúng quá 3 lần",
      11: "Đã hết hạn chờ thanh toán",
      12: "Giao dịch bị khóa",
      24: "Khách hàng hủy giao dịch",
      51: "Tài khoản không đủ số dư",
      65: "Tài khoản vượt quá hạn mức giao dịch",
      75: "Ngân hàng thanh toán đang bảo trì",
      79: "Nhập sai mật khẩu quá số lần quy định",
    };
    return messages[code] || "Lỗi không xác định";
  }
}

module.exports = new PaymentService();
