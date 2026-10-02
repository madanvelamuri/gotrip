
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import { Resend } from "resend";
import { randomInt } from "crypto";

const router = express.Router();

// ========================================
// EMAIL SERVICE
// ========================================

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// ========================================
// TEMPORARY OTP STORAGE
// ========================================

const pendingSignups = new Map();
const pendingResets = new Map();

const OTP_EXPIRY = 5 * 60 * 1000;
const RESET_OTP_EXPIRY = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

// ========================================
// GENERATE SECURE OTP
// ========================================

function generateOTP() {
  return randomInt(100000, 1000000).toString();
}

// ========================================
// GENERATE JWT TOKEN
// ========================================

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

// ========================================
// SEND EMAIL OTP
// ========================================

async function sendOTPEmail(email, otp, purpose = "signup") {
  if (!resend) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not configured.");
    }

    console.log("----------------------------------");
    console.log(`Development OTP for ${email}: ${otp}`);
    console.log("----------------------------------");

    return;
  }

  const isReset = purpose === "reset";

  const { data, error } = await resend.emails.send({
    from:
      process.env.EMAIL_FROM ||
      "GoTrip Support <onboarding@resend.dev>",

    to: [email],

    subject: isReset
      ? "GoTrip Password Reset Code"
      : "GoTrip Email Verification",

    text: isReset
      ? `Your GoTrip password reset code is ${otp}. It expires in 10 minutes.`
      : `Your GoTrip verification code is ${otp}. It expires in 5 minutes.`,
  });

  if (error) {
    console.error("EMAIL SERVICE ERROR:", error);

    throw new Error(
      error.message || "Unable to send OTP email."
    );
  }

  console.log("OTP email sent:", data?.id);
}

// ========================================
// SIGNUP - STEP 1
// SEND EMAIL OTP
// POST /api/auth/signup-send-otp
// ========================================

router.post("/signup-send-otp", async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required.",
      });
    }

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid signup information.",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile =
      typeof mobile === "string" && mobile.trim()
        ? mobile.trim()
        : null;

    if (!cleanName || cleanName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid name.",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    if (password.length < 6 || password.length > 128) {
      return res.status(400).json({
        success: false,
        message: "Password must contain 6 to 128 characters.",
      });
    }

    // Check existing email/mobile

    const existing = await pool.query(
      `
      SELECT id
      FROM users
      WHERE LOWER(email) = LOWER($1)
         OR ($2::varchar IS NOT NULL AND mobile = $2)
      LIMIT 1
      `,
      [cleanEmail, cleanMobile]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "An account with this email or mobile already exists.",
      });
    }

    // Hash password before temporary storage

    const passwordHash = await bcrypt.hash(password, 12);

    const otp = generateOTP();

    pendingSignups.set(cleanEmail, {
      otp,
      passwordHash,
      name: cleanName,
      email: cleanEmail,
      mobile: cleanMobile,
      expiresAt: Date.now() + OTP_EXPIRY,
      attempts: 0,
    });

    try {
      await sendOTPEmail(cleanEmail, otp, "signup");
    } catch (emailError) {
      pendingSignups.delete(cleanEmail);

      console.error("SIGNUP OTP EMAIL ERROR:", emailError.message);

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
    console.error("SIGNUP OTP ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while sending signup OTP.",
    });
  }
});

// ========================================
// SIGNUP - STEP 2
// VERIFY OTP AND CREATE ACCOUNT
// POST /api/auth/verify-otp-signup
// ========================================

