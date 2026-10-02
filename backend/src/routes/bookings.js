
import express from "express";
import pool from "../db.js";
import { authenticate } from "../middleware/auth.js";
import { calculateFare } from "../utils/fare.js";

const router = express.Router();

// ========================================
// CREATE BOOKING
// POST /api/bookings
// ========================================

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
      tripType,
      travelDate,
    } = req.body;

    // 1. VALIDATE USER

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: "Unauthorized. Please login again.",
      });
    }

    // 2. VALIDATE REQUIRED FIELDS

    if (
      !from ||
      !to ||
      distanceKm === undefined ||
      distanceKm === null ||
      !vehicleType ||
      !tripType
    ) {
      return res.status(400).json({
        message: "Missing booking information.",
      });
    }

    // 3. VALIDATE TRIP TYPE

    const normalizedTripType = String(tripType)
      .trim()
      .toLowerCase();

    if (!["local", "outstation"].includes(normalizedTripType)) {
      return res.status(400).json({
        message: "Invalid trip type. Select local or outstation.",
      });
    }

    // 4. VALIDATE DISTANCE

    const numericDistance = Number(distanceKm);

    if (
      !Number.isFinite(numericDistance) ||
      numericDistance <= 0 ||
      numericDistance > 10000
    ) {
      return res.status(400).json({
        message: "Invalid distance. Please calculate the route again.",
      });
    }

    // 5. GET ACTIVE VEHICLE PRICING

    const pricing = await pool.query(
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

    if (pricing.rows.length === 0) {
      return res.status(400).json({
        message: `Vehicle pricing unavailable for ${vehicleType} (${normalizedTripType}).`,
      });
    }

    const rate = Number(pricing.rows[0].rate_per_km);

    if (!Number.isFinite(rate) || rate <= 0) {
      return res.status(400).json({
        message: "Invalid vehicle pricing configuration.",
      });
    }

    // 6. CALCULATE FARE

    const fare = calculateFare(
      numericDistance,
      rate
    );

    if (!Number.isFinite(fare) || fare <= 0) {
      return res.status(400).json({
        message: "Unable to calculate booking fare.",
      });
    }

    // 7. GENERATE BOOKING REFERENCE

    const reference =
      "GT-" +
      Date.now() +
      "-" +
      Math.floor(Math.random() * 1000);

    // 8. INSERT BOOKING INTO DATABASE

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

    // 9. SUCCESS RESPONSE

    return res.status(201).json({
      message: "Booking created successfully",
      booking: result.rows[0],
      pricing: {
        tripType: normalizedTripType,
        ratePerKm: rate,
        distanceKm: numericDistance,
        totalFare: fare,
      },
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
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
});

// ========================================
// MY BOOKINGS
// GET /api/bookings/my
// ========================================

router.get("/my", authenticate, async (req, res) => {
  try {
    // 1. VALIDATE USER

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: "Unauthorized. Please login again.",
      });
    }

    // 2. FETCH USER BOOKINGS

    const result = await pool.query(
      `
      SELECT *
      FROM bookings
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [req.user.id]
    );

    // 3. SUCCESS RESPONSE

    return res.status(200).json(result.rows);

  } catch (error) {
    console.error("MY BOOKINGS ERROR:", error);

    return res.status(500).json({
      message: "Unable to load bookings",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
});

// ========================================
// GET USER NOTIFICATIONS
// GET /api/bookings/notifications/:userId
// ========================================

router.get(
  "/notifications/:userId",
  authenticate,
  async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          message: "Unauthorized. Please login again.",
        });
      }

      const { userId } = req.params;

      // Users can only access their own notifications.
      // Admins can access notifications for other users.

      if (
        String(req.user.id) !== String(userId) &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({
          message: "Access denied.",
        });
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
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : undefined,
      });
    }
  }
);

// ========================================
// MARK NOTIFICATION AS READ
// PATCH /api/bookings/notifications/:id/read
// ========================================

router.patch(
  "/notifications/:id/read",
  authenticate,
  async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          message: "Unauthorized. Please login again.",
        });
      }

      const { id } = req.params;

      const result = await pool.query(
        `
        UPDATE notifications
        SET is_read = TRUE
        WHERE id = $1
          AND (
            user_id = $2
            OR $3 = 'admin'
          )
        RETURNING *
        `,
        [
          id,
          req.user.id,
          req.user.role || "customer",
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Notification not found or access denied.",
        });
      }

      return res.status(200).json({
        message: "Notification marked as read",
      });

    } catch (error) {
      console.error("MARK NOTIFICATION READ ERROR:", error);

      return res.status(500).json({
        message: "Failed to update notification",
      });
    }
  }
);

export default router;