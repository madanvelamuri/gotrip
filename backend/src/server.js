
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Database connection
import pool from "./db.js";

// API routes
import authRoutes from "./routes/auth.js";
import pricingRoutes from "./routes/pricing.js";
import bookingRoutes from "./routes/bookings.js";
import adminRoutes from "./routes/admin.js";
import locationRoutes from "./routes/locations.js";
import supportRoutes from "./routes/support.js";
import paymentRoutes from "./routes/payments.js";

dotenv.config();

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
    origin: (origin, callback) => {
      // Allow requests without an Origin header
      // (for example, health checks and server-to-server calls).
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error(`CORS blocked for origin: ${origin}`)
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
app.use(express.urlencoded({ extended: true }));

// ========================================
// REQUEST LOGGER
// ========================================

app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} | ${req.method} ${req.originalUrl}`
  );

  next();
});

// ========================================
// HEALTH CHECK
// ========================================

app.get("/", async (req, res) => {
  try {
    // Check database connectivity
    await pool.query("SELECT 1");

    return res.status(200).json({
      name: "GoTrip API",
      status: "running",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("DATABASE HEALTH CHECK FAILED:", error.message);

    return res.status(503).json({
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

app.use("/api/auth", authRoutes);

app.use("/api/pricing", pricingRoutes);

app.use("/api/bookings", bookingRoutes);

app.use("/api/payments", paymentRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/locations", locationRoutes);

app.use("/api/support", supportRoutes);

// ========================================
// API NOT FOUND
// ========================================

app.use((req, res) => {
  return res.status(404).json({
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

  // CORS errors
  if (error.message.startsWith("CORS blocked")) {
    return res.status(403).json({
      message: "CORS policy blocked this request",
    });
  }

  return res.status(500).json({
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
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log("CORS enabled");
  console.log("API routes registered");
  console.log("=================================");
});

export default app;