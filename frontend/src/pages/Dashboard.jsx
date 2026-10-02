import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import API from "../services/api";
import LocationInput from "../components/LocationInput";

// Embedded keyframes for the animated loader
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

  const user = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  // Trip Type State: 'outstation' or 'local'
  const [tripType, setTripType] = useState("outstation");

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [localPackage, setLocalPackage] = useState("4_40"); // 4 hrs / 40 km default
  const [travelDate, setTravelDate] = useState("");
  const [tripTime, setTripTime] = useState("10:00"); // Default pickup time

  const [distance, setDistance] = useState(0);
  const [pricing, setPricing] = useState([]);

  const [searched, setSearched] = useState(false);
  const [loadingPricing, setLoadingPricing] = useState(true);
  const [bookingVehicle, setBookingVehicle] = useState(null);

  // Modal State for Booking Guidelines Pop-up
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);

  // Booking Terms & Payment Gateway modal state
  const [pendingVehicle, setPendingVehicle] = useState(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [selectedUpi, setSelectedUpi] = useState("gpay");
  const [transactionRef, setTransactionRef] = useState("");

  // Support & Feedback Modal States
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const [supportSubject, setSupportSubject] = useState("Booking Modification");
  const [supportMessage, setSupportMessage] = useState("");

  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComments, setFeedbackComments] = useState("");

  // Notifications State, Filters, and Inspection Modal
  const [notifications, setNotifications] = useState([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState("all");
  const [selectedAlert, setSelectedAlert] = useState(null);

  // Contact Us & Live Chat Bot States
  const [showContactModal, setShowContactModal] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: "bot", text: "Hello! I am your GoTrip Assistant. This chat thread stays open until your issue is resolved. Type 'agent' anytime to connect with an admin." }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Stylish Success Modal State
  const [successModalMessage, setSuccessModalMessage] = useState("");
  const [successActionCallback, setSuccessActionCallback] = useState(null);

  /*
  =========================
  LOAD PRICING (Dynamic based on Trip Type)
  =========================
  */
  useEffect(() => {
    async function loadPricing() {
      try {
        setLoadingPricing(true);
        const response = await API.get(`/pricing?tripType=${tripType}`);
        setPricing(response.data);
      } catch (error) {
        console.error("Pricing error:", error);
        alert(error.response?.data?.message || "Unable to load vehicle pricing");
      } finally {
        setLoadingPricing(false);
      }
    }
    loadPricing();
  }, [tripType]);

  /*
  =========================
  LOAD NOTIFICATIONS
  =========================
  */
  useEffect(() => {
    async function loadNotifications() {
      if (!user?.id) return;
      try {
        const response = await API.get(`/bookings/notifications/${user.id}`);
        setNotifications(response.data || []);
      } catch (err) {
        console.error("Failed to load notifications", err);
      }
    }
    loadNotifications();
    const interval = setInterval(loadNotifications, 10000); // Poll every 10s for real-time updates
    return () => clearInterval(interval);
  }, [user?.id]);

  // Handle View alert click (marks as read and opens inspection pop-up)
  const handleViewAlert = async (alertItem) => {
    setSelectedAlert(alertItem);
    setShowNotificationsModal(false);

    if (!alertItem.is_read) {
      try {
        await API.patch(`/bookings/notifications/${alertItem.id}/read`);
        setNotifications(prev =>
          prev.map(n => n.id === alertItem.id ? { ...n, is_read: true } : n)
        );
      } catch (err) {
        console.error("Failed to mark notification as read", err);
      }
    }
  };

  // Filtered notifications list
  const filteredNotifications = notifications.filter(n => {
    if (notificationFilter === "unread") return !n.is_read;
    if (notificationFilter === "read") return n.is_read;
    return true;
  });


  /*
  =========================
  SEARCH ROUTE / PACKAGE CALCULATION
  =========================
  */
  async function searchRoute(e) {
    e.preventDefault();

    if (!from.trim()) {
      alert("Please enter your pickup location.");
      return;
    }

    if (tripType === "outstation") {
      if (!to.trim()) {
        alert("Please select a destination location.");
        return;
      }

      if (from.trim().toLowerCase() === to.trim().toLowerCase()) {
        alert("From and To locations cannot be the same.");
        return;
      }

      try {
        const response = await API.post("/location/calculate-distance", {
          origin: from.trim(),
          destination: to.trim()
        });

        const calculatedDistanceKm = response.data.distanceKm;

        if (!calculatedDistanceKm) {
          alert("Could not determine precise distance for this route. Please check location names.");
          return;
        }

        setDistance(calculatedDistanceKm);
        setSearched(true);

      } catch (error) {
        console.error("Error calculating map distance:", error);
        alert(
          error.response?.data?.message || 
          "Could not calculate exact route distance. Please ensure valid locations in India are selected."
        );
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


  /*
  =========================
  BOOK VEHICLE CLICK TRIGGER
  =========================
  */
  function handleBookClick(vehicle) {
    if (!from || (tripType === "outstation" && !to)) {
      alert("Please complete your location selection.");
      return;
    }

    if (!travelDate) {
      alert("Please select a travel date.");
      return;
    }

    if (!distance) {
      alert("Please search your route or package first.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      alert("Please sign in before booking.");
      navigate("/signin");
      return;
    }

    setPendingVehicle(vehicle);
    setTransactionRef("");
    setShowTermsModal(true);
  }


  /*
  =========================
  CONFIRM BOOKING (After Successful Payment Verification)
  =========================
  */
  async function confirmBooking() {
    if (!pendingVehicle) return;

    if (!transactionRef.trim()) {
      alert("Please enter the UPI Transaction Reference ID / UTR number after making the payment.");
      return;
    }

    try {
      setShowTermsModal(false);
      setBookingVehicle(pendingVehicle.id);

      const tripLabel = tripType === "local" ? `Local Rental (${localPackage.replace("_", " Hrs / ")} KM)` : to;
      const finalTime = tripTime ? tripTime : "10:00";
      const scheduledDateTime = `${travelDate} ${finalTime}:00`;
      const advanceAmt = tripType === "outstation" ? 200 : 150;

      const response = await API.post(
        "/payments/verify",
        {
          userId: user.id,
          from,
          to: tripLabel,
          distanceKm: distance,
          vehicleType: pendingVehicle.vehicle_type,
          travelDate: scheduledDateTime,
          amount: advanceAmt,
          transactionRef: transactionRef.trim()
        }
      );

      setSuccessModalMessage(
        response.data?.message ||
        "Payment proof verified! Booking confirmed and awaiting admin approval."
      );
      setSuccessActionCallback(() => () => navigate("/bookings"));

    } catch (error) {
      console.error("Booking error:", error);
      alert(error.response?.data?.message || "Booking submission failed. Please try again.");
    } finally {
      setBookingVehicle(null);
      setPendingVehicle(null);
    }
  }


  /*
  =========================
  SUPPORT & FEEDBACK SUBMISSIONS
  =========================
  */
  async function handleSupportSubmit(e) {
    e.preventDefault();
    try {
      await API.post("/support/ticket", {
        userId: user?.id,
        subject: supportSubject,
        message: supportMessage
      });
      setSuccessModalMessage("Support ticket submitted! Our team will contact you shortly.");
      setSuccessActionCallback(() => () => setSuccessModalMessage(""));
      setShowSupportModal(false);
      setSupportMessage("");
    } catch (error) {
      alert("Could not submit support request.");
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
      setSuccessModalMessage("Thank you! Your feedback helps us improve GoTrip.");
      setSuccessActionCallback(() => () => setSuccessModalMessage(""));
      setShowFeedbackModal(false);
      setFeedbackComments("");
    } catch (error) {
      alert("Could not submit feedback.");
    }
  }


  /*
  =========================
  LIVE CHAT THREAD HANDLER
  =========================
  */
  async function handleSendMessage(e) {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMsg = inputMessage.trim();
    setChatMessages(prev => [...prev, { sender: "user", text: userMsg }]);
    setInputMessage("");
    setChatLoading(true);

    try {
      const lower = userMsg.toLowerCase();

      if (lower.includes("agent") || lower.includes("human") || lower.includes("admin") || lower.includes("executive")) {
        setTimeout(async () => {
          setChatMessages(prev => [...prev, { 
            sender: "bot", 
            text: "I am escalating this conversation to our support admin team now. They will review and reply in your Alerts notification modal until this issue is resolved." 
          }]);
          
          try {
            await API.post("/support/ticket", {
              userId: user?.id,
              subject: "Live Chat Agent Escalation",
              message: `[CHAT ESCALATION]: User requested an agent. User message: "${userMsg}"`
            });
            
            setTimeout(() => {
              setChatMessages(prev => [...prev, { 
                sender: "bot", 
                text: "✅ Priority escalation ticket created! You can keep sending messages here or check your Alerts modal for admin updates." 
              }]);
              setChatLoading(false);
            }, 1000);

          } catch (error) {
            setChatMessages(prev => [...prev, { 
              sender: "bot", 
              text: "Network issue encountered while connecting to an admin. Please try using Call Helpline directly." 
            }]);
            setChatLoading(false);
          }
        }, 600);
        return;
      }

      setTimeout(() => {
        let botReply = "This chat remains open for your support needs. Is there anything else I can help you check?";

        if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
          botReply = "Hello! Welcome back to GoTrip support. How can I assist you further?";
        } else if (lower.includes("ok") || lower.includes("thank") || lower.includes("thanks") || lower.includes("great")) {
          botReply = "You're very welcome! Let me know if you need any further assistance with your rides.";
        } else if (lower.includes("price") || lower.includes("rate") || lower.includes("fare")) {
          botReply = "Our fares are calculated per kilometer according to your selected vehicle category during your search.";
        } else if (lower.includes("cancel") || lower.includes("refund")) {
          botReply = "Active bookings can be viewed under 'My Bookings'. Cancellation queries can be addressed via our support team.";
        } else if (lower.includes("driver") || lower.includes("time")) {
          botReply = "Your scheduled pickup time is confirmed once the booking status updates to 'Confirmed'.";
        }

        setChatMessages(prev => [...prev, { sender: "bot", text: botReply }]);
        setChatLoading(false);
      }, 700);

    } catch (err) {
      setChatMessages(prev => [...prev, { sender: "bot", text: "Sorry, connection error. Please try calling support." }]);
      setChatLoading(false);
    }
  }


  /*
  =========================
  LOGOUT
  =========================
  */
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

      {/* =========================
          NAVIGATION HEADER
      ========================= */}
      <header style={styles.dashboardNav}>
        <div style={styles.navContainer}>
          <div style={styles.navBrandArea}>
            <strong style={styles.navLogo} onClick={() => navigate("/")}>
              Go<span style={styles.logoSpan}>Trip</span>
            </strong>
          </div>

          <div style={styles.navRight}>
            <div style={styles.userBadge}>
              <span style={styles.userAvatar}>👤</span>
              <span style={styles.welcomeText}>
                {user?.name || "User"}
              </span>
            </div>

            {/* ALERTS POP-UP BUTTON */}
            <button
              type="button"
              style={styles.navButton}
              onClick={() => setShowNotificationsModal(true)}
            >
              🔔 Alerts
              {notifications.some(n => !n.is_read) && (
                <span style={styles.notificationBadge}>
                  {notifications.filter(n => !n.is_read).length}
                </span>
              )}
            </button>

            <button
              type="button"
              style={styles.navButton}
              onClick={() => setShowContactModal(true)}
            >
              📞 Contact
            </button>

            <button
              type="button"
              style={styles.navButton}
              onClick={() => setShowInstructionsModal(true)}
            >
              📋 Guidelines
            </button>

            <button
              type="button"
              style={styles.navButton}
              onClick={() => setShowSupportModal(true)}
            >
              🎧 Support
            </button>

            <button
              type="button"
              style={styles.navButton}
              onClick={() => setShowFeedbackModal(true)}
            >
              ⭐ Feedback
            </button>

            <button
              type="button"
              style={styles.navButton}
              onClick={() => navigate("/bookings")}
            >
              My Bookings
            </button>

            <button
              type="button"
              style={styles.navButton}
              onClick={() => navigate("/profile")}
            >
              Profile
            </button>

            {user?.role === "admin" && (
              <button
                type="button"
                style={styles.adminButton}
                onClick={() => navigate("/admin")}
              >
                Admin Panel
              </button>
            )}

            <button
              type="button"
              style={styles.logoutButton}
              onClick={logout}
            >
              Logout
            </button>
          </div>
        </div>
      </header>


      {/* =========================
          HERO BANNER & SEARCH CONTAINER
      ========================= */}
      <div style={styles.heroSection}>
        <div style={styles.heroContentContainer}>
          
          <div style={styles.heroHeadingWrapper}>
            <span style={styles.eyebrow}>
              ✨ PREMIUM CABS & RENTALS
            </span>
            <h1 style={styles.h1}>
              Where are you travelling?
            </h1>
            <p style={styles.heroSubtitle}>
              Experience safe, comfortable, and transparent outstation and local city rides.
            </p>
          </div>

          <div style={styles.singleCenterBoxContainer}>

            {/* SEARCH BOX CARD */}
            <div style={styles.bookingBox}>
              
              {/* TRIP TYPE TABS SWITCHER */}
              <div style={styles.tripTabs}>
                <button
                  type="button"
                  style={{
                    ...styles.tripTabBtn,
                    ...(tripType === "outstation" ? styles.tripTabActive : {})
                  }}
                  onClick={() => { setTripType("outstation"); setSearched(false); }}
                >
                  🚗 Outstation Cabs
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.tripTabBtn,
                    ...(tripType === "local" ? styles.tripTabActive : {})
                  }}
                  onClick={() => { setTripType("local"); setSearched(false); }}
                >
                  🏙️ Local City Rentals
                </button>
              </div>

              <form
                style={styles.routeForm}
                onSubmit={searchRoute}
              >
                <div style={styles.inputsGrid}>
                  {/* FROM / PICKUP LOCATION */}
                  <div style={styles.inputGroupWrapper}>
                    <label style={styles.fieldLabel}>
                      {tripType === "outstation" ? "Pickup Location" : "City / Pickup Area"}
                    </label>
                    <LocationInput
                      value={from}
                      onChange={setFrom}
                      placeholder={tripType === "outstation" ? "Enter pickup city or village" : "Enter city name"}
                      currentLocationOnly={true}
                      showCurrentLocation={true}
                    />
                  </div>

                  {/* DESTINATION OR LOCAL PACKAGE */}
                  {tripType === "outstation" ? (
                    <div style={styles.inputGroupWrapper}>
                      <label style={styles.fieldLabel}>Destination Location</label>
                      <LocationInput
                        value={to}
                        onChange={setTo}
                        placeholder="Enter destination city or village"
                        showCurrentLocation={false}
                      />
                    </div>
                  ) : (
                    <div style={styles.inputGroupWrapper}>
                      <label style={styles.fieldLabel}>Select Rental Package</label>
                      <select
                        style={styles.selectPackageDropdown}
                        value={localPackage}
                        onChange={(e) => setLocalPackage(e.target.value)}
                      >
                        <option value="4_40">4 Hours / 40 KM Package</option>
                        <option value="8_80">8 Hours / 80 KM Package</option>
                        <option value="12_120">12 Hours / 120 KM Package</option>
                         <option value="24_240">24 Hours / 240 KM Package</option>
                          <option value="48_480">48 Hours / 480 KM Package</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* SEARCH ACTION */}
                <button
                  type="submit"
                  style={styles.primaryButton}
                >
                  {tripType === "outstation" ? "🔍 Search Outstation Cabs" : "⚡ Check Local Rates"}
                </button>
              </form>

              {/* TRAVEL DATE & TIME SELECTION */}
              {searched && (
                <div style={styles.dateSection}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div>
                      <label htmlFor="travelDate" style={styles.dateLabel}>
                        📅 Select Travel Date
                      </label>
                      <input
                        id="travelDate"
                        type="date"
                        min={today}
                        value={travelDate}
                        onChange={(e) => setTravelDate(e.target.value)}
                        style={styles.dateInput}
                      />
                    </div>

                    <div>
                      <label htmlFor="tripTime" style={styles.dateLabel}>
                        ⏰ Pickup Time
                      </label>
                      <input
                        id="tripTime"
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
      </div>


      {/* =========================
          SEARCH RESULTS CONTAINER
      ========================= */}
      <main style={styles.dashboardMain}>

        {searched && (

          <section style={styles.resultsSection}>

            {/* ROUTE SUMMARY BAR */}
            <div style={styles.routeSummary}>
              <div style={styles.routePoints}>
                <span style={styles.routePointLabel}>
                  {tripType === "outstation" ? "Selected Route:" : "Rental Package:"}
                </span>
                <strong style={styles.routePoint}>{from}</strong>
                {tripType === "outstation" ? (
                  <>
                    <span style={styles.routeArrow}>→</span>
                    <strong style={styles.routePoint}>{to}</strong>
                  </>
                ) : (
                  <span style={{ color: "#2563eb", fontWeight: "700" }}>({localPackage.replace("_", " Hours / ")} KM)</span>
                )}
              </div>
              <span style={styles.distanceBadge}>
                {tripType === "outstation" ? `📍 Calculated Distance: ${distance} KM` : `📦 Package Base Limit: ${distance} KM`}
              </span>
            </div>


            {/* VEHICLES SECTION HEADER */}
            <div style={styles.resultsHeader}>
              <h2 style={styles.h2}>
                Choose your vehicle category
              </h2>
              <p style={styles.resultsSubtext}>Base rates configured for {tripType} travel.</p>
            </div>


            {loadingPricing ? (

              <div style={styles.messageBox}>
                <div style={styles.funnyLoaderContainer}>
                  <div style={styles.carMovingIcon}>🚗💨</div>
                  <div style={styles.loadingSpinner}></div>
                </div>
                <p style={styles.messageText}>Scanning highway fleets and calculating best rates...</p>
              </div>

            ) : pricing.length === 0 ? (

              <div style={styles.messageBox}>
                <p style={styles.messageText}>
                  No vehicles available for this service type.
                </p>
                <p style={styles.subMessageText}>
                  Please check your pricing configuration in the Admin Panel.
                </p>
              </div>

            ) : (

              <div style={styles.vehicleGrid}>

                {pricing.map((vehicle) => {

                  const rate = Number(vehicle.rate_per_km);
                  const fare = distance * rate;

                  return (

                    <div
                      style={styles.vehicleCard}
                      key={vehicle.id}
                    >

                      <div style={styles.cardHeaderTop}>
                        <div style={styles.vehicleIcon}>
                          🚕
                        </div>
                        <span style={styles.categoryBadge}>⭐ Verified Fleet</span>
                      </div>

                      <h3 style={styles.vehicleTitle}>
                        {vehicle.vehicle_type}
                      </h3>

                      <p style={styles.vehicleRate}>
                        ₹{rate.toFixed(2)} per KM rate
                      </p>

                      <div style={styles.fareContainer}>
                        <span style={styles.fareLabel}>Estimated Total Fare</span>
                        <div style={styles.fare}>
                          ₹
                          {fare.toLocaleString(
                            "en-IN",
                            {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2
                            }
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        style={{
                          ...styles.primaryButton,
                          ...styles.fullButton,
                          ...(bookingVehicle === vehicle.id ? styles.buttonDisabled : {})
                        }}
                        disabled={
                          bookingVehicle ===
                          vehicle.id
                        }
                        onClick={() =>
                          handleBookClick(vehicle)
                        }
                      >
                        {bookingVehicle ===
                        vehicle.id
                          ? "Securing Booking..."
                          : "🚀 Book Now"}
                      </button>

                    </div>

                  );

                })}

              </div>

            )}

          </section>

        )}

      </main>


      {/* =========================
          BOOKING GUIDELINES MODAL
      ========================= */}
      {showInstructionsModal && (
        <div style={styles.modalOverlay} onClick={() => setShowInstructionsModal(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>📋 GoTrip Booking Guidelines</h2>
              <button
                type="button"
                style={styles.closeModalButton}
                onClick={() => setShowInstructionsModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.ruleSection}>
                <h4 style={{ ...styles.ruleTitle, color: "#15803d" }}>✅ DO's</h4>
                <ul style={styles.ruleList}>
                  <li>Double-check your pickup and drop-off locations for accuracy.</li>
                  <li>Ensure your contact mobile number is active for driver coordination.</li>
                  <li>Select your proper vehicle category based on passenger count and luggage capacity.</li>
                  <li>Keep your booking reference ID ready when meeting your assigned driver.</li>
                </ul>
              </div>

              <div style={styles.ruleSection}>
                <h4 style={{ ...styles.ruleTitle, color: "#b91c1c" }}>❌ DON'TS</h4>
                <ul style={styles.ruleList}>
                  <li>Do not enter identical pickup and destination locations.</li>
                  <li>Do not share your account password or payment verification tokens with anyone.</li>
                  <li>Do not board unverified vehicles; always match your booking reference number.</li>
                  <li>Avoid last-minute route modifications without updating through customer support.</li>
                </ul>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                type="button"
                style={styles.modalActionBtn}
                onClick={() => setShowInstructionsModal(false)}
              >
                Got It, Let's Travel
              </button>
            </div>

          </div>
        </div>
      )}


      {/* =========================
          TERMS & UPI PAYMENT GATEWAY MODAL (WITH QR CODE)
      ========================= */}
      {showTermsModal && (
        <div style={styles.modalOverlay} onClick={() => setShowTermsModal(false)}>
          <div style={{ ...styles.modalCard, maxWidth: "540px" }} onClick={(e) => e.stopPropagation()}>
            
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.modalEyebrow}>SECURE CHECKOUT & ADVANCE PAYMENT</span>
                <h2 style={styles.modalTitle}>💳 Scan QR or Pay via UPI</h2>
              </div>
              <button
                type="button"
                style={styles.closeModalButton}
                onClick={() => setShowTermsModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", padding: "16px", borderRadius: "14px", textAlign: "center" }}>
                <span style={{ fontSize: "12px", fontWeight: "800", color: "#1d4ed8", textTransform: "uppercase" }}>
                  {tripType === "outstation" ? "Outstation Advance" : "Local Rental Advance"}
                </span>
                <div style={{ fontSize: "28px", fontWeight: "800", color: "#1e40af", margin: "4px 0" }}>₹{advanceAmount}</div>
                <div style={{ marginTop: "4px", fontSize: "12px", fontWeight: "700", color: "#334155" }}>
                  UPI ID: <span style={{ color: "#2563eb" }}>8465826241-3@ybl</span>
                </div>

                {/* DYNAMIC QR CODE DISPLAY */}
                <div style={{ backgroundColor: "#ffffff", padding: "10px", borderRadius: "12px", display: "inline-block", marginTop: "10px", boxShadow: "0 4px 10px rgba(0,0,0,0.08)" }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiQrString)}`}
                    alt="Company UPI QR Code"
                    style={{ width: "140px", height: "140px", display: "block" }}
                  />
                </div>
                <p style={{ fontSize: "11px", color: "#64748b", margin: "6px 0 0 0" }}>Scan using GPay, PhonePe, Paytm, or BHIM</p>
              </div>

              {/* UTR / Transaction Reference Input */}
              <div style={styles.inputGroupWrapper}>
                <label style={styles.fieldLabel}>Enter UPI Transaction Reference ID / UTR Number</label>
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
                <h4 style={{ ...styles.ruleTitle, color: "#1e3a8a" }}>📜 Refund Policy</h4>
                <ul style={styles.ruleList}>
                  <li>The advance amount (₹{advanceAmount}) is <strong>non-refundable</strong> if cancelled by customer.</li>
                  <li>If GoTrip cancels your trip, you will receive a <strong>100% full refund</strong> instantly.</li>
                </ul>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button type="button" style={{ ...styles.modalActionBtn, backgroundColor: "#64748b", marginRight: "10px" }} onClick={() => setShowTermsModal(false)}>Cancel</button>
              <button type="button" style={{ ...styles.modalActionBtn, backgroundColor: "#16a34a" }} onClick={confirmBooking}>
                Verify Payment & Confirm Booking 🚀
              </button>
            </div>
          </div>
        </div>
      )}


      {/* =========================================
          MODAL: ALERTS POP-UP DIALOG
      ========================================= */}
      {showNotificationsModal && (
        <div style={styles.modalOverlay} onClick={() => setShowNotificationsModal(false)}>
          <div style={{ ...styles.modalCard, maxWidth: "460px" }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "22px" }}>🔔</span>
                <div>
                  <h3 style={styles.modalTitle}>Status Alerts</h3>
                  <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>System notifications & admin replies</span>
                </div>
              </div>
              <button type="button" style={styles.closeModalButton} onClick={() => setShowNotificationsModal(false)}>✕</button>
            </div>

            <div style={{ padding: "20px 24px", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <div style={styles.alertFilterButtons}>
                <button
                  type="button"
                  style={{ ...styles.alertTabBtn, ...(notificationFilter === "all" ? styles.alertTabActive : {}) }}
                  onClick={() => setNotificationFilter("all")}
                >
                  All
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
                  Read
                </button>
              </div>
            </div>

            <div style={{ maxHeight: "320px", overflowY: "auto", padding: "16px 24px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {filteredNotifications.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 0", color: "#64748b" }}>
                  <p style={{ fontSize: "14px", fontWeight: "600", margin: 0 }}>No alerts found</p>
                </div>
              ) : (
                filteredNotifications.map((n) => (
                  <div 
                    key={n.id} 
                    style={{
                      ...styles.notificationItem,
                      backgroundColor: n.is_read ? "#ffffff" : "#f0fdf4",
                      border: "1px solid #e2e8f0",
                      padding: "14px",
                      borderRadius: "12px"
                    }}
                  >
                    <div style={{ flex: 1, paddingRight: "10px" }}>
                      <strong style={{ display: "block", fontSize: "13px", color: "#0f172a", marginBottom: "4px" }}>
                        {n.title} {!n.is_read && <span style={styles.dotIndicator}>•</span>}
                      </strong>
                      <p style={{ ...styles.alertSnippet, WebkitLineClamp: 3 }}>{n.message}</p>
                    </div>
                    <button
                      type="button"
                      style={styles.alertViewBtn}
                      onClick={() => handleViewAlert(n)}
                    >
                      View
                    </button>
                  </div>
                ))
              )}
            </div>

            <div style={styles.modalFooter}>
              <button
                type="button"
                style={styles.modalActionBtn}
                onClick={() => setShowNotificationsModal(false)}
              >
                Close Alerts
              </button>
            </div>
          </div>
        </div>
      )}


      {/* =========================================
          MODAL: ALERT INSPECTION POP-UP (VIEW DETAILS)
      ========================================= */}
      {selectedAlert && (
        <div style={styles.modalOverlay} onClick={() => setSelectedAlert(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.modalEyebrow}>SYSTEM STATUS ALERT</span>
                <h3 style={styles.modalTitle}>{selectedAlert.title}</h3>
              </div>
              <button type="button" style={styles.closeModalButton} onClick={() => setSelectedAlert(null)}>✕</button>
            </div>
            <div style={styles.modalBody}>
              <div style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <p style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", margin: "0 0 6px 0" }}>ALERT MESSAGE</p>
                <p style={{ fontSize: "14px", color: "#1e293b", margin: "0", lineHeight: "1.5" }}>{selectedAlert.message}</p>
              </div>
              <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0" }}>
                Received on: {new Date(selectedAlert.created_at).toLocaleString("en-IN")}
              </p>
            </div>
            <div style={styles.modalFooter}>
              <button type="button" style={styles.modalActionBtn} onClick={() => setSelectedAlert(null)}>
                Close Alert
              </button>
            </div>
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
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Persistent chat until issue is resolved or type 'agent'</span>
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
          MODAL: PERSISTENT LIVE SUPPORT THREAD
      ========================================= */}
      {chatOpen && (
        <div style={styles.modalOverlay} onClick={() => { setChatOpen(false); setShowContactModal(false); }}>
          <div style={{ ...styles.modalCard, maxWidth: "480px", height: "560px", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "20px" }}>💬</span>
                <div>
                  <h3 style={{ ...styles.modalTitle, fontSize: "16px" }}>GoTrip Active Support Thread</h3>
                  <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "700" }}>● Active until resolved</span>
                </div>
              </div>
              <button type="button" style={styles.closeModalButton} onClick={() => { setChatOpen(false); setShowContactModal(false); }}>✕</button>
            </div>

            {/* Chat Messages Stream */}
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
                    border: msg.sender === "bot" || msg.sender === "admin" ? "1px solid #e2e8f0" : "none"
                  }}
                >
                  <strong style={{ display: "block", fontSize: "10px", marginBottom: "2px", opacity: 0.8, textTransform: "uppercase" }}>
                    {msg.sender === "user" ? "You" : msg.sender === "admin" ? "Support Admin" : "GoTrip Bot"}
                  </strong>
                  {msg.text}
                </div>
              ))}
              {chatLoading && (
                <div style={{ alignSelf: "flex-start", backgroundColor: "#ffffff", padding: "8px 12px", borderRadius: "12px", fontSize: "12px", color: "#64748b", border: "1px solid #e2e8f0" }}>
                  Support agent is typing...
                </div>
              )}
            </div>

            {/* Persistent Chat Input Box */}
            <form onSubmit={handleSendMessage} style={{ padding: "12px 16px", backgroundColor: "#ffffff", borderTop: "1px solid #e2e8f0", display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="Type message or type 'agent' to escalate..."
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


      {/* =========================================
          STYLISH SUCCESS CONFIRMATION MODAL
      ========================================= */}
      {successModalMessage && (
        <div style={styles.modalOverlay} onClick={() => {
          const cb = successActionCallback;
          setSuccessModalMessage("");
          setSuccessActionCallback(null);
          if (cb) cb();
        }}>
          <div style={{ ...styles.modalCard, maxWidth: "400px", textAlign: "center", padding: "30px 20px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: "50px", marginBottom: "10px" }}>🎉</div>
            <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", marginBottom: "10px" }}>Success!</h3>
            <p style={{ fontSize: "14px", color: "#475569", marginBottom: "24px", lineHeight: "1.5" }}>
              {successModalMessage}
            </p>
            <button
              type="button"
              style={{ ...styles.modalActionBtn, width: "100%", padding: "12px" }}
              onClick={() => {
                const cb = successActionCallback;
                setSuccessModalMessage("");
                setSuccessActionCallback(null);
                if (cb) cb();
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}


      {/* =========================
          CUSTOMER SUPPORT MODAL
      ========================= */}
      {showSupportModal && (
        <div style={styles.modalOverlay} onClick={() => setShowSupportModal(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.modalEyebrow}>HELP & ASSISTANCE</span>
                <h2 style={styles.modalTitle}>Customer Support</h2>
              </div>
              <button type="button" style={styles.closeModalButton} onClick={() => setShowSupportModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSupportSubmit} style={styles.modalBody}>
              <div style={styles.inputGroupWrapper}>
                <label style={styles.fieldLabel}>Support Subject Category</label>
                <select
                  value={supportSubject}
                  onChange={(e) => setSupportSubject(e.target.value)}
                  style={styles.selectPackageDropdown}
                >
                  <option value="Booking Modification">Booking Modification / Date Change</option>
                  <option value="Cancellation & Refund">Cancellation & Refund Query</option>
                  <option value="Driver Coordination">Driver & Cab Coordination</option>
                  <option value="Payment & Billing">Payment & Billing Inquiry</option>
                  <option value="General Query">General Query</option>
                </select>
              </div>
              <div style={styles.inputGroupWrapper}>
                <label style={styles.fieldLabel}>Describe your issue</label>
                <textarea
                  required
                  rows="4"
                  placeholder="Provide details about your trip or query..."
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  style={{ ...styles.dateInput, height: "110px", padding: "12px", resize: "vertical" }}
                />
              </div>
              <div style={styles.modalFooterButtons}>
                <button type="button" style={styles.modalCancelAction} onClick={() => setShowSupportModal(false)}>
                  Cancel
                </button>
                <button type="submit" style={styles.modalActionBtn}>Submit Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* =========================
          CUSTOMER FEEDBACK MODAL
      ========================= */}
      {showFeedbackModal && (
        <div style={styles.modalOverlay} onClick={() => setShowFeedbackModal(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.modalEyebrow}>USER EXPERIENCE</span>
                <h2 style={styles.modalTitle}>Rate Your Experience</h2>
              </div>
              <button type="button" style={styles.closeModalButton} onClick={() => setShowFeedbackModal(false)}>✕</button>
            </div>
            <form onSubmit={handleFeedbackSubmit} style={styles.modalBody}>
              <div style={styles.inputGroupWrapper}>
                <label style={styles.fieldLabel}>Rating (1 to 5 Stars)</label>
                <select
                  value={feedbackRating}
                  onChange={(e) => setFeedbackRating(Number(e.target.value))}
                  style={styles.selectPackageDropdown}
                >
                  <option value="5">⭐⭐⭐⭐⭐ (5 - Excellent)</option>
                  <option value="4">⭐⭐⭐⭐ (4 - Very Good)</option>
                  <option value="3">⭐⭐⭐ (3 - Average)</option>
                  <option value="2">⭐⭐ (2 - Poor)</option>
                  <option value="1">⭐ (1 - Terrible)</option>
                </select>
              </div>
              <div style={styles.inputGroupWrapper}>
                <label style={styles.fieldLabel}>Comments or Suggestions</label>
                <textarea
                  rows="3"
                  placeholder="Tell us what you liked or how we can improve..."
                  value={feedbackComments}
                  onChange={(e) => setFeedbackComments(e.target.value)}
                  style={{ ...styles.dateInput, height: "90px", padding: "12px", resize: "vertical" }}
                />
              </div>
              <div style={styles.modalFooterButtons}>
                <button type="button" style={styles.modalCancelAction} onClick={() => setShowFeedbackModal(false)}>
                  Cancel
                </button>
                <button type="submit" style={styles.modalActionBtn}>Send Feedback</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>

  );

}


// Professional layout styles with a clean, uncrowded header layout
const styles = {
  dashboardPage: {
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    color: "#1e293b",
  },
  dashboardNav: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid #e2e8f0",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.03)",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  navContainer: {
    maxWidth: "1400px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 28px",
    gap: "16px",
  },
  navBrandArea: {
    flexShrink: 0,
  },
  navLogo: {
    fontSize: "26px",
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
    gap: "8px",
    flexWrap: "nowrap",
    overflowX: "auto",
    paddingBottom: "2px",
  },
  userBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#f1f5f9",
    padding: "6px 12px",
    borderRadius: "20px",
    border: "1px solid #e2e8f0",
    marginRight: "4px",
    flexShrink: 0,
  },
  userAvatar: {
    fontSize: "13px",
  },
  welcomeText: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#334155",
    whiteSpace: "nowrap",
  },
  navButton: {
    backgroundColor: "#ffffff",
    color: "#475569",
    border: "1px solid #cbd5e1",
    padding: "7px 12px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  adminButton: {
    backgroundColor: "#fef3c7",
    color: "#b45309",
    border: "1px solid #fde68a",
    padding: "7px 12px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "700",
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  logoutButton: {
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    border: "1px solid #fee2e2",
    padding: "7px 12px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "700",
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  notificationBadge: {
    marginLeft: "5px",
    backgroundColor: "#dc2626",
    color: "#fff",
    padding: "2px 5px",
    borderRadius: "50%",
    fontSize: "9px",
    fontWeight: "bold",
  },
  alertHeaderRow: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginBottom: "12px",
    borderBottom: "1px solid #f1f5f9",
    paddingBottom: "10px",
  },
  notificationTitle: {
    margin: "0",
    fontSize: "14px",
    fontWeight: "800",
    color: "#0f172a",
  },
  alertFilterButtons: {
    display: "flex",
    gap: "6px",
  },
  alertTabBtn: {
    flex: 1,
    background: "#f1f5f9",
    border: "1px solid #cbd5e1",
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "700",
    color: "#64748b",
    cursor: "pointer",
  },
  alertTabActive: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    borderColor: "#2563eb",
  },
  noNotificationText: {
    fontSize: "12px",
    color: "#64748b",
    margin: 0,
    textAlign: "center",
    padding: "16px 0",
  },
  notificationItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 8px",
    borderBottom: "1px solid #f8fafc",
    borderRadius: "8px",
  },
  dotIndicator: {
    color: "#16a34a",
    fontSize: "16px",
    marginLeft: "4px",
  },
  alertSnippet: {
    fontSize: "12px",
    color: "#475569",
    margin: "2px 0 0 0",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  alertViewBtn: {
    backgroundColor: "#eff6ff",
    color: "#2563eb",
    border: "1px solid #bfdbfe",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "700",
    cursor: "pointer",
    flexShrink: 0,
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
  heroSection: {
    backgroundImage: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #2563eb 100%)",
    padding: "60px 20px 90px 20px",
    color: "#ffffff",
    boxShadow: "inset 0 -15px 30px rgba(0,0,0,0.1)",
  },
  heroContentContainer: {
    maxWidth: "750px",
    margin: "0 auto",
  },
  heroHeadingWrapper: {
    textAlign: "center",
    marginBottom: "36px",
  },
  eyebrow: {
    fontSize: "12px",
    fontWeight: "800",
    color: "#60a5fa",
    letterSpacing: "2px",
    marginBottom: "10px",
    display: "block",
    textTransform: "uppercase",
  },
  h1: {
    fontSize: "38px",
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: "12px",
    letterSpacing: "-1px",
  },
  heroSubtitle: {
    fontSize: "16px",
    color: "#cbd5e1",
    margin: "0",
  },
  singleCenterBoxContainer: {
    width: "100%",
  },
  bookingBox: {
    backgroundColor: "#ffffff",
    padding: "40px",
    borderRadius: "24px",
    boxShadow: "0 25px 50px rgba(0, 0, 0, 0.2)",
    color: "#1e293b",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },
  tripTabs: {
    display: "flex",
    gap: "10px",
    marginBottom: "28px",
    backgroundColor: "#f1f5f9",
    padding: "6px",
    borderRadius: "14px",
  },
  tripTabBtn: {
    flex: 1,
    background: "none",
    border: "none",
    padding: "12px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "700",
    color: "#64748b",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  tripTabActive: {
    backgroundColor: "#ffffff",
    color: "#2563eb",
    boxShadow: "0 4px 15px rgba(37, 99, 235, 0.1)",
  },
  routeForm: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  inputsGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  inputGroupWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    width: "100%",
  },
  fieldLabel: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#334155",
  },
  selectPackageDropdown: {
    width: "100%",
    height: "50px",
    padding: "0 16px",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    fontSize: "14px",
    color: "#1e293b",
    outline: "none",
    backgroundColor: "#f8fafc",
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "16px 24px",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "800",
    cursor: "pointer",
    boxShadow: "0 6px 20px rgba(37, 99, 235, 0.4)",
    width: "100%",
    marginTop: "8px",
  },
  fullButton: {
    marginTop: "20px",
    width: "100%",
    padding: "14px",
    fontSize: "15px",
  },
  buttonDisabled: {
    opacity: 0.7,
    cursor: "not-allowed",
  },
  dateSection: {
    marginTop: "28px",
    paddingTop: "28px",
    borderTop: "1px solid #f1f5f9",
  },
  dateLabel: {
    display: "block",
    fontWeight: "700",
    fontSize: "13px",
    color: "#334155",
    marginBottom: "8px",
  },
  dateInput: {
    width: "100%",
    height: "50px",
    padding: "0 16px",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    fontSize: "15px",
    outline: "none",
    backgroundColor: "#f8fafc",
    boxSizing: "border-box",
    fontWeight: "600",
  },
  dashboardMain: {
    maxWidth: "1150px",
    margin: "-40px auto 60px auto",
    padding: "0 20px",
    position: "relative",
    zIndex: 2,
  },
  resultsSection: {
    marginTop: "20px",
  },
  routeSummary: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
    backgroundColor: "#ffffff",
    padding: "24px 28px",
    borderRadius: "18px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.04)",
    marginBottom: "36px",
  },
  routePoints: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  routePointLabel: {
    fontSize: "12px",
    fontWeight: "800",
    color: "#64748b",
    textTransform: "uppercase",
  },
  routePoint: {
    fontSize: "16px",
    fontWeight: "800",
    color: "#0f172a",
  },
  routeArrow: {
    color: "#2563eb",
    fontWeight: "bold",
    fontSize: "18px",
  },
  distanceBadge: {
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    padding: "8px 16px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "700",
  },
  resultsHeader: {
    marginBottom: "24px",
  },
  h2: {
    fontSize: "24px",
    fontWeight: "800",
    color: "#0f172a",
    margin: "0 0 4px 0",
    letterSpacing: "-0.5px",
  },
  resultsSubtext: {
    fontSize: "14px",
    color: "#64748b",
    margin: "0",
  },
  vehicleGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "28px",
  },
  vehicleCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "20px",
    padding: "32px",
    boxShadow: "0 15px 35px rgba(0, 0, 0, 0.05)",
    display: "flex",
    flexDirection: "column",
  },
  cardHeaderTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "20px",
  },
  vehicleIcon: {
    fontSize: "30px",
    backgroundColor: "#eff6ff",
    width: "60px",
    height: "60px",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryBadge: {
    fontSize: "11px",
    fontWeight: "800",
    backgroundColor: "#f0fdf4",
    color: "#15803d",
    border: "1px solid #bbf7d0",
    padding: "6px 12px",
    borderRadius: "14px",
    textTransform: "uppercase",
  },
  vehicleTitle: {
    fontSize: "20px",
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: "6px",
  },
  vehicleRate: {
    fontSize: "13px",
    color: "#64748b",
    marginBottom: "24px",
    fontWeight: "600",
  },
  fareContainer: {
    marginTop: "auto",
    paddingTop: "20px",
    borderTop: "1px solid #f1f5f9",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fareLabel: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#64748b",
  },
  fare: {
    fontSize: "24px",
    fontWeight: "800",
    color: "#2563eb",
  },
  messageBox: {
    backgroundColor: "#ffffff",
    padding: "60px 20px",
    borderRadius: "20px",
    border: "1px solid #e2e8f0",
    textAlign: "center",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.03)",
  },
  funnyLoaderContainer: {
    position: "relative",
    height: "50px",
    marginBottom: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  carMovingIcon: {
    fontSize: "24px",
    position: "absolute",
    animation: "bounceCar 1s infinite alternate ease-in-out",
  },
  messageText: {
    fontSize: "16px",
    fontWeight: "800",
    color: "#0f172a",
    margin: "0",
  },
  subMessageText: {
    fontSize: "13px",
    color: "#64748b",
    marginTop: "6px",
  },
  loadingSpinner: {
    width: "50px",
    height: "50px",
    border: "4px solid #e2e8f0",
    borderTopColor: "#2563eb",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    backdropFilter: "blur(6px)",
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
    borderRadius: "24px",
    boxShadow: "0 25px 60px rgba(0, 0, 0, 0.3)",
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "24px 28px",
    borderBottom: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc",
  },
  modalEyebrow: {
    fontSize: "11px",
    fontWeight: "800",
    color: "#2563eb",
    letterSpacing: "1px",
    display: "block",
    marginBottom: "4px",
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
    padding: "6px 10px",
    borderRadius: "8px",
  },
  modalBody: {
    padding: "28px",
    maxHeight: "65vh",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  ruleSection: {
    backgroundColor: "#f8fafc",
    padding: "18px",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
  },
  ruleTitle: {
    fontSize: "14px",
    fontWeight: "800",
    margin: "0 0 10px 0",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  ruleList: {
    margin: "0",
    paddingLeft: "18px",
    fontSize: "13px",
    color: "#334155",
    lineHeight: "1.6",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  modalFooter: {
    padding: "20px 28px",
    borderTop: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc",
    display: "flex",
    justifyContent: "flex-end",
  },
  modalActionBtn: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "12px 24px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
  },
  modalCancelAction: {
    backgroundColor: "#e2e8f0",
    color: "#334155",
    border: "none",
    padding: "12px 20px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },
};