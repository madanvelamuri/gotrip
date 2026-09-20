import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function SignUp() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });

  const [otp, setOtp] = useState("");
  const [isOtpStep, setIsOtpStep] = useState(false); // Controls view switch for OTP
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // Step 1: Submit Form Data & Trigger Email OTP generation
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      setError("Please fill all required fields including a valid email.");
      return;
    }

    if (!form.email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    // Optional validation for mobile if user typed anything
    if (form.mobile && !/^\d{10}$/.test(form.mobile)) {
      setError("Enter a valid 10-digit mobile number or leave it blank.");
      return;
    }

    setLoading(true);

    try {
      const response = await API.post("/auth/signup-send-otp", {
        name: form.name,
        email: form.email,
        mobile: form.mobile || null,
        password: form.password,
      });

      setSuccess(response.data.message || "OTP sent successfully to your email.");
      setIsOtpStep(true); // Switch to the OTP input screen
    } catch (err) {
      console.error("OTP send error:", err);
      setError(
        err.response?.data?.message || "Failed to send OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Email OTP and finalize database account creation
  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!otp.trim()) {
      setError("Please enter the OTP code.");
      return;
    }

    setLoading(true);

    try {
      const response = await API.post("/auth/verify-otp-signup", {
        email: form.email,
        otp: otp.trim(),
      });

      setSuccess("Account verified and created successfully!");

      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
      }

      if (response.data.user) {
        const normalizedUser = {
          id: response.data.user.id,
          name: response.data.user.name || "",
          email: response.data.user.email || "",
          mobile: response.data.user.mobile || "",
          role: (response.data.user.role || "customer").toLowerCase(),
        };
        localStorage.setItem("user", JSON.stringify(normalizedUser));
      }

      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);

    } catch (err) {
      console.error("Verification error:", err);
      setError(
        err.response?.data?.message || "Invalid OTP code. Please check and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.authPage}>
      <div style={styles.authCard}>

        {/* HEADER */}
        <div style={styles.authHeader}>
          <div style={styles.authLogo}>
            Go<span style={styles.logoSpan}>Trip</span>
          </div>
          <h1 style={styles.h1}>
            {isOtpStep ? "Verify Email OTP" : "Create your account"}
          </h1>
          <p style={styles.p}>
            {isOtpStep
              ? `Enter the 6-digit code sent to ${form.email}`
              : "Sign up to book your outstation journey"}
          </p>
        </div>

        {/* ALERTS */}
        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        {/* CONDITIONAL VIEWS */}
        {!isOtpStep ? (
          // --- STEP 1 FORM ---
          <form onSubmit={handleRegisterSubmit}>
            <label style={styles.label}>Full Name</label>
            <input
              style={styles.input}
              type="text"
              name="name"
              placeholder="Enter your name"
              value={form.name}
              onChange={handleChange}
              disabled={loading}
            />

            <label style={styles.label}>Email Address (Required for OTP)</label>
            <input
              style={styles.input}
              type="email"
              name="email"
              placeholder="example@gmail.com"
              value={form.email}
              onChange={handleChange}
              disabled={loading}
            />

            <label style={styles.label}>Mobile Number (Optional)</label>
            <input
              style={styles.input}
              type="tel"
              name="mobile"
              placeholder="10 digit mobile number (optional)"
              maxLength="10"
              value={form.mobile}
              onChange={handleChange}
              disabled={loading}
            />

            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              name="password"
              placeholder="Minimum 6 characters"
              value={form.password}
              onChange={handleChange}
              disabled={loading}
            />

            <label style={styles.label}>Confirm Password</label>
            <input
              style={styles.input}
              type="password"
              name="confirmPassword"
              placeholder="Confirm password"
              value={form.confirmPassword}
              onChange={handleChange}
              disabled={loading}
            />

            <button
              type="submit"
              style={{
                ...styles.primaryButton,
                ...(loading ? styles.buttonDisabled : {}),
              }}
              disabled={loading}
            >
              {loading ? "Sending OTP..." : "Sign Up & Send OTP"}
            </button>
          </form>
        ) : (
          // --- STEP 2 OTP FORM ---
          <form onSubmit={handleVerifyOtpSubmit}>
            <label style={styles.label}>Enter Email OTP</label>
            <input
              style={styles.input}
              type="text"
              placeholder="Enter 6-digit OTP code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              disabled={loading}
              maxLength="6"
            />

            <button
              type="submit"
              style={{
                ...styles.primaryButton,
                ...(loading ? styles.buttonDisabled : {}),
              }}
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify & Complete Signup"}
            </button>
          </form>
        )}

        {/* SWITCH TO SIGN IN */}
        {!isOtpStep && (
          <div style={styles.authSwitch}>
            <span style={styles.switchText}>Already have an account?</span>
            <button
              type="button"
              style={styles.switchButton}
              onClick={() => navigate("/signin")}
              disabled={loading}
            >
              Sign In
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

// Professional layout styles matching the travel theme
const styles = {
  authPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundImage: "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)",
    padding: "20px",
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  },
  authCard: {
    width: "100%",
    maxWidth: "420px",
    background: "#ffffff",
    padding: "40px",
    borderRadius: "16px",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)",
    boxSizing: "border-box",
  },
  authHeader: {
    textAlign: "center",
    marginBottom: "24px",
  },
  authLogo: {
    fontSize: "26px",
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: "10px",
    letterSpacing: "-0.5px",
  },
  logoSpan: {
    color: "#2563eb",
  },
  h1: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "0 0 6px 0",
  },
  p: {
    fontSize: "14px",
    color: "#64748b",
    margin: "0",
  },
  error: {
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    padding: "12px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    marginBottom: "18px",
    border: "1px solid #fee2e2",
    textAlign: "center",
    fontWeight: "500",
  },
  success: {
    backgroundColor: "#f0fdf4",
    color: "#16a34a",
    padding: "12px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    marginBottom: "18px",
    border: "1px solid #dcfce7",
    textAlign: "center",
    fontWeight: "500",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    color: "#334155",
    marginBottom: "6px",
  },
  input: {
    width: "100%",
    padding: "11px 14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    color: "#1e293b",
    marginBottom: "14px",
    boxSizing: "border-box",
    outline: "none",
    backgroundColor: "#f8fafc",
  },
  primaryButton: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)",
    marginTop: "6px",
  },
  buttonDisabled: {
    opacity: 0.7,
    cursor: "not-allowed",
  },
  authSwitch: {
    marginTop: "22px",
    textAlign: "center",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "6px",
  },
  switchText: {
    fontSize: "14px",
    color: "#64748b",
  },
  switchButton: {
    background: "none",
    border: "none",
    color: "#2563eb",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    padding: "0",
  },
};