router.post("/verify-otp-signup", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (
      typeof email !== "string" ||
      !otp
    ) {
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

    pendingUser.attempts += 1;

    if (pendingUser.attempts > MAX_OTP_ATTEMPTS) {
      pendingSignups.delete(cleanEmail);

      return res.status(429).json({
        success: false,
        message: "Too many incorrect attempts. Please request a new OTP.",
      });
    }

    if (pendingUser.otp !== cleanOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please check and try again.",
      });
    }

    // Check again to prevent duplicate account creation

    const existing = await pool.query(
      `
      SELECT id
      FROM users
      WHERE LOWER(email) = LOWER($1)
         OR ($2::varchar IS NOT NULL AND mobile = $2)
      LIMIT 1
      `,
      [pendingUser.email, pendingUser.mobile]
    );

    if (existing.rows.length > 0) {
      pendingSignups.delete(cleanEmail);

      return res.status(409).json({
        success: false,
        message: "An account with this email or mobile already exists.",
      });
    }

    // Create account

    const result = await pool.query(
      `
      INSERT INTO users
      (
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
        pendingUser.passwordHash,
      ]
    );

    const user = result.rows[0];

    // Remove temporary signup data

    pendingSignups.delete(cleanEmail);

    // Generate JWT

    const token = createToken(user);

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      token,
      user,
    });

  } catch (error) {
    console.error("SIGNUP VERIFICATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error during signup verification.",
    });
  }
});

// ========================================
// SIGN IN
// EMAIL OR MOBILE
// POST /api/auth/signin
// ========================================

router.post("/signin", async (req, res) => {
  try {
    const { login, password } = req.body;

    if (
      typeof login !== "string" ||
      typeof password !== "string" ||
      !login.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email/mobile and password are required.",
      });
    }

    const identifier = login.trim();

    const isEmail = identifier.includes("@");

    const query = isEmail
      ? `
        SELECT id, name, email, mobile, password_hash, role
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
      `
      : `
        SELECT id, name, email, mobile, password_hash, role
        FROM users
        WHERE mobile = $1
        LIMIT 1
      `;

    const result = await pool.query(query, [identifier]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email/mobile or password.",
      });
    }

    const user = result.rows[0];

    const validPassword = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid email/mobile or password.",
      });
    }

    // Generate JWT with user ID and role

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
    console.error("SIGN-IN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error during sign-in.",
    });
  }
});

// ========================================
// FORGOT PASSWORD - STEP 1
// SEND RESET OTP
// POST /api/auth/forgot-password
// ========================================

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid email address is required.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const userResult = await pool.query(
      `
      SELECT id, email
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [cleanEmail]
    );

    // Generic response prevents account enumeration

    const genericResponse = {
      success: true,
      message: "If the account exists, a password reset code will be sent.",
    };

    if (userResult.rows.length === 0) {
      return res.status(200).json(genericResponse);
    }

    const code = generateOTP();

    pendingResets.set(cleanEmail, {
      code,
      expiresAt: Date.now() + RESET_OTP_EXPIRY,
      attempts: 0,
    });

    try {
      await sendOTPEmail(cleanEmail, code, "reset");
    } catch (emailError) {
      pendingResets.delete(cleanEmail);

      console.error("RESET OTP EMAIL ERROR:", emailError.message);

      return res.status(502).json({
        success: false,
        message: "Unable to send password reset email. Please try again later.",
      });
    }

    return res.status(200).json(genericResponse);

  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while processing request.",
    });
  }
});

// ========================================
// FORGOT PASSWORD - STEP 2
// VERIFY OTP AND UPDATE PASSWORD
// POST /api/auth/reset-password
// ========================================

router.post("/reset-password", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (
      typeof email !== "string" ||
      !code ||
      typeof newPassword !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Email, reset code, and new password are required.",
      });
    }

    if (
      newPassword.length < 6 ||
      newPassword.length > 128
    ) {
      return res.status(400).json({
        success: false,
        message: "New password must contain 6 to 128 characters.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = String(code).trim();

    const resetRecord = pendingResets.get(cleanEmail);

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        message: "No active password reset request found. Please request a new code.",
      });
    }

    if (Date.now() > resetRecord.expiresAt) {
      pendingResets.delete(cleanEmail);

      return res.status(400).json({
        success: false,
        message: "Reset code has expired. Please request a new one.",
      });
    }

    resetRecord.attempts += 1;

    if (resetRecord.attempts > MAX_OTP_ATTEMPTS) {
      pendingResets.delete(cleanEmail);

      return res.status(429).json({
        success: false,
        message: "Too many incorrect attempts. Please request a new code.",
      });
    }

    if (resetRecord.code !== cleanCode) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset code. Please check and try again.",
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    const updateResult = await pool.query(
      `
      UPDATE users
      SET password_hash = $1
      WHERE LOWER(email) = LOWER($2)
      RETURNING id
      `,
      [passwordHash, cleanEmail]
    );

    if (updateResult.rows.length === 0) {
      pendingResets.delete(cleanEmail);

      return res.status(404).json({
        success: false,
        message: "Account not found.",
      });
    }

    pendingResets.delete(cleanEmail);

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now sign in with your new password.",
    });

  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error during password reset.",
    });
  }
});

export default router;