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
        message: "Tài khoản chưa được xác thực",
      });
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: "Tài khoản đã bị khóa",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({
      success: false,
      message: "Token không hợp lệ hoặc đã hết hạn",
    });
  }
}

// Middleware kiểm tra xác thực email
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
const requireAdmin = (req, res, next) => {
  try {
    // Check if user exists and has admin role
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    next();
  } catch (error) {
    console.error("RequireAdmin middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
// const requireSubscription = (requiredTiers = []) => {
//   return async (req, res, next) => {
//     try {
//       if (!req.user) {
//         return res.status(401).json({
//           success: false,
//           message: 'Authentication required'
//         });
//       }

//       const hasActiveSubscription = req.user.subscription &&
//         req.user.subscription.status === 'active' &&
//         new Date(req.user.subscription.expiresAt) > new Date();

//       if (!hasActiveSubscription) {
//         return res.status(403).json({
//           success: false,
//           message: 'Active subscription required',
//           code: 'SUBSCRIPTION_REQUIRED'
//         });
//       }

//       if (requiredTiers.length > 0) {
//         const userTier = req.user.subscription.tier;
//         if (!requiredTiers.includes(userTier)) {
//           return res.status(403).json({
//             success: false,
//             message: `Subscription tier '${requiredTiers.join(' or ')}' required`,
//             code: 'INSUFFICIENT_TIER'
//           });
//         }
//       }

//       next();
//     } catch (error) {
//       console.error('Subscription check error:', error);
//       return res.status(500).json({
//         success: false,
//         message: 'Internal server error'
//       });
//     }
//   };
// };

module.exports = {
  authenticateToken,
  requireVerified,
  requireAdmin,

  authorizeRoles,
  // requireSubscription,
};
