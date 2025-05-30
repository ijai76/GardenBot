import https from "https";

function processTimestamps(obj) {
  if (typeof obj !== 'object' || obj === null) return;

  for (const key of Object.keys(obj)) {
    const val = obj[key];

    if (val && typeof val === 'object' && 'timestamp' in val && typeof val.timestamp === 'string') {
      const originalTimestamp = val.timestamp;
      const numericTimestamp = new Date(originalTimestamp).getTime();
      obj[key] = {
        ...val,
        timestamp: numericTimestamp,
        LastSeen: originalTimestamp
      };
    } else if (val && typeof val === 'object') {
      processTimestamps(val);
    }
  }
}

function fetchWeather(callback) {
  const options = {
    method: "GET",
    hostname: "growagarden.gg",
    path: "/api/v1/weather/gag",
    headers: {
      accept: "*/*",
      "accept-language": "en-US,en;q=0.9",
      priority: "u=1, i",
      referer: "https://growagarden.gg/weather",
      "Content-Length": "0"
    }
  };

  const req = https.request(options, (res) => {
    const chunks = [];

    res.on("data", (chunk) => chunks.push(chunk));

    res.on("end", () => {
      const body = Buffer.concat(chunks).toString();
      try {
        const weatherData = JSON.parse(body);
        processTimestamps(weatherData);
        callback(null, { success: true, ...weatherData });
      } catch (e) {
        callback({ status: 500, message: "Failed to parse weather data" });
      }
    });
  });

  req.on("error", (err) => {
    callback({ status: 500, message: err.message });
  });

  req.end();
}

function register(app) {
  app.get("/api/GetWeather", (req, res) => {
    fetchWeather((error, result) => {
      if (error) {
        res.status(error.status || 500).json({ success: false, error: error.message });
      } else {
        res.json(result);
      }
    });
  });
}

export { register };
