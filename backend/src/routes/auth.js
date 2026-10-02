
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import { Resend } from "resend";

const router = express.Router();

// Store pending signup verifications temporarily.
// These are cleared when the OTP expires or signup succeeds.
const pendingSignups = new Map();

// Initialize Resend only when an API key is configured.
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Generate a six-digit OTP.
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate JWT token.
function createToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
}

// Send signup OTP through Resend.
async function sendEmailOtp(toEmail, otpCode) {
  // Development-only fallback.
  if (!resend) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not configured.");
    }

    console.log("------------------------------------");
    console.log(`Development OTP for ${toEmail}: ${otpCode}`);
    console.log("------------------------------------");

    return;
  }

  const { data, error } = await resend.emails.send({
    from:
      process.env.EMAIL_FROM ||
      "GoTrip Support <onboarding@resend.dev>",
    to: [toEmail],
    subject: "Your GoTrip Verification Code",
    text: `Your GoTrip verification code is ${otpCode}. It expires in 5 minutes.`,
  });

  if (error) {
    console.error("Resend email error:", error);
    throw new Error(error.message || "Unable to send verification email.");
  }

  console.log("Signup OTP email sent:", data?.id);
}

/*
================================================
SIGN UP - STEP 1: SEND EMAIL OTP
POST /api/auth/signup-send-otp
================================================
*/

router.post("/signup-send-otp", async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required.",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = mobile?.trim() || null;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 6 characters.",
      });
    }

    // Check whether email or mobile already exists.
    const existingQuery = cleanMobile
      ? `SELECT id FROM users WHERE email = $1 OR mobile = $2 LIMIT 1`
      : `SELECT id FROM users WHERE email = $1 LIMIT 1`;

    const existingParams = cleanMobile
      ? [cleanEmail, cleanMobile]
      : [cleanEmail];

    const existing = await pool.query(
      existingQuery,
      existingParams
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "An account with this email or mobile already exists.",
      });
    }

    const otp = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    // Store pending signup information.
    pendingSignups.set(cleanEmail, {
      otp,
      expiresAt,
      name: cleanName,
      email: cleanEmail,
      mobile: cleanMobile,
      password,
    });

    // Send OTP.
    try {
      await sendEmailOtp(cleanEmail, otp);
    } catch (emailError) {
      pendingSignups.delete(cleanEmail);

      return res.status(502).json({
        success: false,
        message: "Unable to send OTP email. Please try again later.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Signup OTP sent successfully.",
    });

  } catch (error) {
    console.error("Signup OTP error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while sending signup OTP.",
    });
  }
});


/*
================================================
SIGN UP - STEP 2: VERIFY OTP AND CREATE ACCOUNT
POST /api/auth/verify-otp-signup
================================================
*/

router.post("/verify-otp-signup", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    const pendingUser = pendingSignups.get(cleanEmail);

    if (!pendingUser) {
      return res.status(400).json({
        success: false,
        message: "No pending signup found. Please request a new OTP.",
      });
    }

    if (Date.now() > pendingUser.expiresAt) {
      pendingSignups.delete(cleanEmail);

      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    if (pendingUser.otp !== cleanOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please check and try again.",
      });
    }

    // Hash password before storing it.
    const passwordHash = await bcrypt.hash(
      pendingUser.password,
      12
    );

    // Create user in PostgreSQL.
    const result = await pool.query(
      `
      INSERT INTO users (
        name,
        email,
        mobile,
        password_hash
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, mobile, role
      `,
      [
        pendingUser.name,
        pendingUser.email,
        pendingUser.mobile,
        passwordHash,
      ]
    );

    const user = result.rows[0];

    // Clear pending signup.
    pendingSignups.delete(cleanEmail);

    // Generate JWT.
    const token = createToken(user);

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      token,
      user,
    });

  } catch (error) {
    console.error("Signup verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error during signup verification.",
    });
  }
});


/*
================================================
SIGN IN - EMAIL AND PASSWORD ONLY
POST /api/auth/signin
NO OTP REQUIRED
================================================
*/

router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find registered user.
    const userResult = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        mobile,
        password_hash,
        role
      FROM users
      WHERE email = $1
      LIMIT 1
      `,
      [cleanEmail]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Account not found. Please sign up first.",
      });
    }

    const user = userResult.rows[0];

    // Verify password.
    const validPassword = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Generate JWT immediately. No OTP step.
    const token = createToken(user);

    return res.status(200).json({
      success: true,
      message: "Sign in successful.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      },
    });

  } catch (error) {
    console.error("Signin error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error during sign in.",
    });
  }
});

export default router;