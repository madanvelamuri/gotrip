import express from "express";
import axios from "axios";

const router = express.Router();

// Helper to calculate straight-line distance using Haversine formula as a reliable fallback
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in KM
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightLineKm = R * c;
  // Apply a 1.25 road-winding factor for realistic driving distance approximation
  return Math.round(straightLineKm * 1.25);
}

// Helper to get exact coordinates for any Indian village, town, city, or state
async function getCoords(locationName) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&format=json&countrycodes=in&limit=1`;
    const response = await axios.get(url, {
      headers: { "User-Agent": "GoTripCabBookingApp/1.0" }
    });
    
    if (response.data && response.data.length > 0) {
      return {
        lat: parseFloat(response.data[0].lat),
        lng: parseFloat(response.data[0].lon)
      };
    }
    return null;
  } catch (error) {
    console.error("Geocoding lookup error:", error.message);
    return null;
  }
}

/*
========================================
CALCULATE REAL MAP DISTANCE (With Fallback)
========================================
*/
router.post("/calculate-distance", async (req, res) => {
  try {
    const { origin, destination } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({ 
        message: "Origin and destination are required." 
      });
    }

    // Fetch precise coordinates for origin and destination
    const origCoords = await getCoords(origin);
    const destCoords = await getCoords(destination);

    if (!origCoords || !destCoords) {
      return res.status(400).json({ 
        message: "Could not map one or more locations. Please select valid places in India." 
      });
    }

    let distanceKm = null;

    // Try querying OSRM routing engine first
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origCoords.lng},${origCoords.lat};${destCoords.lng},${destCoords.lat}?overview=false`;
      const osrmResponse = await axios.get(osrmUrl, { timeout: 5000 });
      const routeData = osrmResponse.data;

      if (routeData.code === "Ok" && routeData.routes && routeData.routes.length > 0) {
        const distanceMeters = routeData.routes[0].distance;
        distanceKm = Math.round(distanceMeters / 1000);
      }
    } catch (osrmErr) {
      console.warn("OSRM routing engine timeout or unavailable, using Haversine calculation fallback:", osrmErr.message);
    }

    // Fallback if OSRM didn't return a route
    if (!distanceKm || distanceKm <= 0) {
      distanceKm = calculateHaversineDistance(origCoords.lat, origCoords.lng, destCoords.lat, destCoords.lng);
    }

    // Ensure minimum distance of at least 1 KM if points are extremely close
    if (distanceKm < 1) {
      distanceKm = 1;
    }

    return res.json({
      success: true,
      distanceKm
    });

  } catch (error) {
    console.error("Routing calculation error:", error.message);
    return res.status(500).json({ message: "Server error while calculating route distance." });
  }
});

export default router;