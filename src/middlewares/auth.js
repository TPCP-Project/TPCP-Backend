const jwt = require("jsonwebtoken");
const User = require("../models/user");

async function authenticateToken(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Token không được cung cấp",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select(
      "_id name username email role isVerified isBanned"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Token không hợp lệ",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Tài khoản hiện chưa được xác thực",
      });
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: "Tài khoản hiện đã bị khóa",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({
      success: false,
      message: "Token hiện không hợp lệ hoặc đã hết hạn",
    });
  }
}

/* Kiểm tra xác thực email */
const requireVerified = (req, res, next) => {
  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      message:
        "Tài khoản chưa được xác thực. Vui lòng kiểm tra email để xác thực.",
    });
  }
  next();
};

/* Kiểm tra quyền theo role */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    const { role } = req.user;
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền thực hiện hành động này",
      });
    }
    next();
  };
};

/*Chỉ cho phép Admin  */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Chỉ admin mới có quyền thực hiện hành động này",
    });
  }
  next();
};

/* Chỉ cho phép Manager */
const requireManager = (req, res, next) => {
  if (!req.user || req.user.role !== "manager") {
    return res.status(403).json({
      success: false,
      message: "Chỉ manager mới có quyền thực hiện hành động này",
    });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireVerified,
  requireAdmin,
  requireManager,
  authorizeRoles,
};
