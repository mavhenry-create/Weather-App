const path = require("path");
const express = require("express");
require("dotenv").config();
const { apiLimiter } = require("./middleware/rateLimiter");
const { cacheMiddleware } = require("./middleware/routeCache");

const app = express();
const port = process.env.PORT || 3000; // Use PORT from environment or default to 3000
const API_KEY = process.env.API_KEY; // Grabs the API key from environment variables, which should be set in the .env file for security and flexibility
const BASE_URL =
  process.env.BASE_URL || "https://www.meteosource.com/api/v1/free";

if (!API_KEY) {
  console.warn(
    "Missing API_KEY.",
  );
}

app.use(express.static(path.join(__dirname)));
app.use("/api", apiLimiter);

async function fetchMeteosource(endpoint, params) {
  const url = new URL(`${BASE_URL}/${endpoint}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  url.searchParams.set("key", API_KEY || "");

  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Meteosource request failed (${response.status}): ${body}`);
  }

  return response.json();
}

app.get("/api/suggestions", cacheMiddleware, async (req, res) => {
  const query = (req.query.q || "").trim();

  if (query.length < 2) {
    return res
      .status(400)
      .json({ error: "Query must be at least 2 characters." });
  }

  try {
    const suggestions = await fetchMeteosource("find_places_prefix", {
      text: query,
    });
    return res.json(suggestions);
  } catch (error) {
    console.error("/api/suggestions error:", error.message);
    return res.status(502).json({ error: "Failed to fetch suggestions." });
  }
});

app.get("/api/places", cacheMiddleware, async (req, res) => {
  const query = (req.query.query || "").trim();

  if (!query) {
    return res.status(400).json({ error: "query is required." });
  }

  try {
    const places = await fetchMeteosource("find_places", { text: query });
    return res.json(places);
  } catch (error) {
    console.error("/api/places error:", error.message);
    return res.status(502).json({ error: "Failed to fetch places." });
  }
});

app.get("/api/weather", cacheMiddleware, async (req, res) => {
  const placeId = (req.query.placeId || "").trim();

  if (!placeId) {
    return res.status(400).json({ error: "placeId is required." });
  }

  try {
    const weather = await fetchMeteosource("point", {
      place_id: placeId,
      sections: "daily,current",
      language: "en",
      units: "auto",
    });
    return res.json(weather);
  } catch (error) {
    console.error("/api/weather error:", error.message);
    return res.status(502).json({ error: "Failed to fetch weather." });
  }
});

app.listen(port, () => {
  console.log(`Weather app server running on http://localhost:${port}`);
});
