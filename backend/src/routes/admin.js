
import express from "express";
import pool from "../db.js";
import {
  authenticate,
  authorizeAdmin,
} from "../middleware/auth.js";

const router = express.Router();

// ========================================
// ADMIN AUTHENTICATION
// ========================================

const adminAccess = [authenticate, authorizeAdmin];

// ========================================
// GET ALL BOOKINGS
// GET /api/admin/bookings
// ========================================

router.get("/bookings", ...adminAccess, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        b.*,
        u.name AS customer_name,
        u.email,
        u.mobile,
        pv.id AS payment_id,
        pv.transaction_ref,
        pv.upi_id,
        pv.amount AS advance_amount,
        pv.status AS payment_status,
        pv.created_at AS payment_created_at
      FROM bookings b
      LEFT JOIN users u
        ON b.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT *
        FROM payment_verifications
        WHERE booking_id = b.id
        ORDER BY created_at DESC
        LIMIT 1
      ) pv ON TRUE
      ORDER BY b.created_at DESC
      `
    );

    return res.status(200).json(result.rows);

  } catch (error) {
    console.error("ADMIN BOOKINGS ERROR:", error);

    return res.status(500).json({
      message: "Server error while fetching bookings.",
    });
  }
});

// ========================================
// GET PAYMENT DETAILS FOR ONE BOOKING
// GET /api/admin/bookings/:id/payment
// ========================================

router.get(
  "/bookings/:id/payment",
  ...adminAccess,
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `
        SELECT
          pv.*,
          b.booking_reference,
          b.total_fare,
          b.from_location,
          b.to_location,
          u.name AS customer_name,
          u.email,
          u.mobile
        FROM payment_verifications pv
        JOIN bookings b
          ON pv.booking_id = b.id
        LEFT JOIN users u
          ON pv.user_id = u.id
        WHERE pv.booking_id = $1
        ORDER BY pv.created_at DESC
        LIMIT 1
        `,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Payment details not found for this booking.",
        });
      }

      return res.status(200).json(result.rows[0]);

    } catch (error) {
      console.error("ADMIN PAYMENT FETCH ERROR:", error);

      return res.status(500).json({
        message: "Unable to fetch payment details.",
      });
    }
  }
);

// ========================================
// UPDATE PAYMENT VERIFICATION STATUS
// PATCH /api/admin/bookings/:id/payment-status
// ========================================

router.patch(
  "/bookings/:id/payment-status",
  ...adminAccess,
  async (req, res) => {
    const { status } = req.body;

    const normalizedStatus = String(status || "")
      .trim()
      .toLowerCase();

    if (!["verified", "rejected"].includes(normalizedStatus)) {
      return res.status(400).json({
        message: "Payment status must be verified or rejected.",
      });
    }

    let client;

    try {
      client = await pool.connect();

      await client.query("BEGIN");

      // Lock the latest payment record for this booking.

      const paymentResult = await client.query(
        `
        SELECT *
        FROM payment_verifications
        WHERE booking_id = $1
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE
        `,
        [req.params.id]
      );

      if (paymentResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          message: "Payment verification record not found.",
        });
      }

      const payment = paymentResult.rows[0];

      if (payment.status !== "pending") {
        await client.query("ROLLBACK");

        return res.status(409).json({
          message: `Payment has already been marked as ${payment.status}.`,
        });
      }

      // Update payment verification.

      const updatedPayment = await client.query(
        `
        UPDATE payment_verifications
        SET status = $1
        WHERE id = $2
        RETURNING *
        `,
        [normalizedStatus, payment.id]
      );

      // Get booking details.

      const bookingResult = await client.query(
        `
        SELECT *
        FROM bookings
        WHERE id = $1
        FOR UPDATE
        `,
        [payment.booking_id]
      );

      if (bookingResult.rows.length === 0) {
        throw new Error("Associated booking not found.");
      }

      const booking = bookingResult.rows[0];

      // Notify customer.

      const notificationMessage =
        normalizedStatus === "verified"
          ? `Your payment for booking ${booking.booking_reference} has been verified.`
          : `Your payment for booking ${booking.booking_reference} was rejected. Please contact GoTrip support.`;

      await client.query(
        `
        INSERT INTO notifications
        (
          user_id,
          title,
          message,
          is_read,
          created_at
        )
        VALUES ($1, $2, $3, FALSE, CURRENT_TIMESTAMP)
        `,
        [
          booking.user_id,
          normalizedStatus === "verified"
            ? "Payment Verified"
            : "Payment Rejected",
          notificationMessage,
        ]
      );

      await client.query("COMMIT");

      return res.status(200).json({
        success: true,
        message: `Payment ${normalizedStatus} successfully.`,
        payment: updatedPayment.rows[0],
      });

    } catch (error) {
      if (client) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error("PAYMENT ROLLBACK ERROR:", rollbackError);
        }
      }

      console.error("ADMIN PAYMENT UPDATE ERROR:", error);

      return res.status(500).json({
        message: "Unable to update payment status.",
      });

    } finally {
      if (client) {
        client.release();
      }
    }
  }
);

// ========================================
// UPDATE BOOKING STATUS
// PATCH /api/admin/bookings/:id/status
// ========================================

router.patch(
  "/bookings/:id/status",
  ...adminAccess,
  async (req, res) => {
    try {
      const normalizedStatus = String(req.body.status || "")
        .trim()
        .toLowerCase();

      const allowedStatuses = [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
      ];

      if (!allowedStatuses.includes(normalizedStatus)) {
        return res.status(400).json({
          message: "Invalid booking status.",
          allowedStatuses,
        });
      }

      const result = await pool.query(
        `
        UPDATE bookings
        SET status = $1
        WHERE id = $2
        RETURNING *
        `,
        [normalizedStatus, req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Booking not found.",
        });
      }

      const booking = result.rows[0];

      await pool.query(
        `
        INSERT INTO notifications
        (
          user_id,
          title,
          message,
          is_read,
          created_at
        )
        VALUES ($1, $2, $3, FALSE, CURRENT_TIMESTAMP)
        `,
        [
          booking.user_id,
          `Booking ${normalizedStatus.toUpperCase()}`,
          `Your booking reference ${booking.booking_reference} has been ${normalizedStatus} by GoTrip.`,
        ]
      );

      return res.status(200).json({
        success: true,
        message: "Booking status updated successfully.",
        booking,
      });

    } catch (error) {
      console.error("ADMIN BOOKING STATUS ERROR:", error);

      return res.status(500).json({
        message: "Server error while updating booking status.",
      });
    }
  }
);

// ========================================
// UPDATE VEHICLE PRICING
// PUT/PATCH /api/admin/pricing/:id
// ========================================

async function updatePricing(req, res) {
  try {
    const ratePerKm = Number(req.body.ratePerKm);

    if (!Number.isFinite(ratePerKm) || ratePerKm <= 0) {
      return res.status(400).json({
        message: "A valid rate per KM is required.",
      });
    }

    const result = await pool.query(
      `
      UPDATE pricing
      SET rate_per_km = $1
      WHERE id = $2
      RETURNING *
      `,
      [ratePerKm, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Pricing tier not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Pricing updated successfully.",
      pricing: result.rows[0],
    });

  } catch (error) {
    console.error("ADMIN PRICING UPDATE ERROR:", error);

    return res.status(500).json({
      message: "Server error while updating pricing.",
    });
  }
}

router.put("/pricing/:id", ...adminAccess, updatePricing);
router.patch("/pricing/:id", ...adminAccess, updatePricing);

// ========================================
// GET SUPPORT DATA AND FEEDBACK
// GET /api/admin/support-data
// ========================================

router.get(
  "/support-data",
  ...adminAccess,
  async (req, res) => {
    try {
      const [feedbackResult, ticketsResult] = await Promise.all([
        pool.query(
          `
          SELECT *
          FROM customer_feedback
          ORDER BY created_at DESC
          `
        ),

        pool.query(
          `
          SELECT *
          FROM support_tickets
          ORDER BY created_at DESC
          `
        ),
      ]);

      return res.status(200).json({
        feedback: feedbackResult.rows,
        tickets: ticketsResult.rows,
      });

    } catch (error) {
      console.error("ADMIN SUPPORT DATA ERROR:", error);

      return res.status(500).json({
        message: "Server error while fetching support data.",
      });
    }
  }
);

// ========================================
// UPDATE SUPPORT TICKET STATUS
// PATCH /api/admin/tickets/:id/status
// ========================================

router.patch(
  "/tickets/:id/status",
  ...adminAccess,
  async (req, res) => {
    try {
      const normalizedStatus = String(req.body.status || "")
        .trim()
        .toLowerCase();

      const allowedStatuses = [
        "open",
        "in_progress",
        "resolved",
        "closed",
      ];

      if (!allowedStatuses.includes(normalizedStatus)) {
        return res.status(400).json({
          message: "Invalid support ticket status.",
          allowedStatuses,
        });
      }

      const result = await pool.query(
        `
        UPDATE support_tickets
        SET status = $1
        WHERE id = $2
        RETURNING *
        `,
        [normalizedStatus, req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Support ticket not found.",
        });
      }

      const ticket = result.rows[0];

      if (ticket.user_id) {
        await pool.query(
          `
          INSERT INTO notifications
          (
            user_id,
            title,
            message,
            is_read,
            created_at
          )
          VALUES ($1, $2, $3, FALSE, CURRENT_TIMESTAMP)
          `,
          [
            ticket.user_id,
            "Support Ticket Updated",
            `Your support ticket regarding "${ticket.subject}" is now marked as ${normalizedStatus}.`,
          ]
        );
      }

      return res.status(200).json({
        success: true,
        message: "Ticket status updated successfully.",
        ticket,
      });

    } catch (error) {
      console.error("ADMIN TICKET STATUS ERROR:", error);

      return res.status(500).json({
        message: "Server error while updating ticket status.",
      });
    }
  }
);

// ========================================
// RESOLVE SUPPORT TICKET
// PATCH /api/admin/tickets/:id/resolve
// ========================================

router.patch(
  "/tickets/:id/resolve",
  ...adminAccess,
  async (req, res) => {
    try {
      const { resolution } = req.body;

      if (!resolution || !String(resolution).trim()) {
        return res.status(400).json({
          message: "Resolution message is required.",
        });
      }

      const result = await pool.query(
        `
        UPDATE support_tickets
        SET status = 'resolved',
            resolution = $1
        WHERE id = $2
        RETURNING *
        `,
        [String(resolution).trim(), req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Support ticket not found.",
        });
      }

      const ticket = result.rows[0];

      if (ticket.user_id) {
        await pool.query(
          `
          INSERT INTO notifications
          (
            user_id,
            title,
            message,
            is_read,
            created_at
          )
          VALUES ($1, $2, $3, FALSE, CURRENT_TIMESTAMP)
          `,
          [
            ticket.user_id,
            `Support Ticket Resolved (#TK-${ticket.id})`,
            `Admin response: ${String(resolution).trim()}`,
          ]
        );
      }

      return res.status(200).json({
        success: true,
        message: "Ticket response submitted successfully.",
        ticket,
      });

    } catch (error) {
      console.error("ADMIN TICKET RESOLUTION ERROR:", error);

      return res.status(500).json({
        message: "Server error while saving ticket resolution.",
      });
    }
  }
);

export default router;