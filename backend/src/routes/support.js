import express from "express";
import pool from "../db.js";

const router = express.Router();

/*
========================================
SUBMIT FEEDBACK
========================================
*/
router.post("/feedback", async (req, res) => {
  try {
    const { userId, rating, comments } = req.body;

    await pool.query(
      `INSERT INTO customer_feedback
       (user_id, rating, comments)
       VALUES ($1, $2, $3)`,
      [userId || null, rating, comments]
    );

    return res.json({
      message: "Thank you for your valuable feedback!",
    });

  } catch (error) {
    console.error("Feedback submission error:", error);

    return res.status(500).json({
      message: "Failed to submit feedback.",
    });
  }
});

/*
========================================
SUBMIT SUPPORT TICKET
========================================
*/
router.post("/ticket", async (req, res) => {
  try {
    // Accept both existing and frontend field names.
    const userId = req.body.userId || null;

    const subject =
      req.body.subject ||
      req.body.category ||
      req.body.subjectCategory ||
      "General Query";

    const message =
      req.body.message ||
      req.body.description ||
      req.body.queryDescription;

    // Validate required fields.
    if (!message || !String(message).trim()) {
      return res.status(400).json({
        success: false,
        message: "Query description is required.",
      });
    }

    // Insert support ticket.
    await pool.query(
      `INSERT INTO support_tickets
       (user_id, subject, message, status)
       VALUES ($1, $2, $3, 'open')`,
      [userId, subject, message.trim()]
    );

    return res.status(201).json({
      success: true,
      message:
        "Support ticket submitted successfully. Our team will contact you shortly.",
    });

  } catch (error) {
    console.error("Support ticket error:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      table: error.table,
      column: error.column,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to submit support ticket.",
    });
  }
});

export default router;