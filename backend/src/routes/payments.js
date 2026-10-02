
import express from "express";
import jwt from "jsonwebtoken";
import pool from "../db.js";

const router = express.Router();

// ========================================
// AUTHENTICATION MIDDLEWARE
// ========================================

const authenticatePaymentUser = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required. Please login again.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured.");
      return res.status(500).json({
        message: "Server authentication configuration error.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.id || decoded.userId || decoded.sub;

    if (!userId) {
      return res.status(401).json({
        message: "Invalid authentication token.",
      });
    }

    req.authenticatedUserId = userId;

    next();
  } catch (error) {
    console.error("PAYMENT AUTHENTICATION ERROR:", error.message);

    return res.status(401).json({
      message: "Session expired or invalid. Please login again.",
    });
  }
};

// ========================================
// PAYMENT VERIFICATION / BOOKING SUBMISSION
// ========================================

router.post("/verify", authenticatePaymentUser, async (req, res) => {
  let client;

  try {
    const {
      from,
      fromLat,
      fromLng,
      to,
      toLat,
      toLng,
      distanceKm,
      vehicleType,
      tripType,
      travelDate,
      transactionRef,
    } = req.body;

    // ========================================
    // 1. VALIDATE REQUIRED FIELDS
    // ========================================

    if (
      !from ||
      !to ||
      distanceKm === undefined ||
      distanceKm === null ||
      !vehicleType ||
      !tripType ||
      !travelDate ||
      !transactionRef
    ) {
      return res.status(400).json({
        message: "Please provide all required booking and payment details.",
      });
    }

    // ========================================
    // 2. VALIDATE TRIP TYPE
    // ========================================

    const normalizedTripType = String(tripType).toLowerCase().trim();

    if (!["local", "outstation"].includes(normalizedTripType)) {
      return res.status(400).json({
        message: "Invalid trip type. Use local or outstation.",
      });
    }

    // ========================================
    // 3. VALIDATE DISTANCE
    // ========================================

    const numericDistance = Number(distanceKm);

    if (
      !Number.isFinite(numericDistance) ||
      numericDistance <= 0 ||
      numericDistance > 10000
    ) {
      return res.status(400).json({
        message: "Invalid travel distance.",
      });
    }

    // ========================================
    // 4. VALIDATE PAYMENT REFERENCE
    // ========================================

    const normalizedTransactionRef = String(transactionRef).trim();

    if (!/^[A-Za-z0-9-]{6,50}$/.test(normalizedTransactionRef)) {
      return res.status(400).json({
        message: "Invalid transaction reference / UTR number.",
      });
    }

    // ========================================
    // 5. GET DATABASE CONNECTION
    // ========================================

    client = await pool.connect();

    await client.query("BEGIN");

    // ========================================
    // 6. GET ACTIVE PRICING
    // ========================================

    const pricingResult = await client.query(
      `
      SELECT rate_per_km
      FROM pricing
      WHERE LOWER(vehicle_type) = LOWER($1)
        AND LOWER(trip_type) = LOWER($2)
        AND active = TRUE
      LIMIT 1
      `,
      [vehicleType, normalizedTripType]
    );

    if (pricingResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: `Pricing not available for ${vehicleType} (${normalizedTripType}).`,
      });
    }

    const ratePerKm = Number(pricingResult.rows[0].rate_per_km);

    if (!Number.isFinite(ratePerKm) || ratePerKm <= 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Invalid pricing configuration.",
      });
    }

    // ========================================
    // 7. CALCULATE FARE ON SERVER
    // ========================================

    const totalFare = Math.round(
      numericDistance * ratePerKm * 100
    ) / 100;

    if (!Number.isFinite(totalFare) || totalFare <= 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Unable to calculate booking fare.",
      });
    }

    // ========================================
    // 8. CALCULATE ADVANCE AMOUNT
    // ========================================

    const advanceAmount =
      normalizedTripType === "outstation" ? 200 : 150;

    // ========================================
    // 9. GENERATE BOOKING REFERENCE
    // ========================================

    const bookingReference =
      "GT-" +
      Date.now() +
      "-" +
      Math.floor(Math.random() * 1000);

    // ========================================
    // 10. INSERT BOOKING
    // ========================================

    const bookingResult = await client.query(
      `
      INSERT INTO bookings
      (
        booking_reference,
        user_id,
        from_location,
        from_lat,
        from_lng,
        to_location,
        to_lat,
        to_lng,
        distance_km,
        vehicle_type,
        rate_per_km,
        total_fare,
        travel_date
      )
      VALUES
      (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13
      )
      RETURNING *
      `,
      [
        bookingReference,
        req.authenticatedUserId,
        from,
        fromLat ?? null,
        fromLng ?? null,
        to,
        toLat ?? null,
        toLng ?? null,
        numericDistance,
        vehicleType,
        ratePerKm,
        totalFare,
        travelDate,
      ]
    );

    const booking = bookingResult.rows[0];

    // ========================================
    // 11. INSERT PAYMENT VERIFICATION
    // ========================================

    const upiId = process.env.GOTRIP_UPI_ID || "8465826241-3@ybl";

    const paymentResult = await client.query(
      `
      INSERT INTO payment_verifications
      (
        booking_id,
        user_id,
        transaction_ref,
        amount,
        upi_id,
        status,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING *
      `,
      [
        booking.id,
        req.authenticatedUserId,
        normalizedTransactionRef,
        advanceAmount,
        upiId,
        "pending",
      ]
    );

    // ========================================
    // 12. CREATE NOTIFICATION
    // ========================================

    await client.query(
      `
      INSERT INTO notifications
      (
        user_id,
        message,
        is_read,
        created_at
      )
      VALUES ($1, $2, FALSE, CURRENT_TIMESTAMP)
      `,
      [
        req.authenticatedUserId,
        `Your booking ${bookingReference} has been submitted. Payment verification is pending.`,
      ]
    );

    // ========================================
    // 13. COMMIT TRANSACTION
    // ========================================

    await client.query("COMMIT");

    // ========================================
    // 14. SUCCESS RESPONSE
    // ========================================

    return res.status(201).json({
      message: "Booking submitted successfully. Payment verification is pending.",

      booking: {
        id: booking.id,
        bookingReference: booking.booking_reference,
        from: booking.from_location,
        to: booking.to_location,
        distanceKm: Number(booking.distance_km),
        vehicleType: booking.vehicle_type,
        tripType: normalizedTripType,
        ratePerKm,
        totalFare,
        advanceAmount,
        travelDate: booking.travel_date,
      },

      payment: {
        id: paymentResult.rows[0].id,
        transactionRef: paymentResult.rows[0].transaction_ref,
        amount: Number(paymentResult.rows[0].amount),
        status: paymentResult.rows[0].status,
        upiId,
      },

      paymentStatus: "pending",
    });

  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("PAYMENT ROLLBACK ERROR:", rollbackError.message);
      }
    }

    console.error("=================================");
    console.error("PAYMENT SUBMISSION ERROR");
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("Detail:", error.detail);
    console.error("=================================");

    return res.status(500).json({
      message: "Unable to submit booking and payment details.",
      error: process.env.NODE_ENV === "development"
        ? error.message
        : undefined,
    });

  } finally {
    if (client) {
      client.release();
    }
  }
});

export default router;