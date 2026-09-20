import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
  });

  /* =========================
     LOAD USER
  ========================= */
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!token || !storedUser) {
      navigate("/signin");
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);

      const normalizedUser = {
        id: parsedUser.id || "",
        name: parsedUser.name || "",
        email: parsedUser.email || "",
        mobile: parsedUser.mobile || "",
        role: String(parsedUser.role || "customer").toLowerCase(),
      };

      setUser(normalizedUser);

      setForm({
        name: normalizedUser.name,
        email: normalizedUser.email,
        mobile: normalizedUser.mobile,
      });
    } catch (err) {
      console.error("Unable to load profile:", err);
      localStorage.removeItem("user");
      navigate("/signin");
    }
  }, [navigate]);

  /* =========================
     LOGOUT
  ========================= */
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/signin");
  };

  /* =========================
     EDIT
  ========================= */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  /* =========================
     SAVE
  ========================= */
  const handleSave = () => {
    setError("");
    setMessage("");

    if (!form.name.trim()) {
      setError("Full name is required.");
      return;
    }

    if (!form.email.trim()) {
      setError("Email address is required.");
      return;
    }

    if (!form.mobile.trim()) {
      setError("Mobile number is required.");
      return;
    }

    const updatedUser = {
      ...user,
      name: form.name.trim(),
      email: form.email.trim(),
      mobile: form.mobile.trim(),
      role: user.role, // Never allow profile editing to change role
    };

    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUser(updatedUser);

    setForm({
      name: updatedUser.name,
      email: updatedUser.email,
      mobile: updatedUser.mobile,
    });

    setEditing(false);
    setMessage("Profile updated successfully.");

    setTimeout(() => {
      setMessage("");
    }, 3000);
  };

  /* =========================
     CANCEL
  ========================= */
  const handleCancel = () => {
    setForm({
      name: user.name,
      email: user.email,
      mobile: user.mobile,
    });

    setEditing(false);
    setError("");
    setMessage("");
  };

  /* =========================
     LOADING
  ========================= */
  if (!user) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>Loading profile...</p>
      </div>
    );
  }

  /* =========================
     ROLE & AVATAR
  ========================= */
  const isAdmin = user.role === "admin";
  const displayRole = isAdmin ? "Admin" : "Customer";
  const roleDescription = isAdmin ? "GoTrip Administrator" : "GoTrip Customer";
  const avatarLetter = user.name?.trim()?.charAt(0)?.toUpperCase() || "U";

  return (
    <div style={styles.profilePage}>

      {/* =================================
          NAVIGATION HEADER
      ================================= */}
      <header style={styles.profileNav}>
        <div style={styles.navContainer}>
          <strong 
            style={styles.logo}
            onClick={() => navigate("/dashboard")}
          >
            Go<span style={styles.logoSpan}>Trip</span>
          </strong>

          <div style={styles.navRight}>
            <button
              type="button"
              style={styles.navButton}
              onClick={() => navigate("/dashboard")}
            >
              Dashboard
            </button>

            <button
              type="button"
              style={styles.logoutButton}
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* =================================
          MAIN CONTENT CONTAINER
      ================================= */}
      <main style={styles.profileContainer}>

        {/* BACK BUTTON */}
        <button
          type="button"
          style={styles.backButton}
          onClick={() => navigate("/dashboard")}
        >
          ← Back to Dashboard
        </button>

        {/* PAGE HEADING */}
        <div style={styles.pageHeadingRow}>
          <div>
            <span style={styles.eyebrow}>ACCOUNT SETTINGS</span>
            <h1 style={styles.h1}>My Profile</h1>
            <p style={styles.subtitle}>
              Manage your personal identification details and account security settings.
            </p>
          </div>
        </div>

        {/* SUCCESS ALERT */}
        {message && (
          <div style={styles.successBox}>
            <span>✓</span>
            <div>
              <strong>Success</strong>
              <p style={{ margin: 0 }}>{message}</p>
            </div>
          </div>
        )}

        {/* ERROR ALERT */}
        {error && (
          <div style={styles.errorBox}>
            <span>✕</span>
            <div>
              <strong>Unable to update profile</strong>
              <p style={{ margin: 0 }}>{error}</p>
            </div>
          </div>
        )}

        {/* =================================
            PROFILE HERO CARD
        ================================= */}
        <section style={styles.heroCard}>
          <div style={styles.heroLeft}>
            <div style={{
              ...styles.avatarBox,
              backgroundColor: isAdmin ? "#fef3c7" : "#eff6ff",
              color: isAdmin ? "#b45309" : "#2563eb",
            }}>
              {avatarLetter}
            </div>

            <div style={styles.identity}>
              <div style={styles.nameRow}>
                <h2 style={styles.userName}>{user.name || "User"}</h2>
                <span style={{
                  ...styles.roleBadge,
                  backgroundColor: isAdmin ? "#fef3c7" : "#eff6ff",
                  color: isAdmin ? "#b45309" : "#2563eb",
                  borderColor: isAdmin ? "#fde68a" : "#bfdbfe"
                }}>
                  {isAdmin ? "★ " : "● "} {displayRole}
                </span>
              </div>
              <p style={styles.roleDesc}>{roleDescription}</p>
              <div style={styles.statusLine}>
                <span style={styles.onlineDot}></span> Account Active
              </div>
            </div>
          </div>

          {!editing && (
            <button
              type="button"
              style={styles.editButton}
              onClick={() => setEditing(true)}
            >
              <span>✎</span> Edit Profile
            </button>
          )}
        </section>

        {/* =================================
            CONTENT GRID
        ================================= */}
        <div style={styles.contentGrid}>

          {/* INFORMATION SECTION */}
          <section style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionIcon}>👤</div>
              <div>
                <h3 style={styles.h3}>Account Information</h3>
                <p style={styles.sectionSub}>Your personal contact credentials</p>
              </div>
            </div>

            {!editing ? (
              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <div style={styles.infoIcon}>👤</div>
                  <div>
                    <span style={styles.infoLabel}>Full Name</span>
                    <strong style={styles.infoVal}>{user.name || "Not provided"}</strong>
                  </div>
                </div>

                <div style={styles.infoItem}>
                  <div style={styles.infoIcon}>✉</div>
                  <div>
                    <span style={styles.infoLabel}>Email Address</span>
                    <strong style={styles.infoVal}>{user.email || "Not provided"}</strong>
                  </div>
                </div>

                <div style={styles.infoItem}>
                  <div style={styles.infoIcon}>☎</div>
                  <div>
                    <span style={styles.infoLabel}>Mobile Number</span>
                    <strong style={styles.infoVal}>{user.mobile || "Not provided"}</strong>
                  </div>
                </div>

                <div style={styles.infoItem}>
                  <div style={styles.infoIcon}>🛡</div>
                  <div>
                    <span style={styles.infoLabel}>Account Type</span>
                    <strong style={styles.infoVal}>{displayRole}</strong>
                  </div>
                </div>
              </div>
            ) : (
              /* EDIT FORM */
              <div style={styles.editForm}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    style={styles.inputField}
                    placeholder="Enter full name"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    style={styles.inputField}
                    placeholder="Enter email address"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Mobile Number</label>
                  <input
                    type="tel"
                    name="mobile"
                    value={form.mobile}
                    onChange={handleChange}
                    style={styles.inputField}
                    placeholder="Enter mobile number"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Account Type</label>
                  <div style={styles.readonlyRoleBox}>
                    <span style={{
                      ...styles.roleBadge,
                      backgroundColor: isAdmin ? "#fef3c7" : "#eff6ff",
                      color: isAdmin ? "#b45309" : "#2563eb",
                    }}>
                      {displayRole}
                    </span>
                    <small style={styles.readonlyNote}>Account tier cannot be modified directly.</small>
                  </div>
                </div>

                <div style={styles.formActions}>
                  <button
                    type="button"
                    style={styles.saveButton}
                    onClick={handleSave}
                  >
                    ✓ Save Changes
                  </button>
                  <button
                    type="button"
                    style={styles.cancelButton}
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* OVERVIEW SIDE CARD */}
          <aside style={styles.sideCard}>
            <h3 style={styles.sideTitle}>Account Overview</h3>

            <div style={styles.overviewItem}>
              <div style={{ ...styles.overviewIcon, backgroundColor: "#dcfce7", color: "#16a34a" }}>✓</div>
              <div>
                <strong style={styles.ovTitle}>Account Status</strong>
                <span style={styles.ovVal}>Active & Verified</span>
              </div>
            </div>

            <div style={styles.overviewItem}>
              <div style={{ ...styles.overviewIcon, backgroundColor: "#eff6ff", color: "#2563eb" }}>
                {isAdmin ? "★" : "●"}
              </div>
              <div>
                <strong style={styles.ovTitle}>Access Level</strong>
                <span style={styles.ovVal}>{displayRole}</span>
              </div>
            </div>

            <div style={styles.overviewItem}>
              <div style={{ ...styles.overviewIcon, backgroundColor: "#fef9c3", color: "#ca8a04" }}>🔒</div>
              <div>
                <strong style={styles.ovTitle}>Security</strong>
                <span style={styles.ovVal}>Token Secured</span>
              </div>
            </div>

            <div style={styles.divider}></div>

            <div style={styles.noteBox}>
              <p style={styles.noteText}>
                Keep your mobile number and email up to date to ensure seamless trip updates and driver coordination.
              </p>
            </div>
          </aside>

        </div>

      </main>
    </div>
  );
}

