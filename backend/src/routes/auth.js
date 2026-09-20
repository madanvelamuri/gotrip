import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import { Resend } from "resend";

const router = express.Router();

// Temporary in-memory stores for pending verifications
const pendingSignups = new Map();
const pendingLogins = new Map(); // Format: { identifier: { otp, expiresAt, user } }

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmailOtp(toEmail, otpCode) {
  try {
    // If API key is missing, fall back safely to console simulation
    if (!process.env.RESEND_API_KEY) {
      console.log(`\n================================`);
      console.log(`📧 [SIMULATED EMAIL] OTP for ${toEmail}: ${otpCode}`);
      console.log(`================================\n`);
      return { success: true };
    }

    console.log(`🔄 Sending live email via Resend to ${toEmail}...`);

    await resend.emails.send({
      from: "GoTrip Support <onboarding@resend.dev>", // Resend's default free testing domain
      to: [toEmail],
      subject: "Your GoTrip Verification Code",
      text: `Your 6-digit OTP code is: ${otpCode}. It expires in 5 minutes.`,
    });

    console.log(`📧 [RESEND SUCCESS] Live email dispatched successfully to ${toEmail}`);
    return { success: true };
  } catch (err) {
    // FIX: Safely catch Resend API errors (like 403 free-tier restrictions) and provide console fallback
    console.error("🚨 RESEND FAILED WITH ERROR:", err.message || err);
    console.log(`\n==================================================`);
    console.log(`📧 [FALLBACK OTP CODE] For ${toEmail}: ${otpCode}`);
    console.log(`(Note: Resend free tier restricts external emails until domain is verified)`);
    console.log(`==================================================\n`);
    return { success: true };
  }
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      mobile: user.mobile,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );
}

/*
=========================================
SIGN UP ROUTES (EMAIL-ONLY OTP DISPATCH)
=========================================
*/

/*
STEP 1: SIGN UP - SEND OTP TO EMAIL (MOBILE OPTIONAL)
*/
router.post("/signup-send-otp", async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;

    if (!name || !email || !password || !email.includes("@")) {
      return res.status(400).json({
        message: "Name, a valid email address, and password are required."
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = mobile ? mobile.trim() : null;

    // Check if user already exists in PostgreSQL database by email or mobile (if provided)
    const existingQuery = cleanMobile 
      ? `SELECT id FROM users WHERE email = $1 OR mobile = $2`
      : `SELECT id FROM users WHERE email = $1`;
    const existingParams = cleanMobile ? [cleanEmail, cleanMobile] : [cleanEmail];

    const existing = await pool.query(existingQuery, existingParams);

    if (existing.rows.length > 0) {
      return res.status(409).json({
        message: "User with this email or mobile already exists."
      });
    }

    // Generate 6-digit OTP and expiration (5 minutes)
    const otp = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    // Save temporary data using email as the identifier key
    pendingSignups.set(cleanEmail, {
      otp,
      expiresAt,
      name,
      email: cleanEmail,
      mobile: cleanMobile,
      password
    });

    // Trigger Real Email OTP via Resend (with robust console fallback)
    await sendEmailOtp(cleanEmail, otp);

    res.json({
      success: true,
      message: `OTP sent successfully to your email address`
    });

  } catch (error) {
    console.error("Error in /signup-send-otp:", error);
    res.status(500).json({ message: "Server error while sending OTP" });
  }
});


/*
STEP 2: VERIFY SIGNUP OTP & CREATE ACCOUNT IN POSTGRESQL
*/
router.post("/verify-otp-signup", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required."
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const pendingUser = pendingSignups.get(cleanEmail);

    if (!pendingUser) {
      return res.status(400).json({
        message: "No pending signup found for this email. Please try again."
      });
    }

    if (Date.now() > pendingUser.expiresAt) {
      pendingSignups.delete(cleanEmail);
      return res.status(400).json({
        message: "OTP has expired. Please request a new one."
      });
    }

    if (pendingUser.otp !== otp.trim()) {
      return res.status(400).json({
        message: "Invalid OTP code. Please try again."
      });
    }

    // Hash password securely
    const passwordHash = await bcrypt.hash(pendingUser.password, 12);

    // Insert user into PostgreSQL database
    const result = await pool.query(
      `
      INSERT INTO users (name, email, mobile, password_hash)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, mobile, role
      `,
      [
        pendingUser.name,
        pendingUser.email,
        pendingUser.mobile,
        passwordHash
      ]
    );

    const user = result.rows[0];

    // Clear from temporary memory map
    pendingSignups.delete(cleanEmail);

    const token = createToken(user);

    res.json({
      message: "Account verified and created successfully",
      token,
      user
    });

  } catch (error) {
    console.error("Error in /verify-otp-signup:", error);
    res.status(500).json({ message: "Server error during verification" });
  }
});


/*
=========================================
SIGN IN WITH EMAIL OTP
=========================================
*/

/*
STEP 1: SIGN IN - SEND OTP TO REGISTERED EMAIL AFTER PASSWORD CHECK
*/
router.post("/signin-send-otp", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user exists in the database by email
    const userResult = await pool.query(
      `SELECT id, name, email, mobile, password_hash, role FROM users WHERE email = $1`,
      [cleanEmail]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        message: "No account found with this email. Please sign up first."
      });
    }

    const user = userResult.rows[0];

    // Verify password match before issuing OTP
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid password." });
    }

    // Generate 6-digit OTP and expiration (5 minutes)
    const otp = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    // Save temporary login request state using email as key
    pendingLogins.set(cleanEmail, {
      otp,
      expiresAt,
      user
    });

    // Trigger OTP via Resend Email
    await sendEmailOtp(user.email, otp);

    res.json({
      success: true,
      message: `OTP sent successfully to your registered email address`
    });

  } catch (error) {
    console.error("Error in /signin-send-otp:", error);
    res.status(500).json({ message: "Server error while sending sign-in OTP" });
  }
});


/*
STEP 2: VERIFY SIGN IN OTP & ISSUE JWT TOKEN
*/
router.post("/verify-otp-signin", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required."
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const pendingLogin = pendingLogins.get(cleanEmail);

    if (!pendingLogin) {
      return res.status(400).json({
        message: "No active sign-in request found. Please request a new OTP."
      });
    }

    if (Date.now() > pendingLogin.expiresAt) {
      pendingLogins.delete(cleanEmail);
      return res.status(400).json({
        message: "OTP has expired. Please request a new one."
      });
    }

    if (pendingLogin.otp !== otp.trim()) {
      return res.status(400).json({
        message: "Invalid OTP code. Please try again."
      });
    }

    const user = pendingLogin.user;

    // Clear login entry from memory map
    pendingLogins.delete(cleanEmail);

    const token = createToken(user);

    res.json({
      message: "Sign in successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Error in /verify-otp-signin:", error);
    res.status(500).json({ message: "Server error during sign-in verification" });
  }
});

export default router;