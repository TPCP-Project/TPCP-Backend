// utils/apiResponse.js

/**
 * Standardized API response helper functions
 */

const successResponse = (res, data, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

const errorResponse = (
  res,
  message = "Internal Server Error",
  statusCode = 500,
  errors = null
) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

const validationErrorResponse = (res, errors) => {
  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors: errors,
    timestamp: new Date().toISOString(),
  });
};

const notFoundResponse = (res, message = "Resource not found") => {
  return res.status(404).json({
    success: false,
    message,
    timestamp: new Date().toISOString(),
  });
};

const unauthorizedResponse = (res, message = "Unauthorized access") => {
  return res.status(401).json({
    success: false,
    message,
    timestamp: new Date().toISOString(),
  });
};

const forbiddenResponse = (res, message = "Access forbidden") => {
  return res.status(403).json({
    success: false,
    message,
    timestamp: new Date().toISOString(),
  });
};

const conflictResponse = (res, message = "Resource conflict") => {
  return res.status(409).json({
    success: false,
    message,
    timestamp: new Date().toISOString(),
  });
};

const paginatedResponse = (res, data, pagination, message = "Success") => {
  return res.status(200).json({
    success: true,
    message,
    data: {
      items: data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: Math.ceil(pagination.total / pagination.limit),
        hasNext:
          pagination.page < Math.ceil(pagination.total / pagination.limit),
        hasPrev: pagination.page > 1,
      },
    },
    timestamp: new Date().toISOString(),
  });
};

// Middleware to add response helpers to res object
const responseHelpers = (req, res, next) => {
  res.success = (data, message, statusCode) =>
    successResponse(res, data, message, statusCode);
  res.error = (message, statusCode, errors) =>
    errorResponse(res, message, statusCode, errors);
  res.validationError = (errors) => validationErrorResponse(res, errors);
  res.notFound = (message) => notFoundResponse(res, message);
  res.unauthorized = (message) => unauthorizedResponse(res, message);
  res.forbidden = (message) => forbiddenResponse(res, message);
  res.conflict = (message) => conflictResponse(res, message);
  res.paginated = (data, pagination, message) =>
    paginatedResponse(res, data, pagination, message);

  next();
};

// Error handling middleware
const errorHandler = (error, req, res, next) => {
  console.error("Error:", error);

  // Mongoose validation error
  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map((err) => ({
      field: err.path,
      message: err.message,
    }));
    return validationErrorResponse(res, errors);
  }

  // Mongoose cast error (invalid ObjectId)
  if (error.name === "CastError") {
    return errorResponse(res, "Invalid ID format", 400);
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return errorResponse(res, `${field} already exists`, 409);
  }

  // JWT errors
  if (error.name === "JsonWebTokenError") {
    return unauthorizedResponse(res, "Invalid token");
  }

  if (error.name === "TokenExpiredError") {
    return unauthorizedResponse(res, "Token expired");
  }

  // Default error
  return errorResponse(
    res,
    error.message || "Internal Server Error",
    error.statusCode || 500
  );
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Request validation helper
const validateFields = (requiredFields, data) => {
  const missingFields = [];
  const invalidFields = [];

  requiredFields.forEach((field) => {
    if (typeof field === "string") {
      if (!data[field] || data[field] === "") {
        missingFields.push(field);
      }
    } else if (typeof field === "object") {
      const { name, type, validator } = field;

      if (!data[name] || data[name] === "") {
        missingFields.push(name);
      } else {
        // Type validation
        if (type && typeof data[name] !== type) {
          invalidFields.push({
            field: name,
            message: `${name} must be of type ${type}`,
          });
        }

        // Custom validation
        if (validator && !validator(data[name])) {
          invalidFields.push({ field: name, message: `${name} is invalid` });
        }
      }
    }
  });

  if (missingFields.length > 0 || invalidFields.length > 0) {
    const errors = [
      ...missingFields.map((field) => ({
        field,
        message: `${field} is required`,
      })),
      ...invalidFields,
    ];
    return { isValid: false, errors };
  }

  return { isValid: true, errors: [] };
};

// Helper for
