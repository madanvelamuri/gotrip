import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function SignIn() {
  const navigate = useNavigate();

  const [view, setView] = useState("signin"); // "signin" | "forgot" | "reset"
  const [loginInput, setLoginInput] = useState("");
  const [password, setPassword] = useState("");

  // Forgot Password States
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Sign In Handler
  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!loginInput.trim() || !password) {
      setError("Please enter your email/mobile and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await API.post("/auth/signin", {
        login: loginInput.trim(),
        password: password,
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

      setSuccessMsg("Sign in successful! Redirecting...");
      setTimeout(() => navigate("/dashboard"), 1000);

    } catch (err) {
      console.error("Sign-in error:", err);
      setError(err.response?.data?.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Request Password Reset Code
  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!resetEmail.trim() || !resetEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const response = await API.post("/auth/forgot-password", { email: resetEmail.trim() });
      setSuccessMsg(response.data.message || "Reset code generated.");
      setView("reset");
    } catch (err) {
      console.error("Forgot password error:", err);
      setError(err.response?.data?.message || "Failed to process request.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit Reset Code and New Password
  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!resetCode.trim() || !newPassword) {
      setError("Please enter the reset code and your new password.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await API.post("/auth/reset-password", {
        email: resetEmail.trim(),
        code: resetCode.trim(),
        newPassword: newPassword,
      });

      setSuccessMsg(response.data.message);
      setTimeout(() => {
        setView("signin");
        setSuccessMsg("");
        setResetEmail("");
        setResetCode("");
        setNewPassword("");
      }, 2000);

    } catch (err) {
      console.error("Reset password error:", err);
      setError(err.response?.data?.message || "Failed to reset password.");
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
          <h1 style={styles.h1}>
            {view === "signin" && "Welcome Back"}
            {view === "forgot" && "Reset Password"}
            {view === "reset" && "Enter New Password"}
          </h1>
          <p style={styles.p}>
            {view === "signin" && "Sign in securely with your email/mobile and password"}
            {view === "forgot" && "Enter your email to receive a password reset code"}
            {view === "reset" && `Enter the code sent to ${resetEmail}`}
          </p>
        </div>

        {/* ALERTS */}
        {error && <div style={styles.error}>{error}</div>}
        {successMsg && <div style={styles.success}>{successMsg}</div>}

        {/* VIEW 1: SIGN IN FORM */}
        {view === "signin" && (
          <form onSubmit={handleSignIn}>
            <label style={styles.label}>Email Address or Mobile Number</label>
            <input
              style={styles.input}
              type="text"
              placeholder="name@example.com or mobile"
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              disabled={loading}
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
            />

            <div style={styles.forgotContainer}>
              <button
                type="button"
                style={styles.textButton}
                onClick={() => {
                  setView("forgot");
                  setError("");
                  setSuccessMsg("");
                }}
              >
                Forgot Password?
              </button>
            </div>

            <button type="submit" style={styles.primaryButton} disabled={loading}>
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>
        )}

        {/* VIEW 2: FORGOT PASSWORD REQUEST FORM */}
        {view === "forgot" && (
          <form onSubmit={handleRequestReset}>
            <label style={styles.label}>Registered Email Address</label>
            <input
              style={styles.input}
              type="email"
              placeholder="name@example.com"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              disabled={loading}
              autoFocus
            />

            <button type="submit" style={styles.primaryButton} disabled={loading}>
              {loading ? "Sending Code..." : "Send Reset Code"}
            </button>

            <button
              type="button"
              style={styles.backButton}
              onClick={() => {
                setView("signin");
                setError("");
                setSuccessMsg("");
              }}
            >
              ← Back to Sign In
            </button>
          </form>
        )}

        {/* VIEW 3: CONFIRM RESET & NEW PASSWORD FORM */}
        {view === "reset" && (
          <form onSubmit={handleConfirmReset}>
            <label style={styles.label}>6-Digit Reset Code</label>
            <input
              style={{ ...styles.input, textAlign: "center", letterSpacing: "4px", fontWeight: "700" }}
              type="text"
              maxLength="6"
              placeholder="123456"
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value)}
              disabled={loading}
              autoFocus
            />

            <label style={styles.label}>New Password</label>
            <input
              style={styles.input}
              type="password"
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
            />

            <button type="submit" style={styles.primaryButton} disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </button>

            <button
              type="button"
              style={styles.backButton}
              onClick={() => {
                setView("forgot");
                setError("");
                setSuccessMsg("");
              }}
            >
              ← Resend Code / Change Email
            </button>
          </form>
        )}

        {/* SIGN UP SWITCH */}
        {view === "signin" && (
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
        )}

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
  forgotContainer: {
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: "16px",
    marginTop: "-8px",
  },
  textButton: {
    background: "none",
    border: "none",
    color: "#2563eb",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    padding: "0",
  },
  backButton: {
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