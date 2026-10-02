import express from "express";
import pool from "../db.js";

const router = express.Router();

router.post("/verify", async (req, res) => {
  try {
    const { userId, from, to, distanceKm, vehicleType, travelDate, amount, transactionRef } = req.body;

    if (!userId || !from || !distanceKm || !vehicleType || !travelDate || !amount || !transactionRef) {
      return res.status(400).json({
        success: false,
        message: "All booking and payment reference details are required.",
      });
    }

    const bookingRef = `GT-${Math.floor(100000 + Math.random() * 900000)}`;

    const bookingResult = await pool.query(
      `
      INSERT INTO bookings (
        user_id,
        booking_reference,
        from_location,
        to_location,
        distance_km,
        vehicle_type,
        travel_date,
        total_fare,
        rate_per_km,
        status,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', CURRENT_TIMESTAMP)
      RETURNING id, booking_reference, created_at, travel_date
      `,
      [userId, bookingRef, from, to || "Local City Rental", distanceKm, vehicleType, travelDate, 0, 0]
    );

    const newBooking = bookingResult.rows[0];

    await pool.query(
      `
      INSERT INTO payment_verifications (
        booking_id,
        user_id,
        amount,
        upi_id,
        transaction_ref,
        status
      )
      VALUES ($1, $2, $3, '8465826241-3@ybl', $4, 'pending')
      `,
      [newBooking.id, userId, amount, transactionRef.trim()]
    );

    await pool.query(
      `
      INSERT INTO notifications (user_id, title, message, is_read)
      VALUES ($1, $2, $3, false)
      `,
      [
        userId,
        "Advance Payment Submitted",
        `Your advance payment (UTR: ${transactionRef.trim().toUpperCase()}) for booking ${newBooking.booking_reference} has been received and is pending admin verification.`
      ]
    );

    return res.status(201).json({
      success: true,
      message: `Advance payment proof submitted successfully! Reference: ${newBooking.booking_reference}`,
      bookingReference: newBooking.booking_reference
    });

  } catch (error) {
    console.error("PAYMENT VERIFICATION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while processing payment verification.",
    });
  }
});

export default router;