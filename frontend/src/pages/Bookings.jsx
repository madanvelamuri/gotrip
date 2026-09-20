import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function Bookings() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Selected Booking for Pop-up Inspection Modal
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await API.get("/bookings/my");

      setBookings(response.data || []);
    } catch (error) {
      console.error("Unable to load bookings:", error);

      setError(
        error.response?.data?.message ||
        "Unable to load your bookings"
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const searchText = search.toLowerCase().trim();

      const matchesSearch =
        !searchText ||
        booking.booking_reference
          ?.toLowerCase()
          .includes(searchText) ||
        booking.from_location
          ?.toLowerCase()
          .includes(searchText) ||
        booking.to_location
          ?.toLowerCase()
          .includes(searchText) ||
        booking.vehicle_type
          ?.toLowerCase()
          .includes(searchText);

      // Explicitly fallback to "pending" if status is missing or null
      const bookingStatus = booking.status || "pending";

      const matchesStatus =
        statusFilter === "All" ||
        bookingStatus.toLowerCase() ===
          statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [bookings, search, statusFilter]);

  const formatDate = (date) => {
    if (!date) {
      return "Date not selected";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));
  };

  const getVehicleIcon = (vehicle) => {
    const type = (vehicle || "").toLowerCase();

    if (type.includes("7")) {
      return "🚕";
    }

    if (type.includes("5")) {
      return "🚗";
    }

    return "🚘";
  };

  return (
    <div style={styles.bookingsPage}>

      {/* PAGE HEADER */}
      <section style={styles.bookingsHeader}>
        <div>
          <span style={styles.bookingsEyebrow}>GOTRIP</span>
          <h1 style={styles.h1}>My Bookings</h1>
          <p style={styles.p}>Manage and track all your cab bookings in one place.</p>
        </div>

        <button
          type="button"
          style={styles.newBookingButton}
          onClick={() => navigate("/dashboard")}
        >
          + New Booking
        </button>
      </section>

      {/* SUMMARY */}
      <section style={styles.bookingSummary}>
        <div style={styles.summaryCard}>
          <span style={styles.summaryIcon}>📋</span>
          <div>
            <strong style={styles.summaryStrong}>{bookings.length}</strong>
            <span style={styles.summarySpan}>Total Bookings</span>
          </div>
        </div>

        <div style={styles.summaryCard}>
          <span style={styles.summaryIcon}>⏳</span>
          <div>
            <strong style={styles.summaryStrong}>
              {
                bookings.filter(
                  (b) =>
                    (b.status || "pending").toLowerCase() === "pending"
                ).length
              }
            </strong>
            <span style={styles.summarySpan}>Pending Review</span>
          </div>
        </div>

        <div style={styles.summaryCard}>
          <span style={styles.summaryIcon}>₹</span>
          <div>
            <strong style={styles.summaryStrong}>
              {formatCurrency(
                bookings.reduce(
                  (total, booking) =>
                    total + Number(booking.total_fare || 0),
                  0
                )
              )}
            </strong>
            <span style={styles.summarySpan}>Total Booked Value</span>
          </div>
        </div>
      </section>

      {/* FILTERS */}
      <section style={styles.bookingFilters}>
        <div style={styles.bookingSearch}>
          <span style={styles.searchIcon}>⌕</span>
          <input
            style={styles.searchInput}
            type="text"
            placeholder="Search by booking, location or vehicle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={styles.statusFilters}>
          {["All", "Pending", "Confirmed", "Completed", "Cancelled"].map(
            (status) => (
              <button
                key={status}
                type="button"
                style={{
                  ...styles.filterButton,
                  ...(statusFilter === status ? styles.filterButtonActive : {}),
                }}
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </button>
            )
          )}
        </div>
      </section>

      {/* CONTENT */}
      <section style={styles.bookingList}>
        {loading && (
          <div style={styles.bookingMessage}>
            <div style={styles.loadingSpinner}></div>
            <h3 style={styles.messageH3}>Loading your bookings...</h3>
            <p style={styles.messageP}>Please wait a moment.</p>
          </div>
        )}

        {!loading && error && (
          <div style={{ ...styles.bookingMessage, ...styles.errorMessage }}>
            <div style={styles.errorIcon}>!</div>
            <h3 style={styles.messageH3}>Unable to load bookings</h3>
            <p style={styles.messageP}>{error}</p>
            <button
              type="button"
              style={styles.retryButton}
              onClick={loadBookings}
            >
              Try Again
            </button>
          </div>
        )}

        {!loading &&
          !error &&
          filteredBookings.length === 0 && (
            <div style={styles.bookingMessage}>
              <div style={styles.emptyIcon}>🚕</div>
              <h3 style={styles.messageH3}>
                {bookings.length === 0
                  ? "No bookings yet"
                  : "No matching bookings"}
              </h3>
              <p style={styles.messageP}>
                {bookings.length === 0
                  ? "Your upcoming and previous trips will appear here."
                  : "Try changing your search or status filter."}
              </p>
              {bookings.length === 0 && (
                <button
                  type="button"
                  style={{ ...styles.newBookingButton, marginTop: "16px" }}
                  onClick={() => navigate("/dashboard")}
                >
                  Book Your First Trip
                </button>
              )}
            </div>
          )}

        {!loading &&
          !error &&
          filteredBookings.map((booking) => {
            const currentStatus = (booking.status || "pending").toLowerCase();

            return (
              <article style={styles.bookingCard} key={booking.id}>

                {/* TOP */}
                <div style={styles.bookingCardTop}>
                  <div style={styles.bookingReference}>
                    <span style={styles.refLabel}>BOOKING REFERENCE</span>
                    <strong style={styles.refValue}>{booking.booking_reference}</strong>
                  </div>

                  <span
                    style={{
                      ...styles.statusBadge,
                      ...(currentStatus === "completed"
                        ? styles.statusCompleted
                        : currentStatus === "cancelled" || currentStatus === "canceled"
                        ? styles.statusCancelled
                        : currentStatus === "confirmed"
                        ? styles.statusConfirmed
                        : styles.statusPending),
                    }}
                  >
                    <span style={styles.statusDot}></span>
                    {booking.status || "Pending"}
                  </span>
                </div>

                {/* ROUTE */}
                <div style={styles.bookingRoute}>
                  <div style={styles.locationBlock}>
                    <span style={styles.locationLabel}>FROM</span>
                    <strong style={styles.locationValue}>{booking.from_location}</strong>
                  </div>

                  <div style={styles.routeLine}>
                    <span style={styles.routeCircle}></span>
                    <span style={styles.routeArrow}>→</span>
                    <span style={{ ...styles.routeCircle, ...styles.routeCircleDestination }}></span>
                  </div>

                  <div style={{ ...styles.locationBlock, textAlign: "right" }}>
                    <span style={styles.locationLabel}>TO</span>
                    <strong style={styles.locationValue}>{booking.to_location}</strong>
                  </div>
                </div>

                {/* DETAILS */}
                <div style={styles.bookingDetails}>
                  <div style={styles.bookingDetail}>
                    <span style={styles.detailIcon}>📅</span>
                    <div>
                      <span style={styles.detailLabel}>Travel Date & Time</span>
                      <strong style={styles.detailValue}>{formatDate(booking.travel_date)}</strong>
                    </div>
                  </div>

                  <div style={styles.bookingDetail}>
                    <span style={styles.detailIcon}>
                      {getVehicleIcon(booking.vehicle_type)}
                    </span>
                    <div>
                      <span style={styles.detailLabel}>Vehicle</span>
                      <strong style={styles.detailValue}>{booking.vehicle_type}</strong>
                    </div>
                  </div>

                  <div style={styles.bookingDetail}>
                    <span style={styles.detailIcon}>📍</span>
                    <div>
                      <span style={styles.detailLabel}>Distance</span>
                      <strong style={styles.detailValue}>
                        {Number(booking.distance_km || 0).toFixed(0)} KM
                      </strong>
                    </div>
                  </div>

                  <div style={{ ...styles.bookingDetail, borderRight: "none" }}>
                    <span style={styles.detailIcon}>₹</span>
                    <div>
                      <span style={styles.detailLabel}>Total Fare</span>
                      <strong style={{ ...styles.detailValue, color: "#2563eb" }}>
                        {formatCurrency(booking.total_fare)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* FOOTER */}
                <div style={styles.bookingCardFooter}>
                  <div style={styles.fareInfo}>
                    Rate: ₹{Number(booking.rate_per_km || 0).toFixed(2)} / KM
                  </div>

                  <button
                    type="button"
                    style={styles.detailsButton}
                    onClick={() => setSelectedBooking(booking)}
                  >
                    View Details <span>→</span>
                  </button>
                </div>

              </article>
            );
          })}
      </section>

      {/* =========================================
          MODAL: BOOKING INSPECTION POP-UP
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

              <div style={styles.modalInfoGrid}>
                <div style={styles.modalInfoItem}>
                  <span>Booking Status</span>
                  <strong style={{ textTransform: "capitalize", color: "#2563eb" }}>{selectedBooking.status || "Pending"}</strong>
                </div>
                <div style={styles.modalInfoItem}>
                  <span>Pickup Date & Time</span>
                  <strong>{formatDate(selectedBooking.travel_date)}</strong>
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
                  <strong>{formatCurrency(selectedBooking.rate_per_km)} / KM</strong>
                </div>
                <div style={styles.modalInfoItem}>
                  <span>Database ID</span>
                  <strong>#{selectedBooking.id}</strong>
                </div>
              </div>

              <div style={styles.modalTotalRow}>
                <span>Calculated Total Fare</span>
                <strong style={styles.modalTotalFareVal}>{formatCurrency(selectedBooking.total_fare)}</strong>
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

// Professional inline design system styling matching GoTrip
const styles = {
  bookingsPage: {
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "30px 20px",
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    color: "#1e293b",
  },
  bookingsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "30px",
    flexWrap: "wrap",
    gap: "16px",
  },
  bookingsEyebrow: {
    fontSize: "12px",
    fontWeight: "800",
    color: "#2563eb",
    letterSpacing: "1px",
    marginBottom: "4px",
    display: "block",
  },
  h1: {
    fontSize: "26px",
    fontWeight: "800",
    color: "#0f172a",
    margin: "0 0 6px 0",
  },
  p: {
    fontSize: "14px",
    color: "#64748b",
    margin: "0",
  },
  newBookingButton: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "10px 18px",
    borderRadius: "8px",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)",
    transition: "background-color 0.2s",
  },
  bookingSummary: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "20px",
    marginBottom: "30px",
  },
  summaryCard: {
    background: "#ffffff",
    padding: "20px",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)",
  },
  summaryIcon: {
    fontSize: "24px",
    backgroundColor: "#eff6ff",
    padding: "12px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryStrong: {
    display: "block",
    fontSize: "22px",
    fontWeight: "700",
    color: "#0f172a",
  },
  summarySpan: {
    fontSize: "13px",
    color: "#64748b",
  },
  bookingFilters: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    marginBottom: "30px",
    background: "#ffffff",
    padding: "18px",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
  },
  bookingSearch: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  searchIcon: {
    position: "absolute",
    left: "14px",
    fontSize: "18px",
    color: "#94a3b8",
  },
  searchInput: {
    width: "100%",
    padding: "11px 14px 11px 40px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    outline: "none",
    backgroundColor: "#f8fafc",
    boxSizing: "border-box",
  },
  statusFilters: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  filterButton: {
    padding: "8px 16px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#475569",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  filterButtonActive: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    borderColor: "#2563eb",
  },
  bookingList: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  bookingCard: {
    background: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    padding: "24px",
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.04)",
  },
  bookingCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    paddingBottom: "14px",
    borderBottom: "1px solid #f1f5f9",
  },
  bookingReference: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  refLabel: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: "0.5px",
  },
  refValue: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
    textTransform: "capitalize",
  },
  statusPending: {
    backgroundColor: "#fef9c3",
    color: "#854d0e",
    border: "1px solid #fde047",
  },
  statusConfirmed: {
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
  },
  statusCompleted: {
    backgroundColor: "#f0fdf4",
    color: "#15803d",
    border: "1px solid #bbf7d0",
  },
  statusCancelled: {
    backgroundColor: "#fef2f2",
    color: "#b91c1c",
    border: "1px solid #fecaca",
  },
  statusDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: "currentColor",
  },
  bookingRoute: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: "16px",
    borderRadius: "10px",
    marginBottom: "20px",
  },
  locationBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    flex: "1",
  },
  locationLabel: {
    fontSize: "10px",
    fontWeight: "700",
    color: "#94a3b8",
  },
  locationValue: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#334155",
  },
  routeLine: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "0 16px",
    color: "#94a3b8",
  },
  routeCircle: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#2563eb",
  },
  routeCircleDestination: {
    backgroundColor: "#16a34a",
  },
  routeArrow: {
    fontSize: "14px",
    fontWeight: "700",
  },
  bookingDetails: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
    marginBottom: "20px",
  },
  bookingDetail: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  detailIcon: {
    fontSize: "18px",
    backgroundColor: "#f1f5f9",
    padding: "10px",
    borderRadius: "8px",
  },
  detailLabel: {
    fontSize: "12px",
    color: "#64748b",
    display: "block",
  },
  detailValue: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#0f172a",
  },
  bookingCardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: "16px",
    borderTop: "1px solid #f1f5f9",
  },
  fareInfo: {
    fontSize: "13px",
    color: "#64748b",
    fontWeight: "500",
  },
  detailsButton: {
    backgroundColor: "transparent",
    color: "#2563eb",
    border: "1px solid #2563eb",
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "all 0.2s",
  },
  bookingMessage: {
    background: "#ffffff",
    padding: "50px 20px",
    borderRadius: "14px",
    textAlign: "center",
    border: "1px solid #e2e8f0",
  },
  messageH3: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "10px 0 6px 0",
  },
  messageP: {
    fontSize: "14px",
    color: "#64748b",
    margin: "0",
  },
  loadingSpinner: {
    width: "36px",
    height: "36px",
    border: "3px solid #e2e8f0",
    borderTopColor: "#2563eb",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    margin: "0 auto 12px auto",
  },
  errorMessage: {
    borderColor: "#fecaca",
    backgroundColor: "#fffdfd",
  },
  errorIcon: {
    width: "36px",
    height: "36px",
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    fontWeight: "bold",
    margin: "0 auto 12px auto",
  },
  retryButton: {
    marginTop: "16px",
    backgroundColor: "#dc2626",
    color: "#ffffff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  emptyIcon: {
    fontSize: "36px",
    marginBottom: "10px",
  },
  // Modal Styling
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
    maxWidth: "500px",
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
    gap: "16px",
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
  modalActionBtn: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },
};