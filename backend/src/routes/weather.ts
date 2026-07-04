import { Router } from "express";
import axios from "axios";

const router = Router();

// GET /api/weather?lat=&lng= - forecast for an event's location, used on
// the event detail page. Open-Meteo requires no API key, which keeps this
// working out of the box; swap the URL below to another provider if needed.
router.get("/", async (req, res, next) => {
  try {
    const { lat, lng } = req.query as Record<string, string>;
    if (!lat || !lng) return res.status(400).json({ error: "lat and lng are required" });

    const { data } = await axios.get("https://api.open-meteo.com/v1/forecast", {
      params: {
        latitude: lat,
        longitude: lng,
        current: "temperature_2m,weather_code,wind_speed_10m",
        daily: "temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max",
        timezone: "auto",
        forecast_days: 7,
      },
      timeout: 8000,
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
