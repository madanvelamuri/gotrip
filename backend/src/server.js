import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import pricingRoutes from "./routes/pricing.js";
import bookingRoutes from "./routes/bookings.js";
import adminRoutes from "./routes/admin.js";
import locationRoutes from "./routes/locations.js";
import supportRoutes from "./routes/support.js"; // <--- Support & Feedback routes imported

dotenv.config();

const app = express();

/*
========================================
CORS CONFIGURATION
========================================
*/

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/*
========================================
BODY PARSER
========================================
*/

app.use(express.json());

/*
========================================
REQUEST LOGGER
========================================
*/

app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

/*
========================================
HEALTH CHECK
========================================
*/

app.get("/", (req, res) => {
  res.status(200).json({
    name: "GoTrip API",
    status: "running",
    message: "Welcome to GoTrip API",
  });
});

/*
========================================
API ROUTES
========================================
*/

app.use("/api/auth", authRoutes);

app.use("/api/pricing", pricingRoutes);

app.use("/api/bookings", bookingRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/location", locationRoutes);

app.use("/api/support", supportRoutes); // <--- Support & Feedback endpoint registered

/*
========================================
404 HANDLER
========================================
*/

app.use((req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

/*
========================================
GLOBAL ERROR HANDLER
========================================
*/

app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);

  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
});

/*
========================================
START SERVER
========================================
*/

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("----------------------------------------");
  console.log(`GoTrip API running on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
  console.log("----------------------------------------");
});