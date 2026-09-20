import express from "express";
import pool from "../db.js";
import { authenticate } from "../middleware/auth.js";
import { calculateFare } from "../utils/fare.js";

const router = express.Router();

/*
========================================
CREATE BOOKING
========================================
*/
router.post("/", authenticate, async (req, res) => {
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
      travelDate,
    } = req.body;

    /*
    ----------------------------------------
    1. VALIDATE REQUIRED FIELDS
    ----------------------------------------
    */

    if (
      !from ||
      !to ||
      distanceKm === undefined ||
      distanceKm === null ||
      !vehicleType
    ) {
      return res.status(400).json({
        message: "Missing booking information",
      });
    }

    /*
    ----------------------------------------
    2. VALIDATE DISTANCE
    ----------------------------------------
    */

    const numericDistance = Number(distanceKm);

    if (
      !Number.isFinite(numericDistance) ||
      numericDistance <= 0
    ) {
      return res.status(400).json({
        message: "Invalid distance. Please calculate the route again.",
      });
    }

    /*
    ----------------------------------------
    3. VALIDATE USER
    ----------------------------------------
    */

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: "Unauthorized. Please login again.",
      });
    }

    /*
    ----------------------------------------
    4. GET ACTIVE VEHICLE PRICING
    ----------------------------------------
    */

    const pricing = await pool.query(
      `
      SELECT rate_per_km
      FROM pricing
      WHERE vehicle_type = $1
      AND active = true
      LIMIT 1
      `,
      [vehicleType]
    );

    if (pricing.rows.length === 0) {
      return res.status(400).json({
        message: `Vehicle pricing unavailable for ${vehicleType}`,
      });
    }

    const rate = Number(
      pricing.rows[0].rate_per_km
    );

    if (!Number.isFinite(rate) || rate <= 0) {
      return res.status(400).json({
        message: "Invalid vehicle pricing configuration.",
      });
    }

    /*
    ----------------------------------------
    5. CALCULATE FARE
    ----------------------------------------
    */

    const fare = calculateFare(
      numericDistance,
      rate
    );

    if (!Number.isFinite(fare) || fare <= 0) {
      return res.status(400).json({
        message: "Unable to calculate booking fare.",
      });
    }

    /*
    ----------------------------------------
    6. GENERATE BOOKING REFERENCE
    ----------------------------------------
    */

    const reference =
      "GT-" +
      Date.now() +
      "-" +
      Math.floor(Math.random() * 1000);

    /*
    ----------------------------------------
    7. INSERT BOOKING INTO DATABASE
    ----------------------------------------
    */

    const result = await pool.query(
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
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13
      )
      RETURNING *
      `,
      [
        reference,
        req.user.id,
        from,
        fromLat ?? null,
        fromLng ?? null,
        to,
        toLat ?? null,
        toLng ?? null,
        numericDistance,
        vehicleType,
        rate,
        fare,
        travelDate || null,
      ]
    );

    /*
    ----------------------------------------
    8. SUCCESS RESPONSE
    ----------------------------------------
    */

    return res.status(201).json({
      message: "Booking created successfully",
      booking: result.rows[0],
    });

  } catch (error) {
    console.error("=================================");
    console.error("BOOKING CREATION ERROR");
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("Detail:", error.detail);
    console.error("=================================");

    return res.status(500).json({
      message: "Booking failed",
      error: error.message,
    });
  }
});


/*
========================================
MY BOOKINGS
========================================
*/
router.get("/my", authenticate, async (req, res) => {
  try {
    /*
    ----------------------------------------
    1. VALIDATE USER
    ----------------------------------------
    */

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: "Unauthorized. Please login again.",
      });
    }

    /*
    ----------------------------------------
    2. FETCH USER BOOKINGS
    ----------------------------------------
    */

    const result = await pool.query(
      `
      SELECT *
      FROM bookings
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [req.user.id]
    );

    /*
    ----------------------------------------
    3. SUCCESS RESPONSE
    ----------------------------------------
    */

    return res.status(200).json(result.rows);

  } catch (error) {
    console.error("MY BOOKINGS ERROR:", error);

    return res.status(500).json({
      message: "Unable to load bookings",
      error: error.message,
    });
  }
});


/*
========================================
GET USER NOTIFICATIONS
========================================
Endpoint: GET /api/bookings/notifications/:userId
*/
router.get("/notifications/:userId", authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    // Optional security check to make sure users only read their own notifications
    if (String(req.user.id) !== String(userId) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied." });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 10
      `,
      [userId]
    );

    return res.status(200).json(result.rows);

  } catch (error) {
    console.error("FETCH NOTIFICATIONS ERROR:", error);

    return res.status(500).json({
      message: "Unable to load notifications",
      error: error.message,
    });
  }
});

// Mark notification as read
router.patch("/notifications/:id/read", authenticate, async (req, res) => {
  try {
    await pool.query(
      "UPDATE notifications SET is_read = true WHERE id = $1",
      [req.params.id]
    );
    res.json({ message: "Notification marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update notification" });
  }
});

export default router;