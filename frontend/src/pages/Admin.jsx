import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

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
  const [paymentProof, setPaymentProof] = useState(null);
  const [loadingProof, setLoadingProof] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [resolutionText, setResolutionText] = useState("");

  const [editingPrice, setEditingPrice] = useState(null);
  const [newPrice, setNewPrice] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [successModalMessage, setSuccessModalMessage] = useState("");
  const [successActionCallback, setSuccessActionCallback] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [expandedRoutes, setExpandedRoutes] = useState({});

  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showTicketsModal, setShowTicketsModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: "bot", text: "Hello Admin! How can I assist you today?" }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const toggleRouteExpand = (id) => {
    setExpandedRoutes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await API.get("/admin/bookings");
      setBookings(response.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const loadPricing = async () => {
    try {
      setPricingLoading(true);
      const response = await API.get("/pricing");
      setPricing(response.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load pricing");
    } finally {
      setPricingLoading(false);
    }
  };

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

  useEffect(() => {
    async function fetchPaymentProof() {
      if (!selectedBooking?.id) {
        setPaymentProof(null);
        return;
      }
      try {
        setLoadingProof(true);
        const res = await API.get(`/admin/bookings/${selectedBooking.id}/payment`);
        setPaymentProof(res.data || null);
      } catch (err) {
        setPaymentProof(null);
      } finally {
        setLoadingProof(false);
      }
    }
    fetchPaymentProof();
  }, [selectedBooking?.id]);

  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter(b => String(b.status).toLowerCase() === "confirmed").length;
  const pendingBookings = bookings.filter(b => String(b.status).toLowerCase() === "pending").length;
  const cancelledBookings = bookings.filter(b => String(b.status).toLowerCase() === "cancelled").length;

  const filteredBookings = useMemo(() => {
    const searchText = search.toLowerCase().trim();
    return bookings.filter((booking) => {
      const customer = booking.customer_name || booking.name || "";
      const mobile = booking.mobile || "";
      const bookingReference = booking.booking_reference || "";
      const from = booking.from_location || "";
      const to = booking.to_location || "";

      const matchesSearch = !searchText || String(bookingReference).toLowerCase().includes(searchText) || String(customer).toLowerCase().includes(searchText) || String(mobile).toLowerCase().includes(searchText) || String(from).toLowerCase().includes(searchText) || String(to).toLowerCase().includes(searchText);
      const bookingStatus = String(booking.status || "pending").toLowerCase();
      const matchesStatus = statusFilter === "all" || bookingStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bookings, search, statusFilter]);

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage) || 1;
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBookings.slice(start, start + itemsPerPage);
  }, [filteredBookings, currentPage]);

  const updateBookingStatus = async (bookingId, status) => {
    try {
      await API.patch(`/admin/bookings/${bookingId}/status`, { status });
      setSuccessModalMessage("Booking status updated successfully.");
      await loadBookings();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update booking status");
    }
  };

  const updatePrice = async (pricingId) => {
    const price = Number(newPrice);
    if (!price || price <= 0) { setError("Please enter a valid price."); return; }
    try {
      await API.patch(`/admin/pricing/${pricingId}`, { ratePerKm: price });
      setSuccessModalMessage("Pricing updated successfully.");
      setEditingPrice(null);
      setNewPrice("");
      await loadPricing();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update pricing");
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    const value = new Date(dateStr);
    if (Number.isNaN(value.getTime())) return dateStr;
    return value.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const formatMoney = (amount) => Number(amount || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
  const statusClass = (status) => String(status || "pending").toLowerCase().replace(/\s+/g, "-");

  return (
    <div style={styles.adminPage}>
      <header style={styles.adminNav}>
        <div style={styles.navContainer}>
          <strong style={styles.navLogo} onClick={() => navigate("/dashboard")}>
            Go<span style={styles.logoSpan}>Trip</span>
            <span style={styles.adminBadgeTag}>Admin</span>
          </strong>
          <div style={styles.navRight}>
            <button type="button" style={styles.navButtonPrimary} onClick={() => setShowPricingModal(true)}>⚙️ Pricing</button>
            <button type="button" style={styles.navButton} onClick={() => setShowFeedbackModal(true)}>⭐ Feedback ({feedbackList.length})</button>
            <button type="button" style={styles.navButton} onClick={async () => { await loadSupportData(); setShowTicketsModal(true); }}>🎧 Tickets</button>
            <button type="button" style={styles.navButton} onClick={() => navigate("/dashboard")}>Dashboard</button>
          </div>
        </div>
      </header>

      <main style={styles.adminContainer}>
        <div style={styles.titleRow}>
          <div>
            <span style={styles.eyebrow}>ADMINISTRATION PANEL</span>
            <h1 style={styles.h1}>Booking & Payment Verification</h1>
            <p style={styles.subtitle}>Verify UPI transaction UTRs and manage customer reservations.</p>
          </div>
          <button type="button" style={styles.refreshButton} onClick={() => { loadBookings(); loadPricing(); loadSupportData(); }}>↻ Refresh</button>
        </div>

        {message && <div style={styles.successMessage}>{message}</div>}
        {error && <div style={styles.errorMessage}>{error}</div>}

        <section style={styles.statsGrid}>
          <div style={styles.statCard}><div style={styles.statIconBox}>📋</div><div><span style={styles.statLabel}>Total</span><strong style={styles.statValue}>{totalBookings}</strong></div></div>
          <div style={{ ...styles.statCard, borderLeft: "4px solid #16a34a" }}><div style={{ ...styles.statIconBox, backgroundColor: "#dcfce7", color: "#16a34a" }}>✓</div><div><span style={styles.statLabel}>Confirmed</span><strong style={styles.statValue}>{confirmedBookings}</strong></div></div>
          <div style={{ ...styles.statCard, borderLeft: "4px solid #ca8a04" }}><div style={{ ...styles.statIconBox, backgroundColor: "#fef9c3", color: "#ca8a04" }}>⏳</div><div><span style={styles.statLabel}>Pending</span><strong style={styles.statValue}>{pendingBookings}</strong></div></div>
          <div style={{ ...styles.statCard, borderLeft: "4px solid #dc2626" }}><div style={{ ...styles.statIconBox, backgroundColor: "#fee2e2", color: "#dc2626" }}>×</div><div><span style={styles.statLabel}>Cancelled</span><strong style={styles.statValue}>{cancelledBookings}</strong></div></div>
        </section>

        <section style={styles.adminSection}>
          <div style={styles.bookingControls}>
            <div style={styles.searchBoxContainer}>
              <span style={styles.searchIcon}>⌕</span>
              <input type="text" placeholder="Search reference, customer name, mobile..." value={search} onChange={(e) => setSearch(e.target.value)} style={styles.searchInput} />
            </div>
            <div style={styles.filterButtonsGroup}>
              {["all", "pending", "confirmed", "cancelled"].map((st) => (
                <button key={st} type="button" style={{ ...styles.filterBtn, ...(statusFilter === st ? styles.filterBtnActive : {}) }} onClick={() => setStatusFilter(st)}>
                  {st.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.tableWrapper}>
            {loading ? (
              <div style={styles.messageBox}><div style={styles.funnyLoaderContainer}><div style={styles.carMovingIcon}>🚗💨</div><div style={styles.loadingSpinner}></div></div><p style={styles.messageText}>Loading data...</p></div>
            ) : paginatedBookings.length === 0 ? (
              <div style={styles.messageBox}><p style={styles.messageText}>No bookings found.</p></div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Reference</th>
                    <th style={styles.th}>Customer</th>
                    <th style={styles.th}>Route</th>
                    <th style={styles.th}>Booking / Pickup Time</th>
                    <th style={styles.th}>Vehicle</th>
                    <th style={styles.th}>Fare</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBookings.map((booking) => {
                    const isExpanded = !!expandedRoutes[booking.id];
                    return (
                      <tr key={booking.id} style={styles.tableBodyRow}>
                        <td style={styles.td}>
                          <div style={styles.clickableRefText} onClick={() => setSelectedBooking(booking)}>{booking.booking_reference}</div>
                          <small style={styles.subId}>ID: #{booking.id}</small>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.boldText}>{booking.customer_name || booking.name || "Customer"}</div>
                          {booking.mobile && <small style={styles.subId}>{booking.mobile}</small>}
                        </td>
                        <td style={styles.td}>
                          <div style={styles.routeCellContainer}>
                            <div style={isExpanded ? styles.routeExpandedText : styles.routeTruncatedText}>
                              <span style={styles.routeMarkerFrom}>From:</span> {booking.from_location}<br />
                              <span style={styles.routeMarkerTo}>To:</span> {booking.to_location}
                            </div>
                            <button type="button" style={styles.seeMoreToggleBtn} onClick={() => toggleRouteExpand(booking.id)}>
                              {isExpanded ? "▲ Less" : "▼ More"}
                            </button>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>Booked: {formatDateTime(booking.created_at)}</div>
                          <strong style={{ fontSize: "13px", color: "#1e293b" }}>Pickup: {formatDateTime(booking.travel_date)}</strong>
                        </td>
                        <td style={styles.td}><span style={styles.vehicleBadge}>🚕 {booking.vehicle_type}</span></td>
                        <td style={styles.td}><strong style={styles.fareText}>{formatMoney(booking.total_fare)}</strong></td>
                        <td style={styles.td}>
                          <select className={`status-select ${statusClass(booking.status)}`} value={booking.status || "pending"} onChange={(e) => updateBookingStatus(booking.id, e.target.value)} style={styles.inlineStatusSelect}>
                            <option value="pending">⏳ Pending</option>
                            <option value="confirmed">✓ Confirmed</option>
                            <option value="cancelled">✕ Cancelled</option>
                          </select>
                        </td>
                        <td style={styles.td}>
                          <button type="button" style={styles.viewButton} onClick={() => setSelectedBooking(booking)}>Verify Proof</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>

      {/* INSPECTION & PAYMENT VERIFICATION MODAL */}
      {selectedBooking && (
        <div style={styles.modalOverlay} onClick={() => setSelectedBooking(null)}>
          <div style={{ ...styles.modalCard, maxWidth: "600px" }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.modalEyebrow}>PAYMENT & BOOKING VERIFICATION</span>
                <h3 style={styles.modalTitle}>{selectedBooking.booking_reference}</h3>
              </div>
              <button type="button" style={styles.closeModalBtn} onClick={() => setSelectedBooking(null)}>✕</button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.modalRouteSummary}>
                <div style={{ marginBottom: "6px" }}><small style={styles.modalSubLabel}>BOOKING TIME</small><strong>{formatDateTime(selectedBooking.created_at)}</strong></div>
                <div style={{ marginBottom: "6px" }}><small style={styles.modalSubLabel}>PICKUP TIME & DATE</small><strong style={{ color: "#2563eb" }}>{formatDateTime(selectedBooking.travel_date)}</strong></div>
                <div style={{ marginBottom: "6px" }}><small style={styles.modalSubLabel}>ROUTE</small><strong>{selectedBooking.from_location} → {selectedBooking.to_location}</strong></div>
              </div>

              {/* PAYMENT PROOF / TRANSACTION UTR BOX */}
              <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", padding: "16px", borderRadius: "12px" }}>
                <span style={{ fontSize: "11px", fontWeight: "800", color: "#1d4ed8", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                  💳 Advance UPI Payment Verification Proof
                </span>
                {loadingProof ? (
                  <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>Loading payment proof...</p>
                ) : paymentProof ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", color: "#1e293b" }}>
                    <div><strong>Amount Paid:</strong> ₹{paymentProof.amount}</div>
                    <div><strong>Target UPI ID:</strong> {paymentProof.upi_id || "8465826241-3@ybl"}</div>
                    <div><strong>Transaction UTR / ID:</strong> <span style={{ backgroundColor: "#dbeafe", padding: "2px 6px", borderRadius: "4px", fontWeight: "700", color: "#1e40af" }}>{paymentProof.transaction_ref}</span></div>
                    <div><strong>Payment Status:</strong> <span style={{ textTransform: "uppercase", fontWeight: "700", color: paymentProof.status === "verified" ? "#16a34a" : "#ca8a04" }}>{paymentProof.status}</span></div>
                  </div>
                ) : (
                  <p style={{ fontSize: "13px", color: "#dc2626", margin: 0 }}>No payment verification record linked yet.</p>
                )}
              </div>

              <div style={styles.modalInfoGrid}>
                <div style={styles.modalInfoItem}><span>Customer</span><strong>{selectedBooking.customer_name || selectedBooking.name || "-"}</strong></div>
                <div style={styles.modalInfoItem}><span>Mobile</span><strong>{selectedBooking.mobile || "-"}</strong></div>
                <div style={styles.modalInfoItem}><span>Vehicle</span><strong>{selectedBooking.vehicle_type}</strong></div>
                <div style={styles.modalInfoItem}><span>Distance</span><strong>{Number(selectedBooking.distance_km || 0).toFixed(0)} KM</strong></div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button type="button" style={styles.modalCloseAction} onClick={() => setSelectedBooking(null)}>Close Window</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const styles = {
  adminPage: { minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "'Inter', system-ui, sans-serif", color: "#1e293b" },
  adminNav: { backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 100 },
  navContainer: { maxWidth: "1280px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 24px", gap: "10px" },
  navLogo: { fontSize: "24px", fontWeight: "800", color: "#0f172a", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px" },
  logoSpan: { color: "#2563eb" },
  adminBadgeTag: { fontSize: "11px", backgroundColor: "#fef3c7", color: "#b45309", border: "1px solid #fde68a", padding: "2px 8px", borderRadius: "6px", textTransform: "uppercase" },
  navRight: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" },
  navButtonPrimary: { backgroundColor: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", padding: "8px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: "pointer" },
  navButton: { backgroundColor: "#ffffff", color: "#334155", border: "1px solid #cbd5e1", padding: "8px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer" },
  adminContainer: { maxWidth: "1280px", margin: "0 auto", padding: "36px 20px 60px 20px" },
  titleRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", gap: "16px" },
  eyebrow: { fontSize: "11px", fontWeight: "800", color: "#2563eb", letterSpacing: "1.5px", marginBottom: "6px", display: "block", textTransform: "uppercase" },
  h1: { fontSize: "28px", fontWeight: "800", color: "#0f172a", margin: "0 0 6px 0" },
  subtitle: { fontSize: "14px", color: "#64748b", margin: 0 },
  refreshButton: { backgroundColor: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", padding: "10px 18px", borderRadius: "10px", fontSize: "13px", fontWeight: "700", cursor: "pointer" },
  successMessage: { backgroundColor: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", padding: "12px 18px", borderRadius: "10px", fontSize: "14px", fontWeight: "600", marginBottom: "20px" },
  errorMessage: { backgroundColor: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", padding: "12px 18px", borderRadius: "10px", fontSize: "14px", fontWeight: "600", marginBottom: "20px" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "36px" },
  statCard: { backgroundColor: "#ffffff", padding: "20px", borderRadius: "14px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "16px", borderLeft: "4px solid #2563eb" },
  statIconBox: { width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: "bold" },
  statLabel: { fontSize: "12px", fontWeight: "600", color: "#64748b", display: "block", marginBottom: "2px" },
  statValue: { fontSize: "22px", fontWeight: "800", color: "#0f172a" },
  adminSection: { backgroundColor: "#ffffff", borderRadius: "18px", border: "1px solid #e2e8f0", padding: "28px", marginBottom: "36px" },
  bookingControls: { display: "flex", gap: "14px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" },
  searchBoxContainer: { position: "relative", flex: "1", minWidth: "260px" },
  searchIcon: { position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#64748b" },
  searchInput: { width: "100%", height: "46px", padding: "0 14px 0 40px", border: "1px solid #cbd5e1", borderRadius: "10px", fontSize: "14px", backgroundColor: "#f8fafc", boxSizing: "border-box" },
  filterButtonsGroup: { display: "flex", gap: "8px", flexWrap: "wrap" },
  filterBtn: { backgroundColor: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "10px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: "700", cursor: "pointer" },
  filterBtnActive: { backgroundColor: "#2563eb", color: "#ffffff", borderColor: "#2563eb" },
  filterBtnActivePending: { backgroundColor: "#ca8a04", color: "#ffffff", borderColor: "#ca8a04" },
  filterBtnActiveConfirmed: { backgroundColor: "#16a34a", color: "#ffffff", borderColor: "#16a34a" },
  filterBtnActiveCancelled: { backgroundColor: "#dc2626", color: "#ffffff", borderColor: "#dc2626" },
  tableWrapper: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" },
  tableHeaderRow: { borderBottom: "2px solid #e2e8f0", backgroundColor: "#f8fafc" },
  th: { padding: "12px 16px", fontSize: "12px", fontWeight: "700", color: "#475569", textTransform: "uppercase" },
  tableBodyRow: { borderBottom: "1px solid #f1f5f9" },
  td: { padding: "14px 16px", color: "#334155", verticalAlign: "top" },
  clickableRefText: { fontWeight: "700", color: "#2563eb", cursor: "pointer", textDecoration: "underline" },
  subId: { fontSize: "12px", color: "#64748b" },
  boldText: { fontWeight: "600", color: "#1e293b" },
  routeCellContainer: { maxWidth: "280px", display: "flex", flexDirection: "column", gap: "4px" },
  routeTruncatedText: { fontSize: "13px", color: "#334155", lineHeight: "1.4", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },
  routeExpandedText: { fontSize: "13px", color: "#334155", lineHeight: "1.5", wordBreak: "break-word" },
  routeMarkerFrom: { fontWeight: "700", color: "#16a34a", fontSize: "11px" },
  routeMarkerTo: { fontWeight: "700", color: "#dc2626", fontSize: "11px" },
  seeMoreToggleBtn: { background: "none", border: "none", color: "#2563eb", fontSize: "12px", fontWeight: "700", cursor: "pointer", padding: "0", textAlign: "left", marginTop: "2px" },
  vehicleBadge: { backgroundColor: "#f1f5f9", padding: "4px 10px", borderRadius: "8px", fontSize: "13px", fontWeight: "600" },
  fareText: { fontWeight: "800", color: "#2563eb" },
  inlineStatusSelect: { padding: "6px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "600", cursor: "pointer" },
  viewButton: { backgroundColor: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", padding: "6px 12px", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: "pointer" },
  paginationContainer: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #e2e8f0" },
  pageBtn: { backgroundColor: "#ffffff", color: "#334155", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: "pointer" },
  pageBtnDisabled: { opacity: 0.5, cursor: "not-allowed", backgroundColor: "#f8fafc" },
  pageIndicator: { fontSize: "13px", color: "#64748b" },
  modalOverlay: { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" },
  modalCard: { backgroundColor: "#ffffff", width: "100%", maxWidth: "540px", borderRadius: "20px", boxShadow: "0 25px 50px rgba(0, 0, 0, 0.25)", overflow: "hidden" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" },
  modalEyebrow: { fontSize: "11px", fontWeight: "800", color: "#2563eb", letterSpacing: "1px", display: "block", marginBottom: "2px" },
  modalTitle: { fontSize: "18px", fontWeight: "800", color: "#0f172a", margin: 0 },
  closeModalBtn: { background: "none", border: "none", fontSize: "18px", fontWeight: "bold", color: "#64748b", cursor: "pointer" },
  modalBody: { padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "18px" },
  modalRouteSummary: { backgroundColor: "#f8fafc", padding: "14px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" },
  modalSubLabel: { fontSize: "10px", fontWeight: "700", color: "#64748b", display: "block", marginBottom: "2px" },
  modalRouteVal: { fontSize: "14px", color: "#0f172a", wordBreak: "break-word" },
  modalInfoGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
  modalInfoItem: { backgroundColor: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "2px", fontSize: "13px", color: "#64748b" },
  modalFooter: { padding: "16px 24px", borderTop: "1px solid #e2e8f0", backgroundColor: "#f8fafc", display: "flex", justifyContent: "flex-end" },
  modalCloseAction: { backgroundColor: "#2563eb", color: "#ffffff", border: "none", padding: "10px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: "pointer" },
  messageBox: { padding: "40px 20px", textAlign: "center", color: "#64748b" },
  funnyLoaderContainer: { position: "relative", height: "50px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center" },
  carMovingIcon: { fontSize: "24px", position: "absolute", animation: "bounceCar 1s infinite alternate ease-in-out" },
  messageText: { fontSize: "14px", fontWeight: "600", margin: 0 },
  loadingSpinner: { width: "40px", height: "40px", border: "4px solid #e2e8f0", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite" }
};