import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function Home() {
  const navigate = useNavigate();
  const [pricing, setPricing] = useState([]);
  const [loadingPricing, setLoadingPricing] = useState(true);

  // Contact Form States (Triggers to Admin Portal Support Tickets)
  const [contactEmail, setContactEmail] = useState("");
  const [contactSubject, setContactSubject] = useState("General Query from Landing Page");
  const [contactMessage, setContactMessage] = useState("");
  const [submittingContact, setSubmittingContact] = useState(false);

  // Contact Us & Live Chat Bot States
  const [showContactModal, setShowContactModal] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: "bot", text: "Hello! I am your GoTrip Assistant. How can I help you explore our outstation and local cab rentals today?" }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Stylish Success Modal State
  const [successModalMessage, setSuccessModalMessage] = useState("");

  // Fetch live vehicle rates from database pricing table on mount
  useEffect(() => {
    async function fetchPricing() {
      try {
        setLoadingPricing(true);
        const response = await API.get("/pricing");
        setPricing(response.data || []);
      } catch (error) {
        console.error("Error loading pricing on Home:", error);
      } finally {
        setLoadingPricing(false);
      }
    }
    fetchPricing();
  }, []);

  // Submit Contact Form Directly to Admin Support Tickets
  async function handleContactTicketSubmit(e) {
    e.preventDefault();
    if (!contactEmail.trim() || !contactMessage.trim()) return;

    try {
      setSubmittingContact(true);
      await API.post("/support/ticket", {
        userId: null, // Public landing page inquiry
        subject: `[Landing Page Inquiry]: ${contactSubject}`,
        message: `Email: ${contactEmail}\n\nQuery Details: ${contactMessage}`
      });

      setSuccessModalMessage("Your message has been sent successfully! Our admin team has received your query in the portal.");
      setContactEmail("");
      setContactMessage("");
    } catch (error) {
      console.error("Failed to submit inquiry:", error);
      alert("Could not submit your message right now. Please try using Live Chat.");
    } finally {
      setSubmittingContact(false);
    }
  }

  // Live Chat Bot Handler
  async function handleSendMessage(e) {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMsg = inputMessage.trim();
    setChatMessages(prev => [...prev, { sender: "user", text: userMsg }]);
    setInputMessage("");
    setChatLoading(true);

    try {
      setTimeout(() => {
        let botReply = "I can help you check outstation cab rates or guide you through signing up for GoTrip!";
        const lower = userMsg.toLowerCase();

        if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
          botReply = "Hello! Welcome to GoTrip. How can I assist you with your travel plans today?";
        } else if (lower.includes("price") || lower.includes("rate") || lower.includes("fare")) {
          botReply = "Our fares are calculated transparently per kilometer based on the verified vehicle category you choose.";
        } else if (lower.includes("signup") || lower.includes("account") || lower.includes("register")) {
          botReply = "You can create a new account by clicking the 'Sign Up' button in the top right corner!";
        }

        setChatMessages(prev => [...prev, { sender: "bot", text: botReply }]);
        setChatLoading(false);
      }, 700);
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: "bot", text: "Sorry, I am having trouble connecting right now. Please try calling our helpline." }]);
      setChatLoading(false);
    }
  }

  const formatMoney = (amount) => {
    return Number(amount || 0).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="homePage" style={styles.homePage}>

      {/* =========================
          NAVBAR
      ========================= */}
      <nav className="navbar" style={styles.navbar}>
        <div
          className="logo"
          style={styles.logo}
          onClick={() => navigate("/")}
        >
          Go<span style={styles.logoSpan}>Trip</span>
        </div>

        <div className="navLinks" style={styles.navLinks}>
          <button
            type="button"
            style={styles.navButton}
            onClick={() => navigate("/")}
          >
            Home
          </button>

          <button
            type="button"
            style={styles.navButton}
            onClick={() =>
              document
                .getElementById("pricing")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Pricing
          </button>

          <button
            type="button"
            style={styles.navButton}
            onClick={() =>
              document
                .getElementById("about")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            About & Contact
          </button>

          <button
            type="button"
            style={styles.navButton}
            onClick={() => setShowContactModal(true)}
          >
            📞 Contact Us
          </button>

          <button
            type="button"
            className="signinButton"
            style={styles.signinButton}
            onClick={() => navigate("/signin")}
          >
            Sign In
          </button>

          <button
            type="button"
            className="signupButton"
            style={styles.signupButton}
            onClick={() => navigate("/signup")}
          >
            Sign Up
          </button>
        </div>
      </nav>


      {/* =========================
          HERO SECTION
      ========================= */}
      <section className="hero" id="home" style={styles.heroSection}>
        <div className="heroContent" style={styles.heroContent}>
          <div className="eyebrow" style={styles.eyebrow}>
            PREMIUM OUTSTATION & LOCAL TRAVEL
          </div>

          <h1 style={styles.h1}>
            Travel Anywhere.
            <br />
            <span style={styles.heroSpan}>We Take You There.</span>
          </h1>

          <p className="heroText" style={styles.heroText}>
            Comfortable and reliable outstation and local cab services for your next journey across India with verified drivers and transparent rates.
          </p>

          <button
            type="button"
            className="primaryButton"
            style={styles.primaryButton}
            onClick={() => navigate("/dashboard")}
          >
            Plan Your Journey
          </button>
        </div>
      </section>


      {/* =========================
          PRICING SECTION (Dynamic from DB)
      ========================= */}
      <section className="pricing" id="pricing" style={styles.pricingSection}>
        <h2 style={styles.sectionTitle}>Transparent Fleet Pricing</h2>
        <p style={styles.sectionSubtitle}>Choose the vehicle and package tier that suits your journey.</p>

        <div className="pricingGrid" style={styles.pricingGrid}>
          {loadingPricing ? (
            <p style={styles.loadingText}>Loading latest vehicle pricing...</p>
          ) : pricing.length === 0 ? (
            <p style={styles.loadingText}>No pricing tiers available at the moment.</p>
          ) : (
            pricing.map((item) => (
              <div className="priceCard" style={styles.priceCard} key={item.id}>
                
                <div style={styles.pricingHeaderTop}>
                  <div className="vehicleIcon" style={styles.vehicleIcon}>
                    🚕
                  </div>
                  <span style={{
                    ...styles.fleetBadge,
                    backgroundColor: item.trip_type === 'local' ? '#e0f2fe' : '#dcfce7',
                    color: item.trip_type === 'local' ? '#0369a1' : '#166534'
                  }}>
                    {item.trip_type ? item.trip_type.toUpperCase() : 'OUTSTATION'}
                  </span>
                </div>

                <h3 style={styles.vehicleTitle}>{item.vehicle_type}</h3>
                <p style={styles.pricingSubtitle}>Active rate setup</p>

                <div style={styles.rateDisplay}>
                  <strong style={styles.rateAmount}>
                    {formatMoney(item.rate_per_km)}
                  </strong>
                  <span style={styles.rateUnit}> / KM</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>


      {/* =========================
          ABOUT & ADMIN QUERY SECTION
      ========================= */}
      <section className="about" id="about" style={styles.aboutSection}>
        <div style={styles.aboutCardContainer}>
          
          <div style={{ marginBottom: "36px" }}>
            <span style={styles.eyebrowMini}>OUR MISSION & CONTACT</span>
            <h2 style={styles.sectionTitle}>About GoTrip & Support Portal</h2>
            <p style={styles.aboutText}>
              GoTrip is your trusted travel partner, delivering safe, comfortable, and completely transparent outstation and local cab rentals. Have a question or custom booking requirement? Send us a message below, and our admin team will review it instantly.
            </p>
          </div>

          {/* Professional Query & Email Form Triggers to Admin Portal */}
          <div style={styles.emailSectionBox}>
            <div style={{ fontSize: "26px", marginBottom: "6px" }}>📥</div>
            <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", marginBottom: "4px" }}>
              Send an Inquiry to Admin
            </h3>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 20px 0" }}>
              Enter your email and query description. This will automatically open as a support ticket in the admin panel.
            </p>

            <form onSubmit={handleContactTicketSubmit} style={styles.contactForm}>
              <div style={styles.inputWrapper}>
                <label style={styles.formLabel}>Your Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  style={styles.formInput}
                />
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.formLabel}>Subject Category</label>
                <select
                  value={contactSubject}
                  onChange={(e) => setContactSubject(e.target.value)}
                  style={styles.formSelect}
                >
                  <option value="General Query">General Inquiry</option>
                  <option value="Booking Assistance">Booking Assistance</option>
                  <option value="Corporate Travel">Corporate Partnership</option>
                  <option value="Billing Question">Billing Question</option>
                </select>
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.formLabel}>Query Description</label>
                <textarea
                  required
                  rows="4"
                  placeholder="Describe your question or travel requirement in detail..."
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  style={styles.formTextarea}
                />
              </div>

              <button
                type="submit"
                style={{
                  ...styles.primaryButton,
                  width: "100%",
                  padding: "12px",
                  fontSize: "14px",
                  opacity: submittingContact ? 0.7 : 1
                }}
                disabled={submittingContact}
              >
                {submittingContact ? "Dispatching to Admin..." : "Submit Inquiry to Admin Portal"}
              </button>
            </form>
          </div>

        </div>
      </section>


      {/* =========================================
          STYLISH SUCCESS CONFIRMATION MODAL
      ========================================= */}
      {successModalMessage && (
        <div style={styles.modalOverlay} onClick={() => setSuccessModalMessage("")}>
          <div style={{ ...styles.modalCard, maxWidth: "400px", textAlign: "center", padding: "30px 20px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: "50px", marginBottom: "10px" }}>🎉</div>
            <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", marginBottom: "10px" }}>Ticket Dispatched!</h3>
            <p style={{ fontSize: "14px", color: "#475569", marginBottom: "24px", lineHeight: "1.5" }}>
              {successModalMessage}
            </p>
            <button
              type="button"
              style={{ ...styles.primaryButton, width: "100%", padding: "12px" }}
              onClick={() => setSuccessModalMessage("")}
            >
              Okay, Got It
            </button>
          </div>
        </div>
      )}


      {/* =========================================
          MODAL: CONTACT US (LIVE CHAT & CALL)
      ========================================= */}
      {showContactModal && !chatOpen && (
        <div style={styles.modalOverlay} onClick={() => setShowContactModal(false)}>
          <div style={{ ...styles.modalCard, maxWidth: "420px" }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.modalEyebrow}>24/7 ASSISTANCE</span>
                <h3 style={styles.modalTitle}>Contact GoTrip Support</h3>
              </div>
              <button type="button" style={styles.closeModalButton} onClick={() => setShowContactModal(false)}>✕</button>
            </div>
            <div style={{ ...styles.modalBody, gap: "14px" }}>
              <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 4px 0" }}>
                Choose your preferred way to connect with our team:
              </p>

              <button
                type="button"
                style={styles.contactOptionCard}
                onClick={() => setChatOpen(true)}
              >
                <div style={{ fontSize: "28px" }}>🤖</div>
                <div style={{ textAlign: "left", flex: 1 }}>
                  <strong style={{ display: "block", fontSize: "15px", color: "#0f172a" }}>Live Chat by Bot</strong>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Instant answers to your trip & pricing queries</span>
                </div>
              </button>

              <a
                href="tel:+919876543210"
                style={{ ...styles.contactOptionCard, textDecoration: "none" }}
              >
                <div style={{ fontSize: "28px" }}>📞</div>
                <div style={{ textAlign: "left", flex: 1 }}>
                  <strong style={{ display: "block", fontSize: "15px", color: "#0f172a" }}>Call Helpline</strong>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Speak directly with our customer care (+91 98765 43210)</span>
                </div>
              </a>
            </div>
            <div style={styles.modalFooter}>
              <button type="button" style={styles.modalCancelAction} onClick={() => setShowContactModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}


      {/* =========================================
          MODAL: LIVE CHAT BY BOT
      ========================================= */}
      {chatOpen && (
        <div style={styles.modalOverlay} onClick={() => { setChatOpen(false); setShowContactModal(false); }}>
          <div style={{ ...styles.modalCard, maxWidth: "460px", height: "520px", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "20px" }}>🤖</span>
                <div>
                  <h3 style={{ ...styles.modalTitle, fontSize: "16px" }}>GoTrip AI Assistant</h3>
                  <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "700" }}>● Online</span>
                </div>
              </div>
              <button type="button" style={styles.closeModalButton} onClick={() => { setChatOpen(false); setShowContactModal(false); }}>✕</button>
            </div>

            <div style={{ flex: 1, padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", backgroundColor: "#f8fafc" }}>
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  style={{
                    alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                    backgroundColor: msg.sender === "user" ? "#2563eb" : "#ffffff",
                    color: msg.sender === "user" ? "#ffffff" : "#1e293b",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    maxWidth: "80%",
                    fontSize: "13px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
                    border: msg.sender === "bot" ? "1px solid #e2e8f0" : "none"
                  }}
                >
                  {msg.text}
                </div>
              ))}
              {chatLoading && (
                <div style={{ alignSelf: "flex-start", backgroundColor: "#ffffff", padding: "8px 12px", borderRadius: "12px", fontSize: "12px", color: "#64748b", border: "1px solid #e2e8f0" }}>
                  Bot is typing...
                </div>
              )}
            </div>

            <form onSubmit={handleSendMessage} style={{ padding: "12px 16px", backgroundColor: "#ffffff", borderTop: "1px solid #e2e8f0", display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="Type your question here..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                style={{ flex: 1, height: "40px", padding: "0 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px", outline: "none" }}
              />
              <button type="submit" style={{ backgroundColor: "#2563eb", color: "#fff", border: "none", padding: "0 16px", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "13px" }}>
                Send
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Professional Ocean Breeze Styling Stylesheet Object
const styles = {
  homePage: {
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    color: "#1e293b",
  },
  navbar: {
    maxWidth: "1280px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e2e8f0",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  logo: {
    fontSize: "24px",
    fontWeight: "800",
    color: "#0f172a",
    cursor: "pointer",
    letterSpacing: "-0.5px",
  },
  logoSpan: {
    color: "#2563eb",
  },
  navLinks: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  navButton: {
    background: "none",
    border: "none",
    fontSize: "14px",
    fontWeight: "600",
    color: "#475569",
    cursor: "pointer",
    padding: "8px 12px",
    transition: "color 0.2s",
  },
  signinButton: {
    backgroundColor: "transparent",
    color: "#2563eb",
    border: "1px solid #2563eb",
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },
  signupButton: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
  },
  heroSection: {
    backgroundImage: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%)",
    padding: "100px 20px 120px 20px",
    color: "#ffffff",
    textAlign: "center",
  },
  heroContent: {
    maxWidth: "700px",
    margin: "0 auto",
  },
  eyebrow: {
    fontSize: "12px",
    fontWeight: "800",
    color: "#93c5fd",
    letterSpacing: "1.5px",
    marginBottom: "12px",
    textTransform: "uppercase",
  },
  h1: {
    fontSize: "44px",
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: "16px",
    letterSpacing: "-1px",
    lineHeight: "1.2",
  },
  heroSpan: {
    color: "#93c5fd",
  },
  heroText: {
    fontSize: "16px",
    color: "#bfdbfe",
    marginBottom: "32px",
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "14px 28px",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
    transition: "transform 0.15s ease",
  },
  pricingSection: {
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "80px 20px",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: "28px",
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: "8px",
  },
  sectionSubtitle: {
    fontSize: "14px",
    color: "#64748b",
    marginBottom: "40px",
  },
  pricingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "24px",
  },
  priceCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "28px 24px",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.03)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  pricingHeaderTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: "12px",
  },
  vehicleIcon: {
    fontSize: "28px",
    backgroundColor: "#eff6ff",
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  fleetBadge: {
    fontSize: "10px",
    fontWeight: "700",
    padding: "4px 10px",
    borderRadius: "10px",
    textTransform: "uppercase",
  },
  vehicleTitle: {
    fontSize: "18px",
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: "2px",
    alignSelf: "flex-start",
  },
  pricingSubtitle: {
    fontSize: "12px",
    color: "#64748b",
    margin: "0 0 20px 0",
    alignSelf: "flex-start",
  },
  rateDisplay: {
    display: "flex",
    alignItems: "baseline",
    gap: "4px",
    marginTop: "auto",
    alignSelf: "flex-start",
  },
  rateAmount: {
    fontSize: "22px",
    fontWeight: "800",
    color: "#2563eb",
  },
  rateUnit: {
    fontSize: "12px",
    color: "#64748b",
    fontWeight: "600",
  },
  loadingText: {
    gridColumn: "1 / -1",
    fontSize: "14px",
    color: "#64748b",
  },
  aboutSection: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "60px 20px 100px 20px",
    textAlign: "center",
  },
  aboutCardContainer: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "20px",
    padding: "40px 30px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.03)",
  },
  eyebrowMini: {
    fontSize: "11px",
    fontWeight: "800",
    color: "#2563eb",
    letterSpacing: "1.2px",
    marginBottom: "6px",
    display: "block",
    textTransform: "uppercase",
  },
  aboutText: {
    fontSize: "15px",
    color: "#475569",
    lineHeight: "1.7",
    maxWidth: "680px",
    margin: "0 auto",
  },
  emailSectionBox: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "24px",
    maxWidth: "540px",
    margin: "0 auto",
    textAlign: "left",
  },
  contactForm: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  inputWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  formLabel: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#334155",
  },
  formInput: {
    width: "100%",
    height: "44px",
    padding: "0 12px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
    backgroundColor: "#ffffff",
    boxSizing: "border-box",
  },
  formSelect: {
    width: "100%",
    height: "44px",
    padding: "0 12px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
    backgroundColor: "#ffffff",
    boxSizing: "border-box",
    fontWeight: "500",
  },
  formTextarea: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
    backgroundColor: "#ffffff",
    boxSizing: "border-box",
    fontFamily: "inherit",
    resize: "vertical",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modalCard: {
    backgroundColor: "#ffffff",
    width: "100%",
    maxWidth: "540px",
    borderRadius: "20px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc",
  },
  modalEyebrow: {
    fontSize: "11px",
    fontWeight: "800",
    color: "#2563eb",
    letterSpacing: "1px",
    display: "block",
    marginBottom: "2px",
  },
  modalTitle: {
    fontSize: "18px",
    fontWeight: "800",
    color: "#0f172a",
    margin: "0",
  },
  closeModalButton: {
    background: "none",
    border: "none",
    fontSize: "18px",
    fontWeight: "bold",
    color: "#64748b",
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: "6px",
  },
  modalBody: {
    padding: "24px",
    maxHeight: "60vh",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  modalFooter: {
    padding: "16px 24px",
    borderTop: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc",
    display: "flex",
    justifyContent: "flex-end",
  },
  modalCancelAction: {
    backgroundColor: "#e2e8f0",
    color: "#334155",
    border: "none",
    padding: "10px 20px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },
  contactOptionCard: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    padding: "14px 16px",
    borderRadius: "14px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    width: "100%",
    boxSizing: "border-box",
  },
};