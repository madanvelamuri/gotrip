
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import pricingRoutes from "./routes/pricing.js";
import bookingRoutes from "./routes/bookings.js";
import adminRoutes from "./routes/admin.js";
import locationRoutes from "./routes/locations.js";
import supportRoutes from "./routes/support.js";
import paymentRoutes from "./routes/payments.js";
app.use("/api/payments", paymentRoutes);
dotenv.config();

const app = express();

// CORS CONFIGURATION
const allowedOrigins = [
  "http://localhost:5173",
  "https://gotrip-phi.vercel.app",
  "https://gotrip.com",
  "https://www.gotrip.com",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header (Postman, curl, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error("CORS policy violation: This origin is not allowed.")
      );
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// BODY PARSER
app.use(express.json());

// REQUEST LOGGER
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

// HEALTH CHECK
app.get("/", (req, res) => {
  res.status(200).json({
    name: "GoTrip API",
    status: "running",
    message: "Welcome to GoTrip API",
  });
});

// API ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/pricing", pricingRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/support", supportRoutes);

// 404 HANDLER
app.use((req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);

  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
});

// START SERVER
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("----------------------------------------");
  console.log(`GoTrip API running on port ${PORT}`);
  console.log("----------------------------------------");
});