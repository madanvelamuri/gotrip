import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function SignIn() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // Step 1: Enter email/mobile + password, Step 2: Enter OTP
  const [loginInput, setLoginInput] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Resend OTP cooldown timer states
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    let timer;
    if (resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCountdown]);

  // STEP 1: Send OTP to Email or Mobile after validating credentials
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!loginInput.trim() || !password) {
      setError("Please enter your email/mobile and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await API.post("/auth/signin-send-otp", {
        login: loginInput.trim(),
        password: password,
      });

      const isEmail = loginInput.includes("@");
      setSuccessMsg(
        response.data.message || 
        `OTP sent successfully to your registered ${isEmail ? "email address" : "mobile number"}`
      );
      setStep(2); // Move to OTP verification step
      setResendCountdown(30); // Start 30-second cooldown
    } catch (err) {
      console.error("Sign-in OTP error:", err);
      setError(
        err.response?.data?.message ||
        "Invalid credentials or account not found. Please check your inputs."
      );
    } finally {
      setLoading(false);
    }
  };

  // RESEND OTP HANDLER
  const handleResendOtp = async () => {
    if (resendCountdown > 0 || loading) return;

    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const response = await API.post("/auth/signin-send-otp", {
        login: loginInput.trim(),
        password: password,
      });

      const isEmail = loginInput.includes("@");
      setSuccessMsg(
        response.data.message || 
        `A new OTP has been resent to your registered ${isEmail ? "email address" : "mobile number"}`
      );
      setResendCountdown(30); // Reset cooldown
    } catch (err) {
      console.error("Resend OTP error:", err);
      setError(
        err.response?.data?.message ||
        "Failed to resend OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify OTP and Log In
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");

    if (!otp.trim() || otp.trim().length !== 6) {
      setError("Please enter the valid 6-digit OTP code.");
      return;
    }

    setLoading(true);

    try {
      const response = await API.post("/auth/verify-otp-signin", {
        login: loginInput.trim(),
        otp: otp.trim(),
      });

      const token = response.data.token;
      const loggedInUser = response.data.user;

      if (!token || !loggedInUser) {
        throw new Error("Invalid response from server.");
      }

      const normalizedUser = {
        id: loggedInUser.id,
        name: loggedInUser.name || "",
        email: loggedInUser.email || "",
        mobile: loggedInUser.mobile || "",
        role: (loggedInUser.role || "customer").toLowerCase(),
      };

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(normalizedUser));

      console.log("Sign-in successful:", normalizedUser);
      navigate("/dashboard");

    } catch (err) {
      console.error("OTP verification error:", err);
      setError(
        err.response?.data?.message ||
        "Invalid OTP code. Please try again."
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
          <div style={{ ...styles.authLogo, cursor: "pointer" }} onClick={() => navigate("/")}>
            Go<span style={styles.logoSpan}>Trip</span>
          </div>
          <h1 style={styles.h1}>Welcome Back</h1>
          <p style={styles.p}>
            {step === 1 
              ? "Sign in securely with your email or mobile OTP" 
              : `Enter the 6-digit code sent for ${loginInput}`}
          </p>
        </div>

        {/* ERROR / SUCCESS ALERTS */}
        {error && <div style={styles.error}>{error}</div>}
        {successMsg && <div style={styles.success}>{successMsg}</div>}

        {/* STEP 1 FORM: EMAIL/MOBILE + PASSWORD */}
        {step === 1 ? (
          <form onSubmit={handleSendOtp}>
            <label style={styles.label}>Email Address or Mobile Number</label>
            <input
              style={styles.input}
              type="text"
              placeholder="name@example.com or 10-digit mobile"
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              disabled={loading}
              autoComplete="username"
              autoFocus
            />

            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
            />

            <button
              type="submit"
              style={{
                ...styles.primaryButton,
                ...(loading ? styles.buttonDisabled : {}),
              }}
              disabled={loading}
            >
              {loading ? "Verifying & Sending OTP..." : "Get OTP"}
            </button>
          </form>
        ) : (
          /* STEP 2 FORM: OTP CODE */
          <form onSubmit={handleVerifyOtp}>
            <label style={styles.label}>Verification Code (OTP)</label>
            <input
              style={{
                ...styles.input,
                textAlign: "center",
                letterSpacing: "6px",
                fontSize: "18px",
                fontWeight: "700",
              }}
              type="text"
              maxLength="6"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              disabled={loading}
              autoFocus
            />

            <button
              type="submit"
              style={{
                ...styles.primaryButton,
                ...(loading ? styles.buttonDisabled : {}),
              }}
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify & Sign In"}
            </button>

            {/* RESEND OTP SECTION */}
            <div style={styles.resendContainer}>
              <span style={styles.resendText}>Didn't receive the code?</span>
              <button
                type="button"
                style={{
                  ...styles.resendButton,
                  ...(resendCountdown > 0 ? styles.resendDisabled : {}),
                }}
                onClick={handleResendOtp}
                disabled={resendCountdown > 0 || loading}
              >
                {resendCountdown > 0 ? `Resend OTP in ${resendCountdown}s` : "Resend OTP"}
              </button>
            </div>

            <button
              type="button"
              style={styles.textButton}
              onClick={() => {
                setStep(1);
                setOtp("");
                setError("");
                setSuccessMsg("");
              }}
              disabled={loading}
            >
              ← Back to Sign In
            </button>
          </form>
        )}

        {/* DIVIDER */}
        <div style={styles.divider}>
          <span style={styles.dividerSpan}>OR</span>
        </div>

        {/* GOOGLE */}
        <button
          style={styles.googleButton}
          type="button"
          onClick={() => {
            alert("Google Sign-In will be connected after Google OAuth configuration.");
          }}
          disabled={loading}
        >
          <svg style={styles.googleIcon} viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {/* SIGN UP SWITCH */}
        <div style={styles.authSwitch}>
          <span style={styles.switchText}>Don't have an account?</span>
          <button
            type="button"
            style={styles.switchButton}
            onClick={() => navigate("/signup")}
            disabled={loading}
          >
            Sign Up
          </button>
        </div>

      </div>
    </div>
  );
}

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
    marginBottom: "28px",
  },
  authLogo: {
    fontSize: "26px",
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: "12px",
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
    marginBottom: "20px",
    border: "1px solid #fee2e2",
    textAlign: "center",
    fontWeight: "500",
  },
  success: {
    backgroundColor: "#f0fdf4",
    color: "#166534",
    padding: "12px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    marginBottom: "20px",
    border: "1px solid #bbf7d0",
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
    padding: "12px 14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    color: "#1e293b",
    marginBottom: "16px",
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
  resendContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "6px",
    marginTop: "16px",
    fontSize: "13px",
  },
  resendText: {
    color: "#64748b",
  },
  resendButton: {
    background: "none",
    border: "none",
    color: "#2563eb",
    fontWeight: "600",
    cursor: "pointer",
    padding: "0",
  },
  resendDisabled: {
    color: "#94a3b8",
    cursor: "not-allowed",
  },
  textButton: {
    background: "none",
    border: "none",
    color: "#2563eb",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    width: "100%",
    textAlign: "center",
    marginTop: "12px",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    textAlign: "center",
    margin: "24px 0",
    color: "#94a3b8",
  },
  dividerSpan: {
    flex: "1",
    borderBottom: "1px solid #e2e8f0",
    position: "relative",
    padding: "0 10px",
    fontSize: "12px",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  googleButton: {
    width: "100%",
    padding: "11px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#334155",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  },
  googleIcon: {
    flexShrink: 0,
  },
  authSwitch: {
    marginTop: "24px",
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