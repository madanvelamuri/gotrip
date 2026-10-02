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
          <span style={styles.bookingsEyebrow}>✨ GOTRIP VOYAGES</span>
          <h1 style={styles.h1}>My Bookings</h1>
          <p style={styles.p}>Track your past adventures and upcoming road trips in style.</p>
        </div>

        <button
          type="button"
          style={styles.newBookingButton}
          onClick={() => navigate("/dashboard")}
        >
          🚀 + New Booking
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
          <span style={styles.summaryIcon}>💳</span>
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
          <span style={styles.searchIcon}>🔍</span>
          <input
            style={styles.searchInput}
            type="text"
            placeholder="Search by booking reference, location, or vehicle..."
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
            <div style={styles.funnyLoaderContainer}>
              <div style={styles.carMovingIcon}>🚗💨</div>
              <div style={styles.loadingSpinner}></div>
            </div>
            <h3 style={styles.messageH3}>Warming up the engine...</h3>
            <p style={styles.messageP}>Gathering your travel logs from the highway database!</p>
          </div>
        )}

        {!loading && error && (
          <div style={{ ...styles.bookingMessage, ...styles.errorMessage }}>
            <div style={styles.errorIcon}>⚠️</div>
            <h3 style={styles.messageH3}>Oops! Speed bump encountered</h3>
            <p style={styles.messageP}>{error}</p>
            <button
              type="button"
              style={styles.retryButton}
              onClick={loadBookings}
            >
              🔄 Try Again
            </button>
          </div>
        )}

        {!loading &&
          !error &&
          filteredBookings.length === 0 && (
            <div style={styles.bookingMessage}>
              <div style={styles.emptyIcon}>🧳</div>
              <h3 style={styles.messageH3}>
                {bookings.length === 0
                  ? "No bookings on the dashboard yet!"
                  : "No matching trips found"}
              </h3>
              <p style={styles.messageP}>
                {bookings.length === 0
                  ? "Looks like your garage is empty. Time to plan an epic road trip!"
                  : "Try loosening up your search keywords or filter settings."}
              </p>
              {bookings.length === 0 && (
                <button
                  type="button"
                  style={{ ...styles.newBookingButton, marginTop: "20px" }}
                  onClick={() => navigate("/dashboard")}
                >
                  🗺️ Book Your First Adventure
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
                    <span style={styles.detailIcon}>💰</span>
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
                <span style={styles.modalEyebrow}>TRIP INSPECTION</span>
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

// Professional and funny design system styling matching GoTrip standards
const styles = {
  bookingsPage: {
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "40px 20px",
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    color: "#1e293b",
  },
  bookingsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "32px",
    flexWrap: "wrap",
    gap: "16px",
  },
  bookingsEyebrow: {
    fontSize: "12px",
    fontWeight: "800",
    color: "#2563eb",
    letterSpacing: "1.5px",
    marginBottom: "6px",
    display: "block",
  },
  h1: {
    fontSize: "30px",
    fontWeight: "800",
    color: "#0f172a",
    margin: "0 0 6px 0",
    letterSpacing: "-0.5px",
  },
  p: {
    fontSize: "15px",
    color: "#64748b",
    margin: "0",
  },
  newBookingButton: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "12px 20px",
    borderRadius: "10px",
    fontWeight: "700",
    fontSize: "14px",
    cursor: "pointer",
    boxShadow: "0 6px 16px rgba(37, 99, 235, 0.3)",
    transition: "transform 0.15s ease",
  },
  bookingSummary: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "20px",
    marginBottom: "32px",
  },
  summaryCard: {
    background: "#ffffff",
    padding: "24px",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    gap: "18px",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.03)",
  },
  summaryIcon: {
    fontSize: "26px",
    backgroundColor: "#eff6ff",
    padding: "14px",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryStrong: {
    display: "block",
    fontSize: "24px",
    fontWeight: "800",
    color: "#0f172a",
  },
  summarySpan: {
    fontSize: "13px",
    color: "#64748b",
    fontWeight: "600",
  },
  bookingFilters: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    marginBottom: "32px",
    background: "#ffffff",
    padding: "20px",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.03)",
  },
  bookingSearch: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  searchIcon: {
    position: "absolute",
    left: "16px",
    fontSize: "16px",
  },
  searchInput: {
    width: "100%",
    padding: "12px 16px 12px 46px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    outline: "none",
    backgroundColor: "#f8fafc",
    boxSizing: "border-box",
    fontWeight: "600",
  },
  statusFilters: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  filterButton: {
    padding: "8px 16px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#475569",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  filterButtonActive: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    borderColor: "#2563eb",
    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)",
  },
  bookingList: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  bookingCard: {
    background: "#ffffff",
    borderRadius: "18px",
    border: "1px solid #e2e8f0",
    padding: "28px",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.04)",
    transition: "transform 0.2s ease",
  },
  bookingCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    paddingBottom: "16px",
    borderBottom: "1px solid #f1f5f9",
  },
  bookingReference: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  refLabel: {
    fontSize: "11px",
    fontWeight: "800",
    color: "#94a3b8",
    letterSpacing: "0.5px",
  },
  refValue: {
    fontSize: "16px",
    fontWeight: "800",
    color: "#0f172a",
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 14px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "700",
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
    padding: "18px",
    borderRadius: "12px",
    marginBottom: "20px",
    border: "1px solid #e2e8f0",
  },
  locationBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    flex: "1",
  },
  locationLabel: {
    fontSize: "10px",
    fontWeight: "800",
    color: "#94a3b8",
  },
  locationValue: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#1e293b",
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
    fontWeight: "800",
  },
  bookingDetails: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
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
    borderRadius: "10px",
  },
  detailLabel: {
    fontSize: "11px",
    color: "#64748b",
    display: "block",
    fontWeight: "600",
  },
  detailValue: {
    fontSize: "14px",
    fontWeight: "800",
    color: "#0f172a",
  },
  bookingCardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: "18px",
    borderTop: "1px solid #f1f5f9",
  },
  fareInfo: {
    fontSize: "13px",
    color: "#64748b",
    fontWeight: "600",
  },
  detailsButton: {
    backgroundColor: "transparent",
    color: "#2563eb",
    border: "1px solid #2563eb",
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "all 0.2s",
  },
  bookingMessage: {
    background: "#ffffff",
    padding: "60px 20px",
    borderRadius: "18px",
    textAlign: "center",
    border: "1px solid #e2e8f0",
    boxShadow: "0 10px 30px rgba(0,0,0,0.03)",
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
  messageH3: {
    fontSize: "20px",
    fontWeight: "800",
    color: "#0f172a",
    margin: "12px 0 6px 0",
  },
  messageP: {
    fontSize: "14px",
    color: "#64748b",
    margin: "0",
  },
  loadingSpinner: {
    width: "50px",
    height: "50px",
    border: "4px solid #e2e8f0",
    borderTopColor: "#2563eb",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  errorMessage: {
    borderColor: "#fecaca",
    backgroundColor: "#fffdfd",
  },
  errorIcon: {
    fontSize: "36px",
    marginBottom: "10px",
  },
  retryButton: {
    marginTop: "16px",
    backgroundColor: "#dc2626",
    color: "#ffffff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
  },
  emptyIcon: {
    fontSize: "42px",
    marginBottom: "10px",
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
    maxWidth: "520px",
    borderRadius: "24px",
    boxShadow: "0 25px 60px rgba(0, 0, 0, 0.3)",
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "22px 28px",
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
    padding: "6px 10px",
    borderRadius: "8px",
  },
  modalBody: {
    padding: "28px",
    maxHeight: "65vh",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  modalRouteSummary: {
    backgroundColor: "#f8fafc",
    padding: "16px 18px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
  },
  modalSubLabel: {
    fontSize: "10px",
    fontWeight: "800",
    color: "#64748b",
    display: "block",
    marginBottom: "2px",
  },
  modalRouteVal: {
    fontSize: "14px",
    color: "#0f172a",
    wordBreak: "break-word",
    fontWeight: "700",
  },
  modalInfoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  modalInfoItem: {
    backgroundColor: "#f8fafc",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    fontSize: "13px",
    color: "#64748b",
    fontWeight: "600",
  },
  modalTotalRow: {
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    padding: "16px 18px",
    borderRadius: "12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: "#1e40af",
    fontWeight: "800",
  },
  modalTotalFareVal: {
    fontSize: "20px",
    fontWeight: "800",
  },
  modalFooter: {
    padding: "18px 28px",
    borderTop: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc",
    display: "flex",
    justifyContent: "flex-end",
  },
  modalCloseAction: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "12px 24px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },
};