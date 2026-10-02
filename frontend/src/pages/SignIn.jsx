import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function SignIn() {
  const navigate = useNavigate();

  const [loginInput, setLoginInput] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Direct Sign-In Handler (No OTP step)
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
      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);

    } catch (err) {
      console.error("Sign-in error:", err);
      setError(
        err.response?.data?.message ||
        "Invalid email/mobile or password. Please try again."
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
          <p style={styles.p}>Sign in securely with your email/mobile and password</p>
        </div>

        {/* ERROR / SUCCESS ALERTS */}
        {error && <div style={styles.error}>{error}</div>}
        {successMsg && <div style={styles.success}>{successMsg}</div>}

        {/* SIGN IN FORM */}
        <form onSubmit={handleSignIn}>
          <label style={styles.label}>Email Address or Mobile Number</label>
          <input
            style={styles.input}
            type="text"
            placeholder="name@example.com or mobile"
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
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

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