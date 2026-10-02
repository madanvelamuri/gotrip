import express from "express";
import pool from "../db.js";

const router = express.Router();

/*
================================================
SUBMIT ADVANCE PAYMENT PROOF & CREATE BOOKING
POST /api/payments/verify
================================================
*/
router.post("/verify", async (req, res) => {
  try {
    const { userId, from, to, distanceKm, vehicleType, travelDate, amount, transactionRef } = req.body;

    if (!userId || !from || !distanceKm || !vehicleType || !travelDate || !amount || !transactionRef) {
      return res.status(400).json({
        success: false,
        message: "All booking and payment reference details are required.",
      });
    }

    // 1. Create the booking record in 'pending' status awaiting admin approval
    const bookingResult = await pool.query(
      `
      INSERT INTO bookings (
        user_id,
        from_location,
        to_location,
        distance_km,
        vehicle_type,
        travel_date,
        total_fare,
        rate_per_km,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
      RETURNING id, booking_reference
      `,
      [
        userId,
        from,
        to || "Local City Rental",
        distanceKm,
        vehicleType,
        travelDate,
        0, // Fare calculated or updated upon review
        0
      ]
    );

    const newBooking = bookingResult.rows[0];

    // 2. Save the payment verification proof
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

    // 3. Create a notification alert for the user
    await pool.query(
      `
      INSERT INTO notifications (user_id, title, message, is_read)
      VALUES ($1, $2, $3, false)
      `,
      [
        userId,
        "Advance Payment Submitted",
        `Your advance payment (Ref: ${transactionRef.trim().toUpperCase()}) for booking ${newBooking.booking_reference} has been received and is pending admin verification.`
      ]
    );

    return res.status(201).json({
      success: true,
      message: `Advance payment proof submitted successfully! Reference: ${newBooking.booking_reference}`,
      bookingReference: newBooking.booking_reference
    });

  } catch (error) {
    console.error("Payment verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while processing payment verification.",
    });
  }
});

export default router;