// Professional Ocean Breeze Theme Styling Stylesheet Object
const styles = {
  profilePage: {
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    color: "#1e293b",
  },
  profileNav: {
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e2e8f0",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02)",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  navContainer: {
    maxWidth: "1280px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 24px",
  },
  logo: {
    fontSize: "24px",
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: "-0.5px",
    cursor: "pointer",
  },
  logoSpan: {
    color: "#2563eb",
  },
  navRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  navButton: {
    backgroundColor: "#ffffff",
    color: "#334155",
    border: "1px solid #cbd5e1",
    padding: "8px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  logoutButton: {
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    border: "1px solid #fee2e2",
    padding: "8px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  profileContainer: {
    maxWidth: "1150px",
    margin: "0 auto",
    padding: "36px 20px 60px 20px",
  },
  backButton: {
    background: "none",
    border: "none",
    color: "#2563eb",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    marginBottom: "20px",
    padding: 0,
  },
  pageHeadingRow: {
    marginBottom: "24px",
  },
  eyebrow: {
    fontSize: "11px",
    fontWeight: "800",
    color: "#2563eb",
    letterSpacing: "1.5px",
    marginBottom: "6px",
    display: "block",
    textTransform: "uppercase",
  },
  h1: {
    fontSize: "28px",
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: "4px",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#64748b",
    margin: "0",
  },
  successBox: {
    backgroundColor: "#f0fdf4",
    color: "#166534",
    border: "1px solid #bbf7d0",
    padding: "14px 18px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px",
    fontSize: "14px",
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    padding: "14px 18px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px",
    fontSize: "14px",
  },
  heroCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "28px",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.03)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "20px",
    marginBottom: "30px",
  },
  heroLeft: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
  },
  avatarBox: {
    width: "72px",
    height: "72px",
    borderRadius: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
    fontWeight: "800",
  },
  identity: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  nameRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  userName: {
    fontSize: "20px",
    fontWeight: "800",
    color: "#0f172a",
    margin: "0",
  },
  roleBadge: {
    fontSize: "11px",
    fontWeight: "700",
    padding: "4px 10px",
    borderRadius: "8px",
    border: "1px solid",
    textTransform: "uppercase",
  },
  roleDesc: {
    fontSize: "13px",
    color: "#64748b",
    margin: "0",
  },
  statusLine: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    fontWeight: "600",
    color: "#16a34a",
    marginTop: "4px",
  },
  onlineDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#16a34a",
  },
  editButton: {
    backgroundColor: "#eff6ff",
    color: "#2563eb",
    border: "1px solid #bfdbfe",
    padding: "10px 18px",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "24px",
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "28px",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.03)",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "24px",
    borderBottom: "1px solid #f1f5f9",
    paddingBottom: "16px",
  },
  sectionIcon: {
    fontSize: "22px",
    backgroundColor: "#eff6ff",
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  h3: {
    fontSize: "18px",
    fontWeight: "800",
    color: "#0f172a",
    margin: "0 0 2px 0",
  },
  sectionSub: {
    fontSize: "13px",
    color: "#64748b",
    margin: "0",
  },
  infoGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  infoItem: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    backgroundColor: "#f8fafc",
    padding: "14px 16px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
  },
  infoIcon: {
    fontSize: "16px",
    color: "#64748b",
  },
  infoLabel: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#64748b",
    display: "block",
    marginBottom: "2px",
    textTransform: "uppercase",
  },
  infoVal: {
    fontSize: "14px",
    color: "#0f172a",
  },
  editForm: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#334155",
  },
  inputField: {
    width: "100%",
    height: "46px",
    padding: "0 14px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    fontSize: "14px",
    backgroundColor: "#f8fafc",
    outline: "none",
    boxSizing: "border-box",
  },
  readonlyRoleBox: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    backgroundColor: "#f8fafc",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
  },
  readonlyNote: {
    fontSize: "12px",
    color: "#64748b",
  },
  formActions: {
    display: "flex",
    gap: "12px",
    marginTop: "10px",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "12px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#e2e8f0",
    color: "#334155",
    border: "none",
    padding: "12px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },
  sideCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.03)",
    height: "fit-content",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  sideTitle: {
    fontSize: "16px",
    fontWeight: "800",
    color: "#0f172a",
    margin: "0 0 4px 0",
  },
  overviewItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "13px",
  },
  overviewIcon: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
  },
  ovTitle: {
    fontSize: "12px",
    color: "#64748b",
    display: "block",
  },
  ovVal: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#0f172a",
  },
  divider: {
    height: "1px",
    backgroundColor: "#e2e8f0",
    margin: "4px 0",
  },
  noteBox: {
    backgroundColor: "#f8fafc",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
  },
  noteText: {
    fontSize: "12px",
    color: "#64748b",
    lineHeight: "1.5",
    margin: "0",
  },
  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  loadingSpinner: {
    width: "36px",
    height: "36px",
    border: "3px solid #e2e8f0",
    borderTopColor: "#2563eb",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    marginBottom: "12px",
  },
  loadingText: {
    fontSize: "14px",
    color: "#64748b",
    fontWeight: "600",
  },
};