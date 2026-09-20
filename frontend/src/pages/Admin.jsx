import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function Admin() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);
  const [ticketsList, setTicketsList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [pricingLoading, setPricingLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [resolutionText, setResolutionText] = useState("");

  const [editingPrice, setEditingPrice] = useState(null);
  const [newPrice, setNewPrice] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Stylish Success Modal State
  const [successModalMessage, setSuccessModalMessage] = useState("");
  const [successActionCallback, setSuccessActionCallback] = useState(null);

  // Pagination State for Bookings Table
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Expanded Addresses Tracking State
  const [expandedRoutes, setExpandedRoutes] = useState({});

  // Modal Visibility States
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showTicketsModal, setShowTicketsModal] = useState(false);

  // Contact Us & Live Chat Bot States for Admin
  const [showContactModal, setShowContactModal] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: "bot", text: "Hello Admin! I am your GoTrip Admin Assistant. How can I assist you with platform management today?" }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Toggle address expansion for a specific booking row
  const toggleRouteExpand = (id) => {
    setExpandedRoutes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // -----------------------------------
  // LOAD BOOKINGS
  // -----------------------------------
  const loadBookings = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await API.get("/admin/bookings");
      setBookings(response.data || []);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
        "Unable to load bookings"
      );
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------
  // LOAD PRICING
  // -----------------------------------
  const loadPricing = async () => {
    try {
      setPricingLoading(true);

      const response = await API.get("/pricing");
      setPricing(response.data || []);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
        "Unable to load pricing"
      );
    } finally {
      setPricingLoading(false);
    }
  };

  // -----------------------------------
  // LOAD SUPPORT DATA & FEEDBACK
  // -----------------------------------
  const loadSupportData = async () => {
    try {
      const response = await API.get("/admin/support-data");
      setFeedbackList(response.data.feedback || []);
      setTicketsList(response.data.tickets || []);
    } catch (err) {
      console.error("Failed to load support data", err);
    }
  };

  useEffect(() => {
    loadBookings();
    loadPricing();
    loadSupportData();
  }, []);

  // -----------------------------------
  // STATISTICS
  // -----------------------------------
  const totalBookings = bookings.length;

  const confirmedBookings = bookings.filter(
    (booking) =>
      String(booking.status).toLowerCase() === "confirmed"
  ).length;

  const pendingBookings = bookings.filter(
    (booking) =>
      String(booking.status).toLowerCase() === "pending"
  ).length;

  const cancelledBookings = bookings.filter(
    (booking) =>
      String(booking.status).toLowerCase() === "cancelled"
  ).length;

  // -----------------------------------
  // FILTER BOOKINGS & PAGINATION
  // -----------------------------------
  const filteredBookings = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    return bookings.filter((booking) => {
      const customer = booking.customer_name || booking.name || "";
      const mobile = booking.mobile || "";
      const bookingReference = booking.booking_reference || "";
      const from = booking.from_location || "";
      const to = booking.to_location || "";

      const matchesSearch =
        !searchText ||
        String(bookingReference).toLowerCase().includes(searchText) ||
        String(customer).toLowerCase().includes(searchText) ||
        String(mobile).toLowerCase().includes(searchText) ||
        String(from).toLowerCase().includes(searchText) ||
        String(to).toLowerCase().includes(searchText);

      const bookingStatus = String(booking.status || "pending").toLowerCase();
      const matchesStatus = statusFilter === "all" || bookingStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [bookings, search, statusFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage) || 1;
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBookings.slice(start, start + itemsPerPage);
  }, [filteredBookings, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  // -----------------------------------
  // UPDATE BOOKING STATUS
  // -----------------------------------
  const updateBookingStatus = async (bookingId, status) => {
    try {
      setError("");
      setMessage("");

      await API.patch(
        `/admin/bookings/${bookingId}/status`,
        {
          status
        }
      );

      setSuccessModalMessage("Booking status updated successfully.");
      setSuccessActionCallback(() => () => setSuccessModalMessage(""));
      await loadBookings();
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
        "Unable to update booking status"
      );
    }
  };

  // -----------------------------------
  // UPDATE PRICE
  // -----------------------------------
  const updatePrice = async (pricingId) => {
    const price = Number(newPrice);

    if (!price || price <= 0) {
      setError("Please enter a valid price.");
      return;
    }

    try {
      setError("");
      setMessage("");

      await API.patch(
        `/admin/pricing/${pricingId}`,
        {
          ratePerKm: price
        }
      );

      setSuccessModalMessage("Pricing updated successfully.");
      setSuccessActionCallback(() => () => setSuccessModalMessage(""));
      setEditingPrice(null);
      setNewPrice("");

      await loadPricing();
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
        "Unable to update pricing"
      );
    }
  };

  // -----------------------------------
  // SUBMIT TICKET RESOLUTION RESPONSE
  // -----------------------------------
  const handleTicketResolutionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;

    try {
      setError("");
      setMessage("");

      await API.patch(`/admin/tickets/${selectedTicket.id}/resolve`, {
        resolution: resolutionText,
        status: "resolved"
      });

      setSuccessModalMessage(`Support ticket #TK-${selectedTicket.id} resolved successfully and notification sent.`);
      setSuccessActionCallback(() => () => setSuccessModalMessage(""));
      setSelectedTicket(null);
      setResolutionText("");
      await loadSupportData();
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
        "Unable to submit ticket resolution"
      );
    }
  };

  // -----------------------------------
  // LIVE CHAT BOT HANDLER FOR ADMIN
  // -----------------------------------
  async function handleSendMessage(e) {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMsg = inputMessage.trim();
    setChatMessages(prev => [...prev, { sender: "user", text: userMsg }]);
    setInputMessage("");
    setChatLoading(true);

    try {
      setTimeout(() => {
        let botReply = "As an admin, you can manage bookings, adjust pricing tiers, and resolve customer support tickets using the top navigation bar.";
        const lower = userMsg.toLowerCase();

        if (lower.includes("booking") || lower.includes("status")) {
          botReply = "You can update any reservation's status directly from the bookings table or by clicking the Booking Reference ID.";
        } else if (lower.includes("ticket") || lower.includes("support")) {
          botReply = "Click on 'Support Tickets' in the header to view open customer tickets and write resolution responses.";
        } else if (lower.includes("price") || lower.includes("rate")) {
          botReply = "Use 'Pricing Management' to update per-kilometer rates across outstation and local vehicle fleets.";
        }

        setChatMessages(prev => [...prev, { sender: "bot", text: botReply }]);
        setChatLoading(false);
      }, 700);
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: "bot", text: "Sorry, I am having trouble connecting right now." }]);
      setChatLoading(false);
    }
  }

  // -----------------------------------
  // FORMAT DATE & TIME
  // -----------------------------------
  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    const value = new Date(dateStr);
    if (Number.isNaN(value.getTime())) {
      return dateStr;
    }
    return value.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  // -----------------------------------
  // FORMAT MONEY
  // -----------------------------------
  const formatMoney = (amount) => {
    return Number(amount || 0).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2
    });
  };

  // -----------------------------------
  // STATUS CLASS
  // -----------------------------------
  const statusClass = (status) => {
    return String(status || "pending")
      .toLowerCase()
      .replace(/\s+/g, "-");
  };

  return (
    <div style={styles.adminPage}>

      {/* =========================
          NAVIGATION HEADER
      ========================= */}
      <header style={styles.adminNav}>
        <div style={styles.navContainer}>
          <strong 
            style={styles.navLogo}
            onClick={() => navigate("/dashboard")}
          >
            Go<span style={styles.logoSpan}>Trip</span>
            <span style={styles.adminBadgeTag}>Admin</span>
          </strong>

          <div style={styles.navRight}>
            <button
              type="button"
              style={styles.navButtonPrimary}
              onClick={() => setShowPricingModal(true)}
            >
              ⚙️ Pricing Management
            </button>

            <button
              type="button"
              style={styles.navButton}
              onClick={() => setShowFeedbackModal(true)}
            >
              ⭐ Feedback Reviews ({feedbackList.length})
            </button>

            <button
              type="button"
              style={styles.navButton}
              onClick={() => setShowTicketsModal(true)}
            >
              🎧 Support Tickets ({ticketsList.filter(t => t.status === 'open' || t.status === 'in_progress').length})
            </button>

            {/* CONTACT US BUTTON */}
            <button
              type="button"
              style={styles.navButton}
              onClick={() => setShowContactModal(true)}
            >
              📞 Contact Us
            </button>

            <button
              type="button"
              style={styles.navButton}
              onClick={() => navigate("/dashboard")}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* =========================
          MAIN CONTAINER
      ========================= */}
      <main style={styles.adminContainer}>

        <div style={styles.titleRow}>
          <div>
            <span style={styles.eyebrow}>ADMINISTRATION PANEL</span>
            <h1 style={styles.h1}>Booking & Fleet Management</h1>
            <p style={styles.subtitle}>
              Monitor customer reservations, manage trip lifecycles, and check system activities.
            </p>
          </div>

          <button
            type="button"
            style={styles.refreshButton}
            onClick={() => {
              loadBookings();
              loadPricing();
              loadSupportData();
            }}
          >
            ↻ Refresh Data
          </button>
        </div>

        {/* ALERTS */}
        {message && <div style={styles.successMessage}>{message}</div>}
        {error && <div style={styles.errorMessage}>{error}</div>}

        {/* =========================
            STATISTICS GRID
        ========================= */}
        <section style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIconBox}>📋</div>
            <div>
              <span style={styles.statLabel}>Total Bookings</span>
              <strong style={styles.statValue}>{totalBookings}</strong>
            </div>
          </div>

          <div style={{ ...styles.statCard, borderLeft: "4px solid #16a34a" }}>
            <div style={{ ...styles.statIconBox, backgroundColor: "#dcfce7", color: "#16a34a" }}>✓</div>
            <div>
              <span style={styles.statLabel}>Confirmed</span>
              <strong style={styles.statValue}>{confirmedBookings}</strong>
            </div>
          </div>

          <div style={{ ...styles.statCard, borderLeft: "4px solid #ca8a04" }}>
            <div style={{ ...styles.statIconBox, backgroundColor: "#fef9c3", color: "#ca8a04" }}>⏳</div>
            <div>
              <span style={styles.statLabel}>Pending</span>
              <strong style={styles.statValue}>{pendingBookings}</strong>
            </div>
          </div>

          <div style={{ ...styles.statCard, borderLeft: "4px solid #dc2626" }}>
            <div style={{ ...styles.statIconBox, backgroundColor: "#fee2e2", color: "#dc2626" }}>×</div>
            <div>
              <span style={styles.statLabel}>Cancelled</span>
              <strong style={styles.statValue}>{cancelledBookings}</strong>
            </div>
          </div>
        </section>

        {/* =========================
            BOOKINGS SECTION
        ========================= */}
        <section style={styles.adminSection}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.h2}>All Bookings</h2>
              <p style={styles.sectionSubtext}>
                Showing {paginatedBookings.length} of {filteredBookings.length} booking{filteredBookings.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* SEARCH & STATUS FILTER BUTTONS */}
          <div style={styles.bookingControls}>
            <div style={styles.searchBoxContainer}>
              <span style={styles.searchIcon}>⌕</span>
              <input
                type="text"
                placeholder="Search reference, customer name, mobile, or route..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={styles.searchInput}
              />
            </div>

            <div style={styles.filterButtonsGroup}>
              <button
                type="button"
                style={{
                  ...styles.filterBtn,
                  ...(statusFilter === "all" ? styles.filterBtnActive : {})
                }}
                onClick={() => setStatusFilter("all")}
              >
                All
              </button>
              <button
                type="button"
                style={{
                  ...styles.filterBtn,
                  ...(statusFilter === "pending" ? styles.filterBtnActivePending : {})
                }}
                onClick={() => setStatusFilter("pending")}
              >
                Pending
              </button>
              <button
                type="button"
                style={{
                  ...styles.filterBtn,
                  ...(statusFilter === "confirmed" ? styles.filterBtnActiveConfirmed : {})
                }}
                onClick={() => setStatusFilter("confirmed")}
              >
                Confirmed
              </button>
              <button
                type="button"
                style={{
                  ...styles.filterBtn,
                  ...(statusFilter === "cancelled" ? styles.filterBtnActiveCancelled : {})
                }}
                onClick={() => setStatusFilter("cancelled")}
              >
                Cancelled
              </button>
            </div>
          </div>

          {/* TABLE */}
          <div style={styles.tableWrapper}>
            {loading ? (
              <div style={styles.messageBox}>
                <div style={styles.loadingSpinner}></div>
                <p style={styles.messageText}>Loading system bookings...</p>
              </div>
            ) : paginatedBookings.length === 0 ? (
              <div style={styles.messageBox}>
                <p style={styles.messageText}>No bookings found matching your filter criteria.</p>
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Booking Reference</th>
                    <th style={styles.th}>Customer</th>
                    <th style={styles.th}>Route & Addresses</th>
                    <th style={styles.th}>Pickup Date & Time</th>
                    <th style={styles.th}>Vehicle</th>
                    <th style={styles.th}>Distance</th>
                    <th style={styles.th}>Fare</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBookings.map((booking) => {
                    const isExpanded = !!expandedRoutes[booking.id];
                    return (
                      <tr key={booking.id} style={styles.tableBodyRow}>
                        <td style={styles.td}>
                          <div 
                            style={styles.clickableRefText}
                            onClick={() => setSelectedBooking(booking)}
                            title="Click to view full details"
                          >
                            {booking.booking_reference}
                          </div>
                          <small style={styles.subId}>ID: #{booking.id}</small>
                        </td>

                        <td style={styles.td}>
                          <div style={styles.boldText}>
                            {booking.customer_name || booking.name || "Customer"}
                          </div>
                          {booking.mobile && (
                            <small style={styles.subId}>{booking.mobile}</small>
                          )}
                        </td>

                        <td style={styles.td}>
                          <div style={styles.routeCellContainer}>
                            <div style={isExpanded ? styles.routeExpandedText : styles.routeTruncatedText}>
                              <span style={styles.routeMarkerFrom}>From:</span> {booking.from_location}
                              <br />
                              <span style={styles.routeMarkerTo}>To:</span> {booking.to_location}
                            </div>
                            <button
                              type="button"
                              style={styles.seeMoreToggleBtn}
                              onClick={() => toggleRouteExpand(booking.id)}
                            >
                              {isExpanded ? "▲ See Less" : "▼ See More"}
                            </button>
                          </div>
                        </td>

                        <td style={styles.td}>
                          <strong style={{ fontSize: "13px", color: "#1e293b" }}>
                            {formatDateTime(booking.travel_date)}
                          </strong>
                        </td>

                        <td style={styles.td}>
                          <span style={styles.vehicleBadge}>🚕 {booking.vehicle_type}</span>
                        </td>

                        <td style={styles.td}>
                          {Number(booking.distance_km || 0).toFixed(0)} km
                        </td>

                        <td style={styles.td}>
                          <strong style={styles.fareText}>{formatMoney(booking.total_fare)}</strong>
                        </td>

                        <td style={styles.td}>
                          <select
                            className={`status-select ${statusClass(booking.status)}`}
                            value={booking.status || "pending"}
                            onChange={(e) => updateBookingStatus(booking.id, e.target.value)}
                            style={styles.inlineStatusSelect}
                          >
                            <option value="pending">⏳ Pending</option>
                            <option value="confirmed">✓ Confirmed</option>
                            <option value="cancelled">✕ Cancelled</option>
                          </select>
                        </td>

                        <td style={styles.td}>
                          <button
                            type="button"
                            style={styles.viewButton}
                            onClick={() => setSelectedBooking(booking)}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* PAGINATION CONTROLS */}
          {!loading && filteredBookings.length > itemsPerPage && (
            <div style={styles.paginationContainer}>
              <button
                type="button"
                style={{
                  ...styles.pageBtn,
                  ...(currentPage === 1 ? styles.pageBtnDisabled : {})
                }}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              >
                Previous
              </button>
              
              <span style={styles.pageIndicator}>
                Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
              </span>

              <button
                type="button"
                style={{
                  ...styles.pageBtn,
                  ...(currentPage === totalPages ? styles.pageBtnDisabled : {})
                }}
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              >
                Next
              </button>
            </div>
          )}
        </section>

      </main>

      {/* =========================================
          MODAL 1: PRICING MANAGEMENT POP-UP
      ========================================= */}
      {showPricingModal && (
        <div style={styles.modalOverlay} onClick={() => setShowPricingModal(false)}>
          <div style={{ ...styles.modalCard, maxWidth: "750px" }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.modalEyebrow}>FLEET SETUP</span>
                <h3 style={styles.modalTitle}>Pricing Management</h3>
              </div>
              <button
                type="button"
                style={styles.closeModalBtn}
                onClick={() => setShowPricingModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ ...styles.modalBody, maxHeight: "70vh" }}>
              <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px 0" }}>
                Update outstation and local vehicle rates per kilometre across the fleet.
              </p>

              <div style={styles.pricingGrid}>
                {pricingLoading ? (
                  <div style={styles.messageBox}><div style={styles.loadingSpinner}></div></div>
                ) : pricing.length === 0 ? (
                  <div style={styles.messageBox}><p style={styles.messageText}>No pricing records found.</p></div>
                ) : (
                  pricing.map((item) => (
                    <div style={styles.pricingCard} key={item.id}>
                      <div style={styles.pricingHeaderTop}>
                        <div style={styles.pricingIcon}>🚕</div>
                        <span style={{
                          ...styles.fleetBadge,
                          backgroundColor: item.trip_type === 'local' ? '#e0f2fe' : '#dcfce7',
                          color: item.trip_type === 'local' ? '#0369a1' : '#166534'
                        }}>
                          {item.trip_type ? item.trip_type.toUpperCase() : 'OUTSTATION'}
                        </span>
                      </div>

                      <h3 style={styles.pricingTitle}>{item.vehicle_type}</h3>
                      <p style={styles.pricingSubtitle}>Active rate setup</p>

                      <div style={styles.pricingRateBox}>
                        {editingPrice === item.id ? (
                          <div style={styles.editPriceWrapper}>
                            <div style={styles.priceInputGroup}>
                              <span>₹</span>
                              <input
                                type="number"
                                min="1"
                                step="0.01"
                                value={newPrice}
                                onChange={(e) => setNewPrice(e.target.value)}
                                style={styles.priceInputField}
                                autoFocus
                              />
                              <span>/ KM</span>
                            </div>

                            <div style={styles.editActionButtons}>
                              <button
                                type="button"
                                style={styles.saveRateBtn}
                                onClick={() => updatePrice(item.id)}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                style={styles.cancelRateBtn}
                                onClick={() => {
                                  setEditingPrice(null);
                                  setNewPrice("");
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={styles.displayRateContainer}>
                            <strong style={styles.rateAmount}>
                              {formatMoney(item.rate_per_km)}
                            </strong>
                            <span style={styles.rateUnit}> / KM</span>
                          </div>
                        )}
                      </div>

                      {editingPrice !== item.id && (
                        <button
                          type="button"
                          style={styles.editRateButton}
                          onClick={() => {
                            setEditingPrice(item.id);
                            setNewPrice(item.rate_per_km);
                          }}
                        >
                          Edit Rate
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                type="button"
                style={styles.modalCloseAction}
                onClick={() => setShowPricingModal(false)}
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL 2: CUSTOMER FEEDBACK REVIEWS POP-UP
      ========================================= */}
      {showFeedbackModal && (
        <div style={styles.modalOverlay} onClick={() => setShowFeedbackModal(false)}>
          <div style={{ ...styles.modalCard, maxWidth: "700px" }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.modalEyebrow}>RATINGS & REVIEWS</span>
                <h3 style={styles.modalTitle}>Customer Feedback Reviews</h3>
              </div>
              <button
                type="button"
                style={styles.closeModalBtn}
                onClick={() => setShowFeedbackModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ ...styles.modalBody, maxHeight: "65vh" }}>
              {feedbackList.length === 0 ? (
                <div style={styles.messageBox}><p style={styles.messageText}>No customer feedback submitted yet.</p></div>
              ) : (
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableHeaderRow}>
                        <th style={styles.th}>Rating</th>
                        <th style={styles.th}>Comments</th>
                        <th style={styles.th}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feedbackList.map((item) => (
                        <tr key={item.id} style={styles.tableBodyRow}>
                          <td style={styles.td}>
                            <strong style={{ color: "#ca8a04" }}>{"⭐".repeat(item.rating)}</strong> ({item.rating}/5)
                          </td>
                          <td style={styles.td}>{item.comments || "No comments provided"}</td>
                          <td style={styles.td}>{formatDateTime(item.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button
                type="button"
                style={styles.modalCloseAction}
                onClick={() => setShowFeedbackModal(false)}
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL 3: SUPPORT TICKETS POP-UP
      ========================================= */}
      {showTicketsModal && (
        <div style={styles.modalOverlay} onClick={() => setShowTicketsModal(false)}>
          <div style={{ ...styles.modalCard, maxWidth: "850px" }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.modalEyebrow}>CUSTOMER ASSISTANCE</span>
                <h3 style={styles.modalTitle}>Support Tickets Resolution</h3>
              </div>
              <button
                type="button"
                style={styles.closeModalBtn}
                onClick={() => setShowTicketsModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ ...styles.modalBody, maxHeight: "65vh" }}>
              {ticketsList.length === 0 ? (
                <div style={styles.messageBox}><p style={styles.messageText}>No support tickets found.</p></div>
              ) : (
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableHeaderRow}>
                        <th style={styles.th}>Ticket ID</th>
                        <th style={styles.th}>Subject</th>
                        <th style={styles.th}>Message</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ticketsList.map((ticket) => (
                        <tr key={ticket.id} style={styles.tableBodyRow}>
                          <td style={styles.td}>
                            <div 
                              style={styles.clickableRefText}
                              onClick={() => {
                                setSelectedTicket(ticket);
                                setResolutionText(ticket.resolution || "");
                              }}
                              title="Click to write resolution response"
                            >
                              #TK-{ticket.id}
                            </div>
                          </td>
                          <td style={styles.td}><strong>{ticket.subject}</strong></td>
                          <td style={styles.td}>{ticket.message}</td>
                          <td style={styles.td}>
                            <span style={{
                              padding: "4px 10px",
                              borderRadius: "8px",
                              fontSize: "12px",
                              fontWeight: "700",
                              backgroundColor: ticket.status === "resolved" ? "#f0fdf4" : ticket.status === "closed" ? "#f1f5f9" : "#fef9c3",
                              color: ticket.status === "resolved" ? "#15803d" : ticket.status === "closed" ? "#64748b" : "#854d0e"
                            }}>
                              {ticket.status.toUpperCase()}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <button
                              type="button"
                              style={styles.viewButton}
                              onClick={() => {
                                setSelectedTicket(ticket);
                                setResolutionText(ticket.resolution || "");
                              }}
                            >
                              Resolve / Reply
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button
                type="button"
                style={styles.modalCloseAction}
                onClick={() => setShowTicketsModal(false)}
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL 4: SUPPORT TICKET RESOLUTION POP-UP
      ========================================= */}
      {selectedTicket && (
        <div style={styles.modalOverlay} onClick={() => setSelectedTicket(null)}>
          <div style={{ ...styles.modalCard, maxWidth: "540px" }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.modalEyebrow}>TICKET RESOLUTION</span>
                <h3 style={styles.modalTitle}>Support Ticket #TK-{selectedTicket.id}</h3>
              </div>
              <button
                type="button"
                style={styles.closeModalBtn}
                onClick={() => setSelectedTicket(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTicketResolutionSubmit} style={styles.modalBody}>
              <div style={styles.modalRouteSummary}>
                <div style={{ width: "100%" }}>
                  <small style={styles.modalSubLabel}>ISSUE SUBJECT</small>
                  <strong style={{ fontSize: "14px", color: "#0f172a" }}>{selectedTicket.subject}</strong>
                  <div style={{ marginTop: "8px" }}>
                    <small style={styles.modalSubLabel}>CUSTOMER MESSAGE</small>
                    <p style={{ fontSize: "13px", color: "#334155", margin: "2px 0 0 0", lineHeight: "1.4" }}>
                      {selectedTicket.message}
                    </p>
                  </div>
                </div>
              </div>

              <div style={styles.inputGroupWrapper}>
                <label style={styles.fieldLabel}>Write Resolution Description / Response</label>
                <textarea
                  required
                  rows="4"
                  placeholder="Type the resolution or response for the customer..."
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  style={{ ...styles.dateInput, height: "110px", padding: "10px" }}
                />
              </div>

              <div style={styles.modalFooterButtons}>
                <button
                  type="button"
                  style={styles.modalCancelAction}
                  onClick={() => setSelectedTicket(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.modalActionBtn}
                >
                  Submit Response & Resolve
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL 5: CONTACT US (LIVE CHAT & CALL) FOR ADMIN
      ========================================= */}
      {showContactModal && !chatOpen && (
        <div style={styles.modalOverlay} onClick={() => setShowContactModal(false)}>
          <div style={{ ...styles.modalCard, maxWidth: "420px" }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.modalEyebrow}>24/7 ASSISTANCE</span>
                <h3 style={styles.modalTitle}>Contact Support</h3>
              </div>
              <button type="button" style={styles.closeModalBtn} onClick={() => setShowContactModal(false)}>✕</button>
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
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Instant answers to admin & platform queries</span>
                </div>
              </button>

              <a
                href="tel:+919876543210"
                style={{ ...styles.contactOptionCard, textDecoration: "none" }}
              >
                <div style={{ fontSize: "28px" }}>📞</div>
                <div style={{ textAlign: "left", flex: 1 }}>
                  <strong style={{ display: "block", fontSize: "15px", color: "#0f172a" }}>Call Helpline</strong>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Speak directly with technical support (+91 98765 43210)</span>
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
          MODAL 6: LIVE CHAT BY BOT FOR ADMIN
      ========================================= */}
      {chatOpen && (
        <div style={styles.modalOverlay} onClick={() => { setChatOpen(false); setShowContactModal(false); }}>
          <div style={{ ...styles.modalCard, maxWidth: "460px", height: "520px", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "20px" }}>🤖</span>
                <div>
                  <h3 style={{ ...styles.modalTitle, fontSize: "16px" }}>GoTrip Admin Assistant</h3>
                  <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "700" }}>● Online</span>
                </div>
              </div>
              <button type="button" style={styles.closeModalBtn} onClick={() => { setChatOpen(false); setShowContactModal(false); }}>✕</button>
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
                placeholder="Ask about bookings, pricing, or tickets..."
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

      {/* =========================================
          BOOKING DETAILS INSPECTION MODAL
      ========================================= */}
      {selectedBooking && (
        <div style={styles.modalOverlay} onClick={() => setSelectedBooking(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.modalEyebrow}>BOOKING INSPECTION</span>
                <h3 style={styles.modalTitle}>{selectedBooking.booking_reference}</h3>
              </div>
              <button
                type="button"
                style={styles.closeModalBtn}
                onClick={() => setSelectedBooking(null)}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.modalRouteSummary}>
                <div style={{ width: "100%" }}>
                  <div style={{ marginBottom: "8px" }}>
                    <small style={styles.modalSubLabel}>PICKUP LOCATION</small>
                    <strong style={styles.modalRouteVal}>{selectedBooking.from_location}</strong>
                  </div>
                  <div>
                    <small style={styles.modalSubLabel}>DESTINATION LOCATION</small>
                    <strong style={styles.modalRouteVal}>{selectedBooking.to_location}</strong>
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: "#f8fafc", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#475569" }}>Booking Status:</span>
                <select
                  className={`status-select ${statusClass(selectedBooking.status)}`}
                  value={selectedBooking.status || "pending"}
                  onChange={async (e) => {
                    const newStatus = e.target.value;
                    await updateBookingStatus(selectedBooking.id, newStatus);
                    setSelectedBooking(prev => ({ ...prev, status: newStatus }));
                  }}
                  style={styles.inlineStatusSelect}
                >
                  <option value="pending">⏳ Pending</option>
                  <option value="confirmed">✓ Confirmed</option>
                  <option value="cancelled">✕ Cancelled</option>
                </select>
              </div>

              <div style={styles.modalInfoGrid}>
                <div style={styles.modalInfoItem}>
                  <span>Customer Name</span>
                  <strong>{selectedBooking.customer_name || selectedBooking.name || "-"}</strong>
                </div>
                <div style={styles.modalInfoItem}>
                  <span>Mobile Contact</span>
                  <strong>{selectedBooking.mobile || "-"}</strong>
                </div>
                <div style={styles.modalInfoItem}>
                  <span>Pickup Date & Time</span>
                  <strong>{formatDateTime(selectedBooking.travel_date)}</strong>
                </div>
                <div style={styles.modalInfoItem}>
                  <span>Vehicle Category</span>
                  <strong>{selectedBooking.vehicle_type}</strong>
                </div>
                <div style={styles.modalInfoItem}>
                  <span>Total Distance</span>
                  <strong>{Number(selectedBooking.distance_km || 0).toFixed(0)} KM</strong>
                </div>
                <div style={styles.modalInfoItem}>
                  <span>Applied Rate</span>
                  <strong>{formatMoney(selectedBooking.rate_per_km)} / KM</strong>
                </div>
              </div>

              <div style={styles.modalTotalRow}>
                <span>Calculated Total Fare</span>
                <strong style={styles.modalTotalFareVal}>{formatMoney(selectedBooking.total_fare)}</strong>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                type="button"
                style={styles.modalCloseAction}
                onClick={() => setSelectedBooking(null)}
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Professional inline design styling matching GoTrip UI standards
const styles = {
  adminPage: {
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    color: "#1e293b",
  },
  adminNav: {
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
    flexWrap: "wrap",
    gap: "10px",
  },
  navLogo: {
    fontSize: "24px",
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: "-0.5px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  logoSpan: {
    color: "#2563eb",
  },
  adminBadgeTag: {
    fontSize: "11px",
    backgroundColor: "#fef3c7",
    color: "#b45309",
    border: "1px solid #fde68a",
    padding: "2px 8px",
    borderRadius: "6px",
    textTransform: "uppercase",
  },
  navRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  navButtonPrimary: {
    backgroundColor: "#eff6ff",
    color: "#2563eb",
    border: "1px solid #bfdbfe",
    padding: "8px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
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
  adminContainer: {
    maxWidth: "1280px",
    margin: "0 auto",
    padding: "36px 20px 60px 20px",
  },
  titleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "28px",
    flexWrap: "wrap",
    gap: "16px",
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
    marginBottom: "6px",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#64748b",
    margin: "0",
  },
  refreshButton: {
    backgroundColor: "#eff6ff",
    color: "#2563eb",
    border: "1px solid #bfdbfe",
    padding: "10px 18px",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
  },
  successMessage: {
    backgroundColor: "#f0fdf4",
    color: "#166534",
    border: "1px solid #bbf7d0",
    padding: "12px 18px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "600",
    marginBottom: "20px",
  },
  errorMessage: {
    backgroundColor: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    padding: "12px 18px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "600",
    marginBottom: "20px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
    marginBottom: "36px",
  },
  statCard: {
    backgroundColor: "#ffffff",
    padding: "20px",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.02)",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    borderLeft: "4px solid #2563eb",
  },
  statIconBox: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    backgroundColor: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#64748b",
    display: "block",
    marginBottom: "2px",
  },
  statValue: {
    fontSize: "22px",
    fontWeight: "800",
    color: "#0f172a",
  },
  adminSection: {
    backgroundColor: "#ffffff",
    borderRadius: "18px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.03)",
    padding: "28px",
    marginBottom: "36px",
  },
  sectionHeader: {
    marginBottom: "20px",
  },
  h2: {
    fontSize: "20px",
    fontWeight: "800",
    color: "#0f172a",
    margin: "0 0 4px 0",
  },
  sectionSubtext: {
    fontSize: "13px",
    color: "#64748b",
    margin: "0",
  },
  bookingControls: {
    display: "flex",
    gap: "14px",
    marginBottom: "20px",
    flexWrap: "wrap",
    alignItems: "center",
  },
  searchBoxContainer: {
    position: "relative",
    flex: "1",
    minWidth: "260px",
  },
  searchIcon: {
    position: "absolute",
    left: "14px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#64748b",
    fontSize: "16px",
  },
  searchInput: {
    width: "100%",
    height: "46px",
    padding: "0 14px 0 40px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    fontSize: "14px",
    outline: "none",
    backgroundColor: "#f8fafc",
    boxSizing: "border-box",
  },
  filterButtonsGroup: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  filterBtn: {
    backgroundColor: "#f1f5f9",
    color: "#475569",
    border: "1px solid #cbd5e1",
    padding: "10px 16px",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  filterBtnActive: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    borderColor: "#2563eb",
  },
  filterBtnActivePending: {
    backgroundColor: "#ca8a04",
    color: "#ffffff",
    borderColor: "#ca8a04",
  },
  filterBtnActiveConfirmed: {
    backgroundColor: "#16a34a",
    color: "#ffffff",
    borderColor: "#16a34a",
  },
  filterBtnActiveCancelled: {
    backgroundColor: "#dc2626",
    color: "#ffffff",
    borderColor: "#dc2626",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    fontSize: "14px",
  },
  tableHeaderRow: {
    borderBottom: "2px solid #e2e8f0",
    backgroundColor: "#f8fafc",
  },
  th: {
    padding: "12px 16px",
    fontSize: "12px",
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
  },
  tableBodyRow: {
    borderBottom: "1px solid #f1f5f9",
    transition: "background-color 0.15s ease",
  },
  td: {
    padding: "14px 16px",
    color: "#334155",
    verticalAlign: "top",
  },
  clickableRefText: {
    fontWeight: "700",
    color: "#2563eb",
    cursor: "pointer",
    textDecoration: "underline",
  },
  subId: {
    fontSize: "12px",
    color: "#64748b",
  },
  boldText: {
    fontWeight: "600",
    color: "#1e293b",
  },
  routeCellContainer: {
    maxWidth: "280px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  routeTruncatedText: {
    fontSize: "13px",
    color: "#334155",
    lineHeight: "1.4",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  routeExpandedText: {
    fontSize: "13px",
    color: "#334155",
    lineHeight: "1.5",
    wordBreak: "break-word",
  },
  routeMarkerFrom: {
    fontWeight: "700",
    color: "#16a34a",
    fontSize: "11px",
    textTransform: "uppercase",
  },
  routeMarkerTo: {
    fontWeight: "700",
    color: "#dc2626",
    fontSize: "11px",
    textTransform: "uppercase",
  },
  seeMoreToggleBtn: {
    background: "none",
    border: "none",
    color: "#2563eb",
    fontSize: "12px",
    fontWeight: "700",
    cursor: "pointer",
    padding: "0",
    textAlign: "left",
    marginTop: "2px",
  },
  vehicleBadge: {
    backgroundColor: "#f1f5f9",
    padding: "4px 10px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
  },
  fareText: {
    fontWeight: "800",
    color: "#2563eb",
  },
  inlineStatusSelect: {
    padding: "6px 10px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    fontWeight: "600",
    outline: "none",
    cursor: "pointer",
  },
  viewButton: {
    backgroundColor: "#eff6ff",
    color: "#2563eb",
    border: "1px solid #bfdbfe",
    padding: "6px 12px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
  },
  paginationContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "24px",
    paddingTop: "16px",
    borderTop: "1px solid #e2e8f0",
  },
  pageBtn: {
    backgroundColor: "#ffffff",
    color: "#334155",
    border: "1px solid #cbd5e1",
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
  },
  pageBtnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
    backgroundColor: "#f8fafc",
  },
  pageIndicator: {
    fontSize: "13px",
    color: "#64748b",
  },
  pricingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "20px",
  },
  pricingCard: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
  },
  pricingHeaderTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  pricingIcon: {
    fontSize: "24px",
  },
  fleetBadge: {
    fontSize: "11px",
    fontWeight: "700",
    padding: "3px 8px",
    borderRadius: "6px",
    textTransform: "uppercase",
  },
  pricingTitle: {
    fontSize: "16px",
    fontWeight: "800",
    color: "#0f172a",
    margin: "0 0 2px 0",
  },
  pricingSubtitle: {
    fontSize: "12px",
    color: "#64748b",
    margin: "0 0 16px 0",
  },
  pricingRateBox: {
    marginTop: "auto",
    marginBottom: "16px",
  },
  displayRateContainer: {
    display: "flex",
    alignItems: "baseline",
  },
  rateAmount: {
    fontSize: "20px",
    fontWeight: "800",
    color: "#2563eb",
  },
  rateUnit: {
    fontSize: "12px",
    color: "#64748b",
    fontWeight: "600",
  },
  editPriceWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  priceInputGroup: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    padding: "6px 10px",
    fontWeight: "600",
  },
  priceInputField: {
    width: "100%",
    border: "none",
    outline: "none",
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
    backgroundColor: "transparent",
  },
  editActionButtons: {
    display: "flex",
    gap: "8px",
  },
  saveRateBtn: {
    flex: 1,
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "8px",
    borderRadius: "6px",
    fontWeight: "700",
    cursor: "pointer",
  },
  cancelRateBtn: {
    flex: 1,
    backgroundColor: "#e2e8f0",
    color: "#334155",
    border: "none",
    padding: "8px",
    borderRadius: "6px",
    fontWeight: "700",
    cursor: "pointer",
  },
  editRateButton: {
    backgroundColor: "#ffffff",
    color: "#334155",
    border: "1px solid #cbd5e1",
    padding: "8px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
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
    boxShadow: "0 25px 50px rgba(0, 0, 0, 0.25)",
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
  closeModalBtn: {
    background: "none",
    border: "none",
    fontSize: "18px",
    fontWeight: "bold",
    color: "#64748b",
    cursor: "pointer",
  },
  modalBody: {
    padding: "24px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  modalRouteSummary: {
    backgroundColor: "#f8fafc",
    padding: "14px 16px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
  },
  modalSubLabel: {
    fontSize: "10px",
    fontWeight: "700",
    color: "#64748b",
    display: "block",
    marginBottom: "2px",
  },
  modalRouteVal: {
    fontSize: "14px",
    color: "#0f172a",
    wordBreak: "break-word",
  },
  modalInfoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  modalInfoItem: {
    backgroundColor: "#f8fafc",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    fontSize: "13px",
    color: "#64748b",
  },
  modalTotalRow: {
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    padding: "14px 16px",
    borderRadius: "10px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: "#1e40af",
    fontWeight: "700",
  },
  modalTotalFareVal: {
    fontSize: "18px",
    fontWeight: "800",
  },
  modalFooter: {
    padding: "16px 24px",
    borderTop: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc",
    display: "flex",
    justifyContent: "flex-end",
  },
  modalFooterButtons: {
    display: "flex",
    gap: "10px",
    justifyContent: "flex-end",
  },
  modalCloseAction: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "10px 18px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
  },
  modalCancelAction: {
    backgroundColor: "#e2e8f0",
    color: "#334155",
    border: "none",
    padding: "10px 18px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
  },
  modalActionBtn: {
    backgroundColor: "#16a34a",
    color: "#ffffff",
    border: "none",
    padding: "10px 18px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(22, 163, 74, 0.25)",
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
  fieldLabel: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#334155",
    display: "block",
    marginBottom: "6px",
  },
  inputGroupWrapper: {
    display: "flex",
    flexDirection: "column",
  },
  dateInput: {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    fontSize: "14px",
    outline: "none",
    backgroundColor: "#f8fafc",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  messageBox: {
    padding: "40px 20px",
    textAlign: "center",
    color: "#64748b",
  },
  messageText: {
    fontSize: "14px",
    fontWeight: "600",
    margin: "0",
  },
  loadingSpinner: {
    width: "28px",
    height: "28px",
    border: "3px solid #e2e8f0",
    borderTopColor: "#2563eb",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    margin: "0 auto 10px auto",
  },
};