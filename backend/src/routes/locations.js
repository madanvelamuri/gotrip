import express from "express";
import axios from "axios";

const router = express.Router();

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
CALCULATE REAL MAP DISTANCE (No Demo KM)
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

    // Query OSRM routing engine for precise road driving distance
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origCoords.lng},${origCoords.lat};${destCoords.lng},${destCoords.lat}?overview=false`;

    const osrmResponse = await axios.get(osrmUrl);
    const routeData = osrmResponse.data;

    if (routeData.code === "Ok" && routeData.routes && routeData.routes.length > 0) {
      const distanceMeters = routeData.routes[0].distance;
      const distanceKm = Math.round(distanceMeters / 1000);
      
      return res.json({
        success: true,
        distanceKm
      });
    }

    return res.status(400).json({ message: "Could not calculate route distance between these points." });

  } catch (error) {
    console.error("Routing calculation error:", error.message);
    return res.status(500).json({ message: "Server error while calculating route." });
  }
});

export default router;