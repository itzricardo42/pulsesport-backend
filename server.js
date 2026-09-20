const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_FOOTBALL_KEY;

const API_BASE = "https://v3.football.api-sports.io";

console.log("PulseSport starting...");
console.log("API key connected:", !!API_KEY);

async function footballAPI(endpoint) {
  if (!API_KEY) {
    throw new Error("API_FOOTBALL_KEY is not connected on Render");
  }

  const response = await fetch(API_BASE + endpoint, {
    headers: {
      "x-apisports-key": API_KEY
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.errors?.message ||
      "API-Football request failed"
    );
  }

  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(JSON.stringify(data.errors));
  }

  return data;
}


/* HOME / SERVER TEST */

app.get("/", (req, res) => {
  res.json({
    name: "PulseSport Backend",
    status: "online",
    apiKeyConnected: !!API_KEY
  });
});


/* TODAY */

app.get("/api/fixtures/today", async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const data = await footballAPI(
      `/fixtures?date=${today}`
    );

    res.json(data);

  } catch (error) {
    console.error("Today error:", error.message);

    res.status(500).json({
      error: error.message
    });
  }
});


/* FIXTURES BY DATE */

app.get("/api/fixtures/upcoming", async (req, res) => {
  try {
    const date = req.query.date;

    if (!date) {
      return res.status(400).json({
        error: "Date is required"
      });
    }

    const data = await footballAPI(
      `/fixtures?date=${encodeURIComponent(date)}`
    );

    res.json(data);

  } catch (error) {
    console.error("Date error:", error.message);

    res.status(500).json({
      error: error.message
    });
  }
});


/* LIVE MATCHES */

app.get("/api/live", async (req, res) => {
  try {
    const data = await footballAPI(
      "/fixtures?live=all"
    );

    res.json(data);

  } catch (error) {
    console.error("Live error:", error.message);

    res.status(500).json({
      error: error.message
    });
  }
});


/* MATCH DETAILS */

app.get("/api/match/:id", async (req, res) => {
  try {
    const data = await footballAPI(
      `/fixtures?id=${encodeURIComponent(req.params.id)}`
    );

    res.json(data);

  } catch (error) {
    console.error("Match error:", error.message);

    res.status(500).json({
      error: error.message
    });
  }
});


/* MATCH STATISTICS */

app.get("/api/match/:id/stats", async (req, res) => {
  try {
    const data = await footballAPI(
      `/fixtures/statistics?fixture=${encodeURIComponent(req.params.id)}`
    );

    res.json(data);

  } catch (error) {
    console.error("Stats error:", error.message);

    res.status(500).json({
      error: error.message
    });
  }
});


/* MATCH LINEUPS */

app.get("/api/match/:id/lineups", async (req, res) => {
  try {
    const data = await footballAPI(
      `/fixtures/lineups?fixture=${encodeURIComponent(req.params.id)}`
    );

    res.json(data);

  } catch (error) {
    console.error("Lineups error:", error.message);

    res.status(500).json({
      error: error.message
    });
  }
});


/* HEAD TO HEAD */

app.get("/api/h2h", async (req, res) => {
  try {
    const { team1, team2 } = req.query;

    if (!team1 || !team2) {
      return res.status(400).json({
        error: "team1 and team2 are required"
      });
    }

    const data = await footballAPI(
      `/fixtures/headtohead?h2h=${encodeURIComponent(team1)}-${encodeURIComponent(team2)}`
    );

    res.json(data);

  } catch (error) {
    console.error("H2H error:", error.message);

    res.status(500).json({
      error: error.message
    });
  }
});


/* 404 */

app.use((req, res) => {
  res.status(404).json({
    error: "PulseSport route not found"
  });
});


/* START */

app.listen(PORT, () => {
  console.log(`PulseSport running on port ${PORT}`);
});
