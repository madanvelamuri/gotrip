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
      "INSERT INTO customer_feedback (user_id, rating, comments) VALUES ($1, $2, $3)",
      [userId || null, rating, comments]
    );
    res.json({ message: "Thank you for your valuable feedback!" });
  } catch (error) {
    console.error("Feedback submission error:", error);
    res.status(500).json({ message: "Failed to submit feedback." });
  }
});

/*
========================================
SUBMIT SUPPORT TICKET
========================================
*/
router.post("/ticket", async (req, res) => {
  try {
    const { userId, subject, message } = req.body;
    
    // Inserts support ticket with subject category and message
    await pool.query(
      "INSERT INTO support_tickets (user_id, subject, message, status) VALUES ($1, $2, $3, 'open')",
      [userId || null, subject || "General Query", message]
    );

    res.json({ message: "Support ticket submitted successfully. Our team will contact you shortly." });
  } catch (error) {
    console.error("Support ticket error:", error);
    res.status(500).json({ message: "Failed to submit support ticket." });
  }
});

export default router;