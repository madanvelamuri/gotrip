import express from "express";
import pool from "../db.js";
import {
  authenticate,
  adminOnly
} from "../middleware/auth.js";

const router = express.Router();

/*
========================================
GET ALL BOOKINGS (Admin Only)
========================================
Endpoint: GET /api/admin/bookings
*/
router.get(
  "/bookings",
  authenticate,
  adminOnly,
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT
          b.*,
          u.name,
          u.mobile,
          u.email
        FROM bookings b
        JOIN users u
        ON b.user_id = u.id
        ORDER BY b.created_at DESC
        `
      );

      res.json(result.rows);
    } catch (error) {
      console.error("Admin bookings fetch error:", error);
      res.status(500).json({ message: "Server error while fetching bookings." });
    }
  }
);

/*
========================================
UPDATE BOOKING STATUS & NOTIFY (Admin Only)
========================================
Endpoint: PATCH /api/admin/bookings/:id/status
*/
router.patch(
  "/bookings/:id/status",
  authenticate,
  adminOnly,
  async (req, res) => {
    try {
      const { status } = req.body;
      const bookingId = req.params.id;

      if (!status) {
        return res.status(400).json({ message: "Status is required." });
      }

      // Update booking status
      const result = await pool.query(
        `
        UPDATE bookings
        SET status = $1
        WHERE id = $2
        RETURNING *
        `,
        [status.toLowerCase(), bookingId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Booking not found." });
      }

      const booking = result.rows[0];

      // Automatically trigger a real-time notification for the customer
      await pool.query(
        `
        INSERT INTO notifications (user_id, title, message)
        VALUES ($1, $2, $3)
        `,
        [
          booking.user_id,
          `Booking ${status.toUpperCase()}`,
          `Your booking reference ${booking.booking_reference} has been ${status.toLowerCase()} by admin.`
        ]
      );

      res.json({
        message: "Booking status updated successfully",
        booking: booking
      });

    } catch (error) {
      console.error("Admin status update error:", error);
      res.status(500).json({ message: "Server error while updating booking status." });
    }
  }
);

/*
========================================
UPDATE VEHICLE PRICING (Admin Only)
========================================
Endpoint: PUT/PATCH /api/admin/pricing/:id
*/
router.all(
  "/pricing/:id",
  authenticate,
  adminOnly,
  async (req, res) => {
    try {
      const { ratePerKm } = req.body;

      if (!ratePerKm || isNaN(ratePerKm)) {
        return res.status(400).json({ message: "A valid rate per KM is required." });
      }

      const result = await pool.query(
        `
        UPDATE pricing
        SET
          rate_per_km = $1
        WHERE id = $2
        RETURNING *
        `,
        [
          ratePerKm,
          req.params.id
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Pricing tier not found." });
      }

      res.json({
        message: "Pricing updated successfully",
        pricing: result.rows[0]
      });

    } catch (error) {
      console.error("Admin pricing update error:", error);
      res.status(500).json({ message: "Server error while updating pricing." });
    }
  }
);

/*
========================================
GET SUPPORT DATA & FEEDBACK (Admin Only)
========================================
Endpoint: GET /api/admin/support-data
*/
router.get(
  "/support-data",
  authenticate,
  adminOnly,
  async (req, res) => {
    try {
      const feedbackResult = await pool.query(
        `SELECT * FROM customer_feedback ORDER BY created_at DESC`
      );
      const ticketsResult = await pool.query(
        `SELECT * FROM support_tickets ORDER BY created_at DESC`
      );

      res.json({
        feedback: feedbackResult.rows,
        tickets: ticketsResult.rows
      });
    } catch (error) {
      console.error("Admin support data fetch error:", error);
      res.status(500).json({ message: "Server error while fetching support data." });
    }
  }
);

/*
========================================
UPDATE SUPPORT TICKET STATUS & NOTIFY (Admin Only)
========================================
Endpoint: PATCH /api/admin/tickets/:id/status
*/
router.patch(
  "/tickets/:id/status",
  authenticate,
  adminOnly,
  async (req, res) => {
    try {
      const { status } = req.body;
      const ticketId = req.params.id;

      if (!status) {
        return res.status(400).json({ message: "Status is required." });
      }

      const result = await pool.query(
        `
        UPDATE support_tickets
        SET status = $1
        WHERE id = $2
        RETURNING *
        `,
        [status.toLowerCase(), ticketId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Support ticket not found." });
      }

      const ticket = result.rows[0];

      // Automatically trigger a real-time notification for the customer if linked to a user account
      if (ticket.user_id) {
        await pool.query(
          `
          INSERT INTO notifications (user_id, title, message)
          VALUES ($1, $2, $3)
          `,
          [
            ticket.user_id,
            `Support Ticket Updated`,
            `Your support ticket regarding "${ticket.subject}" is now marked as: ${status.toUpperCase()}`
          ]
        );
      }

      res.json({
        message: "Ticket status updated successfully",
        ticket: ticket
      });

    } catch (error) {
      console.error("Admin ticket status update error:", error);
      res.status(500).json({ message: "Server error while updating ticket status." });
    }
  }
);

/*
========================================
RESOLVE SUPPORT TICKET & NOTIFY (Admin Only)
========================================
Endpoint: PATCH /api/admin/tickets/:id/resolve
*/
router.patch(
  "/tickets/:id/resolve",
  authenticate,
  adminOnly,
  async (req, res) => {
    try {
      const { resolution, status } = req.body;
      const ticketId = req.params.id;

      // Optional: Add resolution column if not present via SQL: 
      // ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS resolution TEXT;

      const result = await pool.query(
        `
        UPDATE support_tickets
        SET status = $1, resolution = $2
        WHERE id = $3
        RETURNING *
        `,
        [status || "resolved", resolution || "", ticketId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Support ticket not found." });
      }

      const ticket = result.rows[0];

      // Automatically trigger a real-time notification for the customer
      if (ticket.user_id) {
        await pool.query(
          `
          INSERT INTO notifications (user_id, title, message)
          VALUES ($1, $2, $3)
          `,
          [
            ticket.user_id,
            `Support Ticket Resolved (#TK-${ticket.id})`,
            `Admin Response: "${resolution || 'Your issue has been addressed.'}"`
          ]
        );
      }

      res.json({
        message: "Ticket response submitted successfully",
        ticket: ticket
      });

    } catch (error) {
      console.error("Admin ticket resolution error:", error);
      res.status(500).json({ message: "Server error while saving ticket resolution." });
    }
  }
);

export default router;