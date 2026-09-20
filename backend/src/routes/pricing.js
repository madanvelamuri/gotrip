import express from "express";
import pool from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { tripType } = req.query;

    let query = `
      SELECT id, vehicle_type, rate_per_km, trip_type, active
      FROM pricing
      WHERE active = true
    `;
    let params = [];

    // If a specific tripType is passed (e.g. from Dashboard), filter it. Otherwise return all for Admin.
    if (tripType) {
      query += ` AND trip_type = $1`;
      params.push(tripType);
    }

    query += ` ORDER BY id`;

    const result = await pool.query(query, params);
    res.json(result.rows);

  } catch (error) {
    console.error("Pricing fetch error:", error);
    res.status(500).json({ message: "Unable to load pricing" });
  }
});

export default router;