import http from "node:http";
import { URL } from "node:url";

const PORT = process.env.PORT || 10000;
const API_KEY = process.env.API_FOOTBALL_KEY;
const API_URL = "https://v3.football.api-sports.io";

if (!API_KEY) {
  console.error("Missing API_FOOTBALL_KEY environment variable.");
}

const cache = new Map();

async function football(endpoint, cacheSeconds = 30) {
  const now = Date.now();
  const saved = cache.get(endpoint);

  if (saved && now - saved.time < cacheSeconds * 1000) {
    return saved.data;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      "x-apisports-key": API_KEY
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || `Football API error: ${response.status}`);
  }

  cache.set(endpoint, {
    time: now,
    data
  });

  return data;
}

function send(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store"
  });

  res.end(JSON.stringify(data));
}

function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos"
  }).format(new Date());
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      });
      return res.end();
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;

    if (path === "/") {
      return send(res, 200, {
        name: "PulseSport API",
        status: "online",
        time: new Date().toISOString()
      });
    }

    if (!API_KEY) {
      return send(res, 500, {
        error: "API_FOOTBALL_KEY is not configured on the server."
      });
    }

    // Today's fixtures
    if (path === "/api/fixtures/today") {
      const data = await football(
        `/fixtures?date=${today()}`,
        60
      );

      return send(res, 200, data);
    }

    // Live matches
    if (path === "/api/live") {
      const data = await football(
        "/fixtures?live=all",
        15
      );

      return send(res, 200, data);
    }

    // Upcoming fixtures
    if (path === "/api/fixtures/upcoming") {
      const date = url.searchParams.get("date");

      if (!date) {
        return send(res, 400, {
          error: "Use ?date=YYYY-MM-DD"
        });
      }

      const data = await football(
        `/fixtures?date=${encodeURIComponent(date)}`,
        300
      );

      return send(res, 200, data);
    }

    // Single match
    if (path.startsWith("/api/match/")) {
      const id = path.split("/").pop();

      if (!/^\d+$/.test(id)) {
        return send(res, 400, { error: "Invalid match ID" });
      }

      const data = await football(
        `/fixtures?id=${id}`,
        30
      );

      return send(res, 200, data);
    }

    // Match events
    if (path.startsWith("/api/match/") && path.endsWith("/events")) {
      const parts = path.split("/");
      const id = parts[3];

      const data = await football(
        `/fixtures/events?fixture=${id}`,
        30
      );

      return send(res, 200, data);
    }

    // Match statistics
    if (path.startsWith("/api/match/") && path.endsWith("/stats")) {
      const parts = path.split("/");
      const id = parts[3];

      const data = await football(
        `/fixtures/statistics?fixture=${id}`,
        60
      );

      return send(res, 200, data);
    }

    // Match lineups
    if (path.startsWith("/api/match/") && path.endsWith("/lineups")) {
      const parts = path.split("/");
      const id = parts[3];

      const data = await football(
        `/fixtures/lineups?fixture=${id}`,
        300
      );

      return send(res, 200, data);
    }

    // Team information
    if (path.startsWith("/api/team/")) {
      const id = path.split("/").pop();

      if (!/^\d+$/.test(id)) {
        return send(res, 400, { error: "Invalid team ID" });
      }

      const data = await football(
        `/teams?id=${id}`,
        3600
      );

      return send(res, 200, data);
    }

    // Team fixtures
    if (path.startsWith("/api/team/") && path.endsWith("/fixtures")) {
      const parts = path.split("/");
      const id = parts[3];
      const season = url.searchParams.get("season");

      if (!season) {
        return send(res, 400, {
          error: "Use ?season=YYYY"
        });
      }

      const data = await football(
        `/fixtures?team=${id}&season=${season}`,
        600
      );

      return send(res, 200, data);
    }

    // H2H
    if (path === "/api/h2h") {
      const team1 = url.searchParams.get("team1");
      const team2 = url.searchParams.get("team2");

      if (!team1 || !team2) {
        return send(res, 400, {
          error: "Use ?team1=ID&team2=ID"
        });
      }

      const data = await football(
        `/fixtures/headtohead?h2h=${team1}-${team2}`,
        1800
      );

      return send(res, 200, data);
    }

    // Standings
    if (path === "/api/standings") {
      const league = url.searchParams.get("league");
      const season = url.searchParams.get("season");

      if (!league || !season) {
        return send(res, 400, {
          error: "Use ?league=LEAGUE_ID&season=YYYY"
        });
      }

      const data = await football(
        `/standings?league=${league}&season=${season}`,
        1800
      );

      return send(res, 200, data);
    }

    // Injuries
    if (path === "/api/injuries") {
      const team = url.searchParams.get("team");
      const season = url.searchParams.get("season");

      if (!team || !season) {
        return send(res, 400, {
          error: "Use ?team=TEAM_ID&season=YYYY"
        });
      }

      const data = await football(
        `/injuries?team=${team}&season=${season}`,
        1800
      );

      return send(res, 200, data);
    }

    return send(res, 404, {
      error: "Route not found"
    });

  } catch (error) {
    console.error(error);

    return send(res, 500, {
      error: "Server error",
      message: error.message
    });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`PulseSport API running on port ${PORT}`);
});
