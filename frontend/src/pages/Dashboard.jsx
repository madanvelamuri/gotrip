import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import LocationInput from "../components/LocationInput";

const loaderKeyframes = `
@keyframes bounceCar {
  0% { transform: translateX(-40px); }
  100% { transform: translateX(40px); }
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

if (typeof document !== "undefined") {
  const styleEl = document.createElement("style");
  styleEl.innerHTML = loaderKeyframes;
  document.head.appendChild(styleEl);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const [tripType, setTripType] = useState("outstation");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [localPackage, setLocalPackage] = useState("4_40");
  const [travelDate, setTravelDate] = useState("");
  const [tripTime, setTripTime] = useState("10:00");

  const [distance, setDistance] = useState(0);
  const [pricing, setPricing] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loadingPricing, setLoadingPricing] = useState(true);
  const [bookingVehicle, setBookingVehicle] = useState(null);

  // Modal State Controllers
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [pendingVehicle, setPendingVehicle] = useState(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [transactionRef, setTransactionRef] = useState("");

  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [supportSubject, setSupportSubject] = useState("Booking Modification");
  const [supportMessage, setSupportMessage] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComments, setFeedbackComments] = useState("");

  const [notifications, setNotifications] = useState([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState("all");
  const [selectedAlert, setSelectedAlert] = useState(null);

  const [showContactModal, setShowContactModal] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: "bot", text: "Welcome to GoTrip Concierge Support. You may request assistance here or input 'agent' to escalate to executive personnel." }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const [successModalMessage, setSuccessModalMessage] = useState("");
  const [successActionCallback, setSuccessActionCallback] = useState(null);

  useEffect(() => {
    async function loadPricing() {
      try {
        setLoadingPricing(true);
        const response = await API.get(`/pricing?tripType=${tripType}`);
        setPricing(response.data);
      } catch (error) {
        console.error("Pricing configuration error:", error);
      } finally {
        setLoadingPricing(false);
      }
    }
    loadPricing();
  }, [tripType]);

  useEffect(() => {
    async function loadNotifications() {
      if (!user?.id) return;
      try {
        const response = await API.get(`/bookings/notifications/${user.id}`);
        setNotifications(response.data || []);
      } catch (err) {
        console.error("Notification synchronization error:", err);
      }
    }
    loadNotifications();
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleViewAlert = async (alertItem) => {
    setSelectedAlert(alertItem);
    setShowNotificationsModal(false);
    if (!alertItem.is_read) {
      try {
        await API.patch(`/bookings/notifications/${alertItem.id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n.id === alertItem.id ? { ...n, is_read: true } : n))
        );
      } catch (err) {
        console.error("Failed to update notification audit state:", err);
      }
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (notificationFilter === "unread") return !n.is_read;
    if (notificationFilter === "read") return n.is_read;
    return true;
  });

  async function searchRoute(e) {
    e.preventDefault();
    if (!from.trim()) {
      alert("Please specify a valid departure point.");
      return;
    }

    if (tripType === "outstation") {
      if (!to.trim()) {
        alert("Please specify a valid arrival destination.");
        return;
      }
      try {
        const response = await API.post("/location/calculate-distance", {
          origin: from.trim(),
          destination: to.trim()
        });
        setDistance(response.data.distanceKm);
        setSearched(true);
      } catch (error) {
        alert("Unable to calculate transit routing. Please verify location details.");
      }
    } else {
      let packageKm = 40;
      if (localPackage === "8_80") packageKm = 80;
      if (localPackage === "12_120") packageKm = 120;
      if (localPackage === "24_240") packageKm = 240;
      if (localPackage === "48_480") packageKm = 480;
      setDistance(packageKm);
      setSearched(true);
    }
  }

  function handleBookClick(vehicle) {
    if (!from || (tripType === "outstation" && !to)) {
      alert("Please define the full travel itinerary before booking.");
      return;
    }
    if (!travelDate) {
      alert("Please designate a departure schedule date.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Authentication required. Please sign in to finalize booking.");
      navigate("/signin");
      return;
    }
    setPendingVehicle(vehicle);
    setTransactionRef("");
    setShowTermsModal(true);
  }

  async function confirmBooking() {
    if (!pendingVehicle) return;
    if (!transactionRef.trim()) {
      alert("Please provide the UPI Transaction Reference (UTR) number to verify payment.");
      return;
    }

    try {
      setShowTermsModal(false);
      setBookingVehicle(pendingVehicle.id);

      const tripLabel = tripType === "local" ? `Local Rental (${localPackage.replace("_", " Hours / ")} KM)` : to;
      const scheduledDateTime = `${travelDate} ${tripTime || "10:00"}:00`;
      const advanceAmt = tripType === "outstation" ? 200 : 150;

      const response = await API.post("/payments/verify", {
        userId: user.id,
        from,
        to: tripLabel,
        distanceKm: distance,
        vehicleType: pendingVehicle.vehicle_type,
        travelDate: scheduledDateTime,
        amount: advanceAmt,
        transactionRef: transactionRef.trim()
      });

      setSuccessModalMessage(
        response.data?.message || "Advance payment successfully documented. Reservation awaiting verification."
      );
      setSuccessActionCallback(() => () => navigate("/bookings"));
    } catch (error) {
      alert(error.response?.data?.message || "Booking verification submission failed. Please try again.");
    } finally {
      setBookingVehicle(null);
      setPendingVehicle(null);
    }
  }

  async function handleSupportSubmit(e) {
    e.preventDefault();
    try {
      await API.post("/support/ticket", {
        userId: user?.id,
        subject: supportSubject,
        message: supportMessage
      });
      setSuccessModalMessage("Client support inquiry registered successfully. Our representatives will follow up promptly.");
      setShowSupportModal(false);
      setSupportMessage("");
    } catch (error) {
      alert("Failed to submit support inquiry.");
    }
  }

  async function handleFeedbackSubmit(e) {
    e.preventDefault();
    try {
      await API.post("/support/feedback", {
        userId: user?.id,
        rating: feedbackRating,
        comments: feedbackComments
      });
      setSuccessModalMessage("Your evaluation has been submitted. Thank you for your feedback.");
      setShowFeedbackModal(false);
      setFeedbackComments("");
    } catch (error) {
      alert("Failed to submit service evaluation.");
    }
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    const userMsg = inputMessage.trim();
    setChatMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setInputMessage("");
    setChatLoading(true);
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Inquiry received. A service desk representative is monitoring this channel." }
      ]);
      setChatLoading(false);
    }, 700);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/signin");
  }

  const today = new Date().toISOString().split("T")[0];
  const advanceAmount = tripType === "outstation" ? 200 : 150;
  const upiQrString = `upi://pay?pa=8465826241-3@ybl&pn=GoTrip&am=${advanceAmount}&cu=INR`;

  return (
    <div style={styles.dashboardPage}>
      {/* NAVIGATION BAR */}
      <header style={styles.dashboardNav}>
        <div style={styles.navContainer}>
          <strong style={styles.navLogo} onClick={() => navigate("/")}>
            Go<span style={styles.logoSpan}>Trip</span>
          </strong>
          <div style={styles.navRight}>
            <div style={styles.userBadge}>
              <span>👤</span>
              <span style={styles.welcomeText}>{user?.name || "Client Portal"}</span>
            </div>
            <button type="button" style={styles.navButton} onClick={() => setShowNotificationsModal(true)}>
              🔔 Notifications {notifications.some((n) => !n.is_read) && (
                <span style={styles.notificationBadge}>
                  {notifications.filter((n) => !n.is_read).length}
                </span>
              )}
            </button>
            <button type="button" style={styles.navButton} onClick={() => setShowContactModal(true)}>
              📞 Communications
            </button>
            <button type="button" style={styles.navButton} onClick={() => setShowInstructionsModal(true)}>
              📋 Policy Guidelines
            </button>
            <button type="button" style={styles.navButton} onClick={() => setShowSupportModal(true)}>
              🎧 Support Services
            </button>
            <button type="button" style={styles.navButton} onClick={() => setShowFeedbackModal(true)}>
              ⭐ Quality Review
            </button>
            <button type="button" style={styles.navButton} onClick={() => navigate("/bookings")}>
              My Reservations
            </button>
            <button type="button" style={styles.navButton} onClick={() => navigate("/profile")}>
              Account Profile
            </button>
            {user?.role === "admin" && (
              <button type="button" style={styles.adminButton} onClick={() => navigate("/admin")}>
                Operations Portal
              </button>
            )}
            <button type="button" style={styles.logoutButton} onClick={logout}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <div style={styles.heroSection}>
        <div style={styles.heroContentContainer}>
          <div style={styles.heroHeadingWrapper}>
            <span style={styles.eyebrow}>EXECUTIVE CHAUFFEUR & TRANSIT SOLUTIONS</span>
            <h1 style={styles.h1}>Schedule Your Executive Transit</h1>
            <p style={styles.heroSubtitle}>
              Punctual, secure, and professional city charters and intercity travel logistics.
            </p>
          </div>

          <div style={styles.bookingBox}>
            <div style={styles.tripTabs}>
              <button
                type="button"
                style={{ ...styles.tripTabBtn, ...(tripType === "outstation" ? styles.tripTabActive : {}) }}
                onClick={() => { setTripType("outstation"); setSearched(false); }}
              >
                🚗 Intercity Charter
              </button>
              <button
                type="button"
                style={{ ...styles.tripTabBtn, ...(tripType === "local" ? styles.tripTabActive : {}) }}
                onClick={() => { setTripType("local"); setSearched(false); }}
              >
                🏙 Local Hourly Rental
              </button>
            </div>

            <form style={styles.routeForm} onSubmit={searchRoute}>
              <div style={styles.inputsGrid}>
                <div style={styles.inputGroupWrapper}>
                  <label style={styles.fieldLabel}>
                    {tripType === "outstation" ? "Departure Location" : "Base City / District"}
                  </label>
                  <LocationInput
                    value={from}
                    onChange={setFrom}
                    placeholder="Enter departure address or landmark"
                    currentLocationOnly={true}
                    showCurrentLocation={true}
                  />
                </div>
                {tripType === "outstation" ? (
                  <div style={styles.inputGroupWrapper}>
                    <label style={styles.fieldLabel}>Arrival Destination</label>
                    <LocationInput
                      value={to}
                      onChange={setTo}
                      placeholder="Enter destination address or landmark"
                      showCurrentLocation={false}
                    />
                  </div>
                ) : (
                  <div style={styles.inputGroupWrapper}>
                    <label style={styles.fieldLabel}>Select Charter Package</label>
                    <select
                      style={styles.selectPackageDropdown}
                      value={localPackage}
                      onChange={(e) => setLocalPackage(e.target.value)}
                    >
                      <option value="4_40">Tier 1: 4 Hours / 40 KM Package</option>
                      <option value="8_80">Tier 2: 8 Hours / 80 KM Package</option>
                      <option value="12_120">Tier 3: 12 Hours / 120 KM Package</option>
                      <option value="24_240">Tier 4: 24 Hours / 240 KM Package</option>
                      <option value="48_480">Tier 5: 48 Hours / 480 KM Package</option>
                    </select>
                  </div>
                )}
              </div>
              <button type="submit" style={styles.primaryButton}>
                {tripType === "outstation" ? "Calculate Route & View Fleet" : "Review Hourly Options"}
              </button>
            </form>

            {searched && (
              <div style={styles.dateSection}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={styles.dateLabel}>📅 Scheduled Date</label>
                    <input
                      type="date"
                      min={today}
                      value={travelDate}
                      onChange={(e) => setTravelDate(e.target.value)}
                      style={styles.dateInput}
                    />
                  </div>
                  <div>
                    <label style={styles.dateLabel}>⏰ Boarding Time</label>
                    <input
                      type="time"
                      value={tripTime}
                      onChange={(e) => setTripTime(e.target.value)}
                      style={styles.dateInput}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SEARCH RESULTS & FLEET */}
      <main style={styles.dashboardMain}>
        {searched && (
          <section style={styles.resultsSection}>
            <div style={styles.routeSummary}>
              <div style={styles.routePoints}>
                <span style={styles.routePointLabel}>
                  {tripType === "outstation" ? "Confirmed Itinerary:" : "Selected Charter Tier:"}
                </span>
                <strong style={styles.routePoint}>{from}</strong>
                {tripType === "outstation" && (
                  <>
                    <span>→</span>
                    <strong style={styles.routePoint}>{to}</strong>
                  </>
                )}
              </div>
              <span style={styles.distanceBadge}>
                {tripType === "outstation" ? `Transit Distance: ${distance} KM` : `Allotted Allowance: ${distance} KM`}
              </span>
            </div>

            <h2 style={styles.h2}>Available Vehicle Classes</h2>

            {loadingPricing ? (
              <div style={styles.messageBox}>
                <div style={styles.funnyLoaderContainer}>
                  <div style={styles.carMovingIcon}>🚗💨</div>
                  <div style={styles.loadingSpinner}></div>
                </div>
                <p style={styles.messageText}>Querying fleet availability and dispatch rates...</p>
              </div>
            ) : pricing.length === 0 ? (
              <div style={styles.messageBox}>
                <p style={styles.messageText}>No vehicles currently available for this category.</p>
              </div>
            ) : (
              <div style={styles.vehicleGrid}>
                {pricing.map((vehicle) => {
                  const rate = Number(vehicle.rate_per_km);
                  const fare = distance * rate;
                  return (
                    <div style={styles.vehicleCard} key={vehicle.id}>
                      <div style={styles.cardHeaderTop}>
                        <div style={styles.vehicleIcon}>🚕</div>
                        <span style={styles.categoryBadge}>Verified Fleet</span>
                      </div>
                      <h3 style={styles.vehicleTitle}>{vehicle.vehicle_type}</h3>
                      <p style={styles.vehicleRate}>₹{rate.toFixed(2)} / KM Standard Rate</p>
                      <div style={styles.fareContainer}>
                        <span style={styles.fareLabel}>Estimated Fare Total</span>
                        <div style={styles.fare}>₹{fare.toLocaleString("en-IN")}</div>
                      </div>
                      <button
                        type="button"
                        style={{
                          ...styles.primaryButton,
                          ...styles.fullButton,
                          ...(bookingVehicle === vehicle.id ? styles.buttonDisabled : {})
                        }}
                        disabled={bookingVehicle === vehicle.id}
                        onClick={() => handleBookClick(vehicle)}
                      >
                        {bookingVehicle === vehicle.id ? "Processing Reservation..." : "Proceed with Booking"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>

      {/* GUIDELINES MODAL */}
      {showInstructionsModal && (
        <div style={styles.modalOverlay} onClick={() => setShowInstructionsModal(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>📋 Service Protocols & Guidelines</h3>
              <button style={styles.closeModalButton} onClick={() => setShowInstructionsModal(false)}>✕</button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.ruleSection}>
                <h4 style={{ ...styles.ruleTitle, color: "#15803d" }}>Standard Protocols</h4>
                <ul style={styles.ruleList}>
                  <li>Ensure departure and arrival designations are exact to prevent routing recalculations.</li>
                  <li>Maintain an active primary telephone connection for chauffeur coordination.</li>
                  <li>Select fleet categories corresponding to actual passenger counts and baggage requirements.</li>
                </ul>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.modalActionBtn} onClick={() => setShowInstructionsModal(false)}>Acknowledge</button>
            </div>
          </div>
        </div>
      )}

      {/* ADVANCE PAYMENT & UTR SUBMISSION MODAL */}
      {showTermsModal && (
        <div style={styles.modalOverlay} onClick={() => setShowTermsModal(false)}>
          <div style={{ ...styles.modalCard, maxWidth: "540px" }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.modalEyebrow}>SECURE CHECKOUT</span>
                <h2 style={styles.modalTitle}>💳 Deposit Authorization</h2>
              </div>
              <button style={styles.closeModalButton} onClick={() => setShowTermsModal(false)}>✕</button>
            </div>
            <div style={styles.modalBody}>
              <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", padding: "16px", borderRadius: "14px", textAlign: "center" }}>
                <span style={{ fontSize: "12px", fontWeight: "800", color: "#1d4ed8", textTransform: "uppercase" }}>
                  {tripType === "outstation" ? "Intercity Advance Deposit" : "Local Charter Advance Deposit"}
                </span>
                <div style={{ fontSize: "30px", fontWeight: "800", color: "#1e40af", margin: "4px 0" }}>₹{advanceAmount}</div>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
                  Corporate UPI VPA: <span style={{ color: "#2563eb" }}>8465826241-3@ybl</span>
                </div>
                <div style={{ backgroundColor: "#ffffff", padding: "10px", borderRadius: "12px", display: "inline-block", marginTop: "10px" }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiQrString)}`}
                    alt="Official Payment QR"
                    style={{ width: "130px", height: "130px", display: "block" }}
                  />
                </div>
                <p style={{ fontSize: "11px", color: "#64748b", margin: "6px 0 0 0" }}>Scan through certified UPI banking applications</p>
              </div>

              <div style={styles.inputGroupWrapper}>
                <label style={styles.fieldLabel}>Enter Bank Transaction Reference / UTR Number</label>
                <input
                  type="text"
                  placeholder="e.g. 435678912345"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  style={styles.dateInput}
                  required
                />
              </div>

              <div style={styles.ruleSection}>
                <h4 style={{ ...styles.ruleTitle, color: "#1e3a8a" }}>Cancellation & Refund Terms</h4>
                <ul style={styles.ruleList}>
                  <li>The advance authorization of ₹{advanceAmount} is <strong>non-refundable</strong> in client-initiated cancellations.</li>
                  <li>In the event of cancellation initiated by GoTrip, a <strong>100% full refund</strong> will be remitted to source.</li>
                </ul>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button
                type="button"
                style={{ ...styles.modalCancelAction, marginRight: "10px" }}
                onClick={() => setShowTermsModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{ ...styles.modalActionBtn, backgroundColor: "#16a34a" }}
                onClick={confirmBooking}
              >
                Submit Authorization & Finalize
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS AUDIT MODAL */}
      {showNotificationsModal && (
        <div style={styles.modalOverlay} onClick={() => setShowNotificationsModal(false)}>
          <div style={{ ...styles.modalCard, maxWidth: "480px" }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.modalEyebrow}>SYSTEM LOGS</span>
                <h3 style={styles.modalTitle}>Dispatch & Status Notifications</h3>
              </div>
              <button style={styles.closeModalButton} onClick={() => setShowNotificationsModal(false)}>✕</button>
            </div>
            <div style={{ padding: "12px 24px", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <div style={styles.alertFilterButtons}>
                <button
                  type="button"
                  style={{ ...styles.alertTabBtn, ...(notificationFilter === "all" ? styles.alertTabActive : {}) }}
                  onClick={() => setNotificationFilter("all")}
                >
                  All Logs
                </button>
                <button
                  type="button"
                  style={{ ...styles.alertTabBtn, ...(notificationFilter === "unread" ? styles.alertTabActive : {}) }}
                  onClick={() => setNotificationFilter("unread")}
                >
                  Unread
                </button>
                <button
                  type="button"
                  style={{ ...styles.alertTabBtn, ...(notificationFilter === "read" ? styles.alertTabActive : {}) }}
                  onClick={() => setNotificationFilter("read")}
                >
                  Acknowledged
                </button>
              </div>
            </div>
            <div style={{ maxHeight: "320px", overflowY: "auto", padding: "16px 24px" }}>
              {filteredNotifications.length === 0 ? (
                <p style={{ textAlign: "center", color: "#64748b", margin: "20px 0" }}>No records corresponding to this category.</p>
              ) : (
                filteredNotifications.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      ...styles.notificationItem,
                      backgroundColor: n.is_read ? "#ffffff" : "#f0fdf4",
                      border: "1px solid #e2e8f0",
                      padding: "12px",
                      borderRadius: "10px",
                      marginBottom: "8px"
                    }}
                  >
                    <div style={{ flex: 1, paddingRight: "8px" }}>
                      <strong>{n.title}</strong>
                      <p style={{ margin: "3px 0 0 0", fontSize: "12px", color: "#475569" }}>{n.message}</p>
                    </div>
                    <button type="button" style={styles.alertViewBtn} onClick={() => handleViewAlert(n)}>
                      Inspect
                    </button>
                  </div>
                ))
              )}
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.modalActionBtn} onClick={() => setShowNotificationsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE NOTIFICATION INSPECTION */}
      {selectedAlert && (
        <div style={styles.modalOverlay} onClick={() => setSelectedAlert(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{selectedAlert.title}</h3>
              <button style={styles.closeModalButton} onClick={() => setSelectedAlert(null)}>✕</button>
            </div>
            <div style={styles.modalBody}>
              <p style={{ fontSize: "14px", lineHeight: "1.5", color: "#334155" }}>{selectedAlert.message}</p>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.modalActionBtn} onClick={() => setSelectedAlert(null)}>Dismiss</button>
            </div>
          </div>
        </div>
      )}

      {/* COMMUNICATIONS MODAL */}
      {showContactModal && !chatOpen && (
        <div style={styles.modalOverlay} onClick={() => setShowContactModal(false)}>
          <div style={{ ...styles.modalCard, maxWidth: "420px" }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Corporate Communications</h3>
              <button style={styles.closeModalButton} onClick={() => setShowContactModal(false)}>✕</button>
            </div>
            <div style={styles.modalBody}>
              <button style={styles.contactOptionCard} onClick={() => setChatOpen(true)}>
                <div style={{ fontSize: "24px" }}>🤖</div>
                <div>
                  <strong>Concierge Service Terminal</strong>
                  <span style={{ fontSize: "12px", color: "#64748b", display: "block" }}>Immediate response system and agent escalation</span>
                </div>
              </button>
              <a href="tel:+919876543210" style={{ ...styles.contactOptionCard, textDecoration: "none" }}>
                <div style={{ fontSize: "24px" }}>📞</div>
                <div>
                  <strong>Executive Dispatch Desk</strong>
                  <span style={{ fontSize: "12px", color: "#64748b", display: "block" }}>Direct telephone support (+91 98765 43210)</span>
                </div>
              </a>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.modalCancelAction} onClick={() => setShowContactModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* LIVE SUPPORT CHAT */}
      {chatOpen && (
        <div style={styles.modalOverlay} onClick={() => { setChatOpen(false); setShowContactModal(false); }}>
          <div style={{ ...styles.modalCard, maxWidth: "480px", height: "500px", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Service Terminal Channel</h3>
              <button style={styles.closeModalButton} onClick={() => { setChatOpen(false); setShowContactModal(false); }}>✕</button>
            </div>
            <div style={{ flex: 1, padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", backgroundColor: "#f8fafc" }}>
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                    backgroundColor: msg.sender === "user" ? "#2563eb" : "#ffffff",
                    color: msg.sender === "user" ? "#ffffff" : "#0f172a",
                    border: msg.sender === "user" ? "none" : "1px solid #e2e8f0",
                    padding: "10px",
                    borderRadius: "10px",
                    maxWidth: "80%",
                    fontSize: "13px"
                  }}
                >
                  {msg.text}
                </div>
              ))}
              {chatLoading && (
                <div style={{ fontSize: "12px", color: "#64748b" }}>Transmitting response...</div>
              )}
            </div>
            <form onSubmit={handleSendMessage} style={{ padding: "12px", borderTop: "1px solid #e2e8f0", display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="Type query or 'agent' to escalate..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                style={{ flex: 1, padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", outline: "none" }}
              />
              <button type="submit" style={{ backgroundColor: "#2563eb", color: "#ffffff", border: "none", padding: "0 16px", borderRadius: "8px", fontWeight: "700" }}>
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SUPPORT TICKET SUBMISSION */}
      {showSupportModal && (
        <div style={styles.modalOverlay} onClick={() => setShowSupportModal(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Log Service Request</h3>
              <button style={styles.closeModalButton} onClick={() => setShowSupportModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSupportSubmit} style={styles.modalBody}>
              <div style={styles.inputGroupWrapper}>
                <label style={styles.fieldLabel}>Request Classification</label>
                <select value={supportSubject} onChange={(e) => setSupportSubject(e.target.value)} style={styles.selectPackageDropdown}>
                  <option value="Booking Modification">Itinerary / Schedule Modification</option>
                  <option value="Cancellation & Refund">Cancellation & Remittance Audit</option>
                  <option value="Driver Coordination">Chauffeur Coordination Inquiry</option>
                </select>
              </div>
              <div style={styles.inputGroupWrapper}>
                <label style={styles.fieldLabel}>Detailed Account</label>
                <textarea
                  required
                  rows="4"
                  placeholder="Outline the operational details of your request..."
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  style={{ ...styles.dateInput, height: "100px", padding: "10px" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" style={styles.modalCancelAction} onClick={() => setShowSupportModal(false)}>Cancel</button>
                <button type="submit" style={styles.modalActionBtn}>Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FEEDBACK SUBMISSION */}
      {showFeedbackModal && (
        <div style={styles.modalOverlay} onClick={() => setShowFeedbackModal(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Quality Audit & Review</h3>
              <button style={styles.closeModalButton} onClick={() => setShowFeedbackModal(false)}>✕</button>
            </div>
            <form onSubmit={handleFeedbackSubmit} style={styles.modalBody}>
              <div style={styles.inputGroupWrapper}>
                <label style={styles.fieldLabel}>Operational Score</label>
                <select value={feedbackRating} onChange={(e) => setFeedbackRating(Number(e.target.value))} style={styles.selectPackageDropdown}>
                  <option value="5">⭐⭐⭐⭐⭐ 5 - Exceptional Standard</option>
                  <option value="4">⭐⭐⭐⭐ 4 - Met Specifications</option>
                  <option value="3">⭐⭐⭐ 3 - Acceptable Standard</option>
                  <option value="2">⭐⭐ 2 - Requires Rectification</option>
                  <option value="1">⭐ 1 - Substandard Service</option>
                </select>
              </div>
              <div style={styles.inputGroupWrapper}>
                <label style={styles.fieldLabel}>Formal Comments</label>
                <textarea
                  rows="3"
                  placeholder="Provide qualitative feedback on transit service..."
                  value={feedbackComments}
                  onChange={(e) => setFeedbackComments(e.target.value)}
                  style={{ ...styles.dateInput, height: "80px", padding: "10px" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" style={styles.modalCancelAction} onClick={() => setShowFeedbackModal(false)}>Cancel</button>
                <button type="submit" style={styles.modalActionBtn}>File Review</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUCCESS CONFIRMATION MODAL */}
      {successModalMessage && (
        <div style={styles.modalOverlay} onClick={() => {
          const cb = successActionCallback;
          setSuccessModalMessage("");
          if (cb) cb();
        }}>
          <div style={{ ...styles.modalCard, maxWidth: "400px", textAlign: "center", padding: "30px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: "40px" }}>🎉</div>
            <h3 style={{ fontSize: "20px", margin: "10px 0" }}>Operation Confirmed</h3>
            <p style={{ fontSize: "14px", color: "#475569" }}>{successModalMessage}</p>
            <button
              style={{ ...styles.modalActionBtn, width: "100%", marginTop: "16px" }}
              onClick={() => {
                const cb = successActionCallback;
                setSuccessModalMessage("");
                if (cb) cb();
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  dashboardPage: { minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "'Inter', system-ui, sans-serif", color: "#1e293b" },
  dashboardNav: { backgroundColor: "rgba(255, 255, 255, 0.95)", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 100 },
  navContainer: { maxWidth: "1400px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 28px", gap: "16px" },
  navBrandArea: { flexShrink: 0 },
  navLogo: { fontSize: "26px", fontWeight: "800", color: "#0f172a", cursor: "pointer" },
  logoSpan: { color: "#2563eb" },
  navRight: { display: "flex", alignItems: "center", gap: "8px", overflowX: "auto" },
  userBadge: { display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#f1f5f9", padding: "6px 12px", borderRadius: "20px", border: "1px solid #e2e8f0" },
  welcomeText: { fontSize: "12px", fontWeight: "700", color: "#334155" },
  navButton: { backgroundColor: "#ffffff", color: "#475569", border: "1px solid #cbd5e1", padding: "7px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap" },
  adminButton: { backgroundColor: "#fef3c7", color: "#b45309", border: "1px solid #fde68a", padding: "7px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "700", cursor: "pointer" },
  logoutButton: { backgroundColor: "#fef2f2", color: "#dc2626", border: "1px solid #fee2e2", padding: "7px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "700", cursor: "pointer" },
  notificationBadge: { marginLeft: "5px", backgroundColor: "#dc2626", color: "#fff", padding: "2px 5px", borderRadius: "50%", fontSize: "9px" },
  alertFilterButtons: { display: "flex", gap: "6px" },
  alertTabBtn: { flex: 1, background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "6px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", color: "#64748b", cursor: "pointer" },
  alertTabActive: { backgroundColor: "#2563eb", color: "#ffffff", borderColor: "#2563eb" },
  notificationItem: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  alertViewBtn: { backgroundColor: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer" },
  heroSection: { backgroundImage: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #2563eb 100%)", padding: "60px 20px 90px 20px", color: "#ffffff" },
  heroContentContainer: { maxWidth: "750px", margin: "0 auto" },
  heroHeadingWrapper: { textAlign: "center", marginBottom: "36px" },
  eyebrow: { fontSize: "12px", fontWeight: "800", color: "#60a5fa", letterSpacing: "2px", marginBottom: "10px", display: "block" },
  h1: { fontSize: "38px", fontWeight: "800", color: "#ffffff", marginBottom: "12px" },
  heroSubtitle: { fontSize: "16px", color: "#cbd5e1", margin: 0 },
  bookingBox: { backgroundColor: "#ffffff", padding: "40px", borderRadius: "24px", boxSizing: "border-box", color: "#1e293b", boxShadow: "0 25px 50px rgba(0,0,0,0.2)" },
  tripTabs: { display: "flex", gap: "10px", marginBottom: "28px", backgroundColor: "#f1f5f9", padding: "6px", borderRadius: "14px" },
  tripTabBtn: { flex: 1, background: "none", border: "none", padding: "12px", borderRadius: "10px", fontSize: "14px", fontWeight: "700", color: "#64748b", cursor: "pointer" },
  tripTabActive: { backgroundColor: "#ffffff", color: "#2563eb", boxShadow: "0 4px 15px rgba(37,99,235,0.1)" },
  routeForm: { display: "flex", flexDirection: "column", gap: "20px" },
  inputsGrid: { display: "flex", flexDirection: "column", gap: "18px" },
  inputGroupWrapper: { display: "flex", flexDirection: "column", gap: "8px", width: "100%" },
  fieldLabel: { fontSize: "13px", fontWeight: "700", color: "#334155" },
  selectPackageDropdown: { width: "100%", height: "50px", padding: "0 16px", border: "1px solid #cbd5e1", borderRadius: "12px", fontSize: "14px", backgroundColor: "#f8fafc", fontWeight: "600" },
  primaryButton: { backgroundColor: "#2563eb", color: "#ffffff", border: "none", padding: "16px 24px", borderRadius: "12px", fontSize: "16px", fontWeight: "800", cursor: "pointer", width: "100%", marginTop: "8px" },
  fullButton: { marginTop: "20px", width: "100%", padding: "14px", fontSize: "15px" },
  buttonDisabled: { opacity: 0.6, cursor: "not-allowed" },
  dateSection: { marginTop: "28px", paddingTop: "28px", borderTop: "1px solid #f1f5f9" },
  dateLabel: { display: "block", fontWeight: "700", fontSize: "13px", color: "#334155", marginBottom: "8px" },
  dateInput: { width: "100%", height: "50px", padding: "0 16px", border: "1px solid #cbd5e1", borderRadius: "12px", fontSize: "15px", backgroundColor: "#f8fafc", fontWeight: "600", boxSizing: "border-box" },
  dashboardMain: { maxWidth: "1150px", margin: "-40px auto 60px auto", padding: "0 20px", position: "relative", zIndex: 2 },
  resultsSection: { marginTop: "20px" },
  routeSummary: { display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#ffffff", padding: "24px 28px", borderRadius: "18px", border: "1px solid #e2e8f0", marginBottom: "36px" },
  routePoints: { display: "flex", alignItems: "center", gap: "12px" },
  routePointLabel: { fontSize: "12px", fontWeight: "800", color: "#64748b" },
  routePoint: { fontSize: "16px", fontWeight: "800", color: "#0f172a" },
  distanceBadge: { backgroundColor: "#eff6ff", color: "#1d4ed8", padding: "8px 16px", borderRadius: "20px", fontSize: "13px", fontWeight: "700" },
  resultsHeader: { marginBottom: "24px" },
  h2: { fontSize: "24px", fontWeight: "800", color: "#0f172a", margin: "0 0 16px 0" },
  vehicleGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "28px" },
  vehicleCard: { backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "32px", display: "flex", flexDirection: "column" },
  cardHeaderTop: { display: "flex", justifyContent: "space-between", marginBottom: "20px" },
  vehicleIcon: { fontSize: "30px", backgroundColor: "#eff6ff", width: "60px", height: "60px", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center" },
  categoryBadge: { fontSize: "11px", fontWeight: "800", backgroundColor: "#f0fdf4", color: "#15803d", padding: "6px 12px", borderRadius: "14px" },
  vehicleTitle: { fontSize: "20px", fontWeight: "800", color: "#0f172a", marginBottom: "6px" },
  vehicleRate: { fontSize: "13px", color: "#64748b", marginBottom: "24px", fontWeight: "600" },
  fareContainer: { marginTop: "auto", paddingTop: "20px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" },
  fareLabel: { fontSize: "12px", fontWeight: "700", color: "#64748b" },
  fare: { fontSize: "24px", fontWeight: "800", color: "#2563eb" },
  messageBox: { backgroundColor: "#ffffff", padding: "60px 20px", borderRadius: "20px", border: "1px solid #e2e8f0", textAlign: "center" },
  funnyLoaderContainer: { position: "relative", height: "50px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center" },
  carMovingIcon: { fontSize: "24px", position: "absolute", animation: "bounceCar 1s infinite alternate ease-in-out" },
  messageText: { fontSize: "16px", fontWeight: "800", color: "#0f172a", margin: 0 },
  loadingSpinner: { width: "50px", height: "50px", border: "4px solid #e2e8f0", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  modalOverlay: { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(15, 23, 42, 0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" },
  modalCard: { backgroundColor: "#ffffff", width: "100%", maxWidth: "540px", borderRadius: "24px", overflow: "hidden" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 28px", borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" },
  modalEyebrow: { fontSize: "11px", fontWeight: "800", color: "#2563eb", letterSpacing: "1px", display: "block", marginBottom: "4px" },
  modalTitle: { fontSize: "18px", fontWeight: "800", color: "#0f172a", margin: 0 },
  closeModalButton: { background: "none", border: "none", fontSize: "18px", fontWeight: "bold", color: "#64748b", cursor: "pointer" },
  modalBody: { padding: "28px", maxHeight: "65vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" },
  ruleSection: { backgroundColor: "#f8fafc", padding: "18px", borderRadius: "14px", border: "1px solid #e2e8f0" },
  ruleTitle: { fontSize: "14px", fontWeight: "800", margin: "0 0 10px 0" },
  ruleList: { margin: 0, paddingLeft: "18px", fontSize: "13px", color: "#334155", lineHeight: "1.6", display: "flex", flexDirection: "column", gap: "6px" },
  modalFooter: { padding: "20px 28px", borderTop: "1px solid #e2e8f0", backgroundColor: "#f8fafc", display: "flex", justifyContent: "flex-end" },
  modalActionBtn: { backgroundColor: "#2563eb", color: "#ffffff", border: "none", padding: "12px 24px", borderRadius: "10px", fontSize: "14px", fontWeight: "700", cursor: "pointer" },
  modalCancelAction: { backgroundColor: "#e2e8f0", color: "#334155", border: "none", padding: "12px 20px", borderRadius: "10px", fontSize: "14px", fontWeight: "700", cursor: "pointer" },
  contactOptionCard: { display: "flex", alignItems: "center", gap: "14px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", padding: "14px 16px", borderRadius: "14px", cursor: "pointer", width: "100%", boxSizing: "border-box" }
};