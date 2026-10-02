
import jwt from "jsonwebtoken";

/**
 * AUTHENTICATION MIDDLEWARE
 * Verifies the JWT token sent by the frontend.
 */
export const authenticate = (req, res, next) => {
  try {
    // Get authorization header
    const authHeader = req.headers.authorization;

    // Check whether token exists
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required",
      });
    }

    // Extract token
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token is missing",
      });
    }

    // Check JWT secret
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        success: false,
        message: "Server authentication configuration error",
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Validate decoded user ID
    if (!decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    // Store authenticated user details
    req.user = {
      id: decoded.id,
      email: decoded.email,
      mobile: decoded.mobile,
      role: decoded.role || "customer",
    };

    next();

  } catch (error) {
    console.error("Authentication error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};


/**
 * ADMIN AUTHORIZATION MIDDLEWARE
 * Allows access only to users with the admin role.
 * Must be used after authenticate.
 */
export const authorizeAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Please login first",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }

  next();
};


/**
 * BACKWARD COMPATIBILITY
 * Supports existing routes importing adminOnly.
 */
export const adminOnly = authorizeAdmin;

