import { useState, useRef, useEffect } from "react";
import axios from "axios";

// Fallback popular locations to ensure instant suggestions if Nominatim rate-limits (429)
const POPULAR_LOCATIONS = [
  "Bengaluru, Karnataka, India",
  "Chennai, Tamil Nadu, India",
  "Hyderabad, Telangana, India",
  "Mumbai, Maharashtra, India",
  "New Delhi, Delhi, India",
  "Pune, Maharashtra, India",
  "Kolkata, West Bengal, India",
  "Hosur, Krishnagiri, Tamil Nadu, India",
  "Kavali, Sri Potti Sriramulu Nellore, Andhra Pradesh, India"
];

export default function LocationInput({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  currentLocationOnly = false, 
  showCurrentLocation = true 
}) {
  const [query, setQuery] = useState(value || "");
  const [isOpen, setIsOpen] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [onlineSuggestions, setOnlineSuggestions] = useState([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  
  const wrapperRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch precise locations in India matching user typing with rate-limit protection
  useEffect(() => {
    if (currentLocationOnly || !query.trim() || query.length < 2) {
      setOnlineSuggestions([]);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSearchingOnline(true);
        const response = await axios.get(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=in&limit=5`,
          { headers: { "User-Agent": "GoTripCabBookingApp/2.0" }, timeout: 3500 }
        );

        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          const formattedLocations = response.data.map((item) => item.display_name);
          setOnlineSuggestions([...new Set(formattedLocations)]);
        } else {
          // Fallback to filtering popular locations if API returns empty
          const filtered = POPULAR_LOCATIONS.filter(loc => loc.toLowerCase().includes(query.toLowerCase()));
          setOnlineSuggestions(filtered);
        }
      } catch (error) {
        // Fallback gracefully on 429 rate-limit or network timeout
        const filtered = POPULAR_LOCATIONS.filter(loc => loc.toLowerCase().includes(query.toLowerCase()));
        setOnlineSuggestions(filtered.length > 0 ? filtered : [query + ", India"]);
      } finally {
        setIsSearchingOnline(false);
      }
    }, 400);

  }, [query, currentLocationOnly]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    setIsOpen(true);
  };

  const handleSelectLocation = (loc) => {
    setQuery(loc);
    onChange(loc);
    setIsOpen(false);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const response = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { "User-Agent": "GoTripCabBookingApp/2.0" }, timeout: 4000 }
          );

          const detectedPlace = response.data?.display_name || "Current Location";
          setQuery(detectedPlace);
          onChange(detectedPlace);
          setIsOpen(false);
        } catch (error) {
          console.error("Reverse geocoding error:", error);
          const fallbackCoordsText = `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
          setQuery(fallbackCoordsText);
          onChange(fallbackCoordsText);
          setIsOpen(false);
        } finally {
          setLoadingLocation(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Unable to retrieve your location. Please check browser permissions.");
        setLoadingLocation(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div style={styles.wrapper} ref={wrapperRef}>
      {label && <label style={styles.label}>{label}</label>}
      
      <div style={styles.inputContainer}>
        <span style={styles.icon}>📍</span>
        <input
          type="text"
          style={styles.input}
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder || "Enter location or address..."}
          autoComplete="off"
        />
      </div>

      {isOpen && (
        <ul style={styles.dropdown}>
          {showCurrentLocation && (
            <>
              <li
                style={styles.currentLocationItem}
                onClick={handleUseCurrentLocation}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#eff6ff")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
              >
                <span style={styles.gpsIcon}>🎯</span>
                <span>{loadingLocation ? "Detecting current coordinates..." : "Use Current GPS Location"}</span>
              </li>
              
              {!currentLocationOnly && <div style={styles.divider}></div>}
            </>
          )}

          {!currentLocationOnly && (
            isSearchingOnline ? (
              <li style={styles.loadingItem}>Searching locations...</li>
            ) : onlineSuggestions.length > 0 ? (
              onlineSuggestions.map((item, index) => (
                <li
                  key={index}
                  style={styles.dropdownItem}
                  onClick={() => handleSelectLocation(item)}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
                >
                  📍 {item}
                </li>
              ))
            ) : query.length >= 2 ? (
              <li
                style={styles.dropdownItem}
                onClick={() => handleSelectLocation(query)}
              >
                📍 Use custom address: "{query}"
              </li>
            ) : (
              <li style={styles.noResultItem}>Type any city, town, or address...</li>
            )
          )}
        </ul>
      )}
    </div>
  );
}

const styles = {
  wrapper: { position: "relative", width: "100%" },
  label: { display: "block", fontSize: "13px", fontWeight: "700", color: "#334155", marginBottom: "6px" },
  inputContainer: { position: "relative", display: "flex", alignItems: "center" },
  icon: { position: "absolute", left: "14px", fontSize: "14px", color: "#64748b" },
  input: {
    width: "100%", height: "48px", padding: "0 14px 0 40px",
    border: "1px solid #cbd5e1", borderRadius: "10px", fontSize: "14px",
    color: "#1e293b", outline: "none", backgroundColor: "#f8fafc", boxSizing: "border-box", fontWeight: "500"
  },
  dropdown: {
    position: "absolute", top: "calc(100% + 4px)", left: 0, width: "100%",
    maxHeight: "260px", overflowY: "auto", backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0", borderRadius: "10px", boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)",
    listStyle: "none", padding: "4px 0", margin: "0", zIndex: 99
  },
  currentLocationItem: {
    padding: "12px 16px", fontSize: "14px", fontWeight: "700", color: "#2563eb",
    backgroundColor: "#f8fafc", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px"
  },
  gpsIcon: { fontSize: "15px" },
  divider: { height: "1px", backgroundColor: "#e2e8f0", margin: "2px 0" },
  dropdownItem: { padding: "10px 16px", fontSize: "13px", color: "#334155", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" },
  loadingItem: { padding: "12px 16px", fontSize: "13px", color: "#64748b", textAlign: "center" },
  noResultItem: { padding: "12px 16px", fontSize: "13px", color: "#94a3b8", textAlign: "center" }
};