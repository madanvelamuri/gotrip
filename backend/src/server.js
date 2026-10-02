import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// ========================================
// LOAD ENVIRONMENT VARIABLES
// ========================================

dotenv.config();

// ========================================
// DATABASE CONNECTION
// ========================================

import pool from "./db.js";

// ========================================
// API ROUTES
// ========================================

import authRoutes from "./routes/auth.js";
import pricingRoutes from "./routes/pricing.js";
import bookingRoutes from "./routes/bookings.js";
import adminRoutes from "./routes/admin.js";
import locationRoutes from "./routes/locations.js";
import supportRoutes from "./routes/support.js";
import paymentRoutes from "./routes/payments.js";

// ========================================
// INITIALIZE EXPRESS
// ========================================

const app = express();

// ========================================
// ENVIRONMENT CONFIGURATION
// ========================================

const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  "http://localhost:5173",
  "https://gotrip-phi.vercel.app",
  "https://gotrip.com",
  "https://www.gotrip.com",
  process.env.FRONTEND_URL,
].filter(Boolean);

// ========================================
// CORS CONFIGURATION
// ========================================

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without Origin header
      if (!origin) {
        return callback(null, true);
      }

      // Check allowed frontend origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error("CORS blocked:", origin);

      return callback(
        new Error("CORS blocked for origin: " + origin)
      );
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

// ========================================
// BODY PARSING
// ========================================

app.use(express.json({ limit: "1mb" }));

app.use(
  express.urlencoded({
    extended: true,
  })
);

// ========================================
// REQUEST LOGGER
// ========================================

app.use(function (req, res, next) {
  const logMessage =
    new Date().toISOString() +
    " | " +
    req.method +
    " " +
    req.originalUrl;

  console.log(logMessage);

  next();
});

// ========================================
// HEALTH CHECK
// ========================================

app.get("/", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    return res.status(200).json({
      success: true,
      name: "GoTrip API",
      status: "running",
      database: "connected",
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error(
      "DATABASE HEALTH CHECK FAILED:",
      error.message
    );

    return res.status(503).json({
      success: false,
      name: "GoTrip API",
      status: "running",
      database: "disconnected",
      message: "Database connection failed",
    });
  }
});

// ========================================
// API ROUTES
// ========================================

// Authentication API
app.use("/api/auth", authRoutes);

// Pricing API
app.use("/api/pricing", pricingRoutes);

// Booking API
app.use("/api/bookings", bookingRoutes);

// Payment API
app.use("/api/payments", paymentRoutes);

// Admin API
app.use("/api/admin", adminRoutes);

// Location and Distance API (Fixed to singular 'location' to match frontend)
app.use("/api/location", locationRoutes);

// Support API
app.use("/api/support", supportRoutes);

// ========================================
// API NOT FOUND HANDLER
// ========================================

app.use((req, res) => {
  console.error(
    "404 NOT FOUND:",
    req.method,
    req.originalUrl
  );

  return res.status(404).json({
    success: false,
    message: "API endpoint not found",
    path: req.originalUrl,
  });
});

// ========================================
// GLOBAL ERROR HANDLER
// ========================================

app.use((error, req, res, next) => {
  console.error("=================================");
  console.error("GLOBAL SERVER ERROR");
  console.error("Message:", error.message);
  console.error("=================================");

  if (res.headersSent) {
    return next(error);
  }

  // Handle CORS errors
  if (error.message.startsWith("CORS blocked")) {
    return res.status(403).json({
      success: false,
      message: "CORS policy blocked this request",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// ========================================
// START SERVER
// ========================================

app.listen(PORT, "0.0.0.0", () => {
  console.log("=================================");
  console.log("          GOTRIP API");
  console.log("=================================");

  console.log("Server running on port " + PORT);

  console.log(
    "Environment: " +
    (process.env.NODE_ENV || "development")
  );

  console.log("CORS enabled");
  console.log("Authentication routes registered");
  console.log("Pricing routes registered");
  console.log("Booking routes registered");
  console.log("Payment routes registered");
  console.log("Admin routes registered");
  console.log("Location routes registered");
  console.log("Support routes registered");

  console.log("=================================");
});

// ========================================
// EXPORT APP
// ========================================

export default app;