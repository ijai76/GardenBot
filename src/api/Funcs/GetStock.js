import https from "https"; // Changed from require to import

const options = {
  method: "GET",
  hostname: "growagarden.gg",
  port: null, // HTTPS default port is 443, null is fine as https.request handles it
  path: "/api/ws/stocks.getAll?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D%7D",
  headers: {
    accept: "*/*",
    "accept-language": "en-US,en;q=0.9",
    // 'content-type': 'application/json', // Content-Type is typically for POST/PUT requests with a body
    priority: "u=1, i",
    referer: "https://growagarden.gg/stocks",
    "trpc-accept": "application/json", // Custom header
    "x-trpc-source": "gag", // Custom header
    // It's good practice to add a User-Agent
    "User-Agent": "Node.js HTTPS Client/1.0 (GAG Backend Integration)",
  },
};

function fetchStocks(callback) {
  const req = https.request(options, (res) => {
    const chunks = [];

    // Check for non-2xx status codes early
    if (res.statusCode < 200 || res.statusCode >= 300) {
      let errorBody = '';
      res.on('data', chunk => errorBody += chunk);
      res.on('end', () => {
        callback({
          status: res.statusCode,
          message: `Request failed with status ${res.statusCode}. Body: ${errorBody.substring(0, 200)}`, // Limit error body length
        });
      });
      return; // Don't process further if status indicates an error
    }

    res.on("data", (chunk) => chunks.push(chunk));

    res.on("end", () => {
      const body = Buffer.concat(chunks).toString();
      try {
        const parsedData = JSON.parse(body);
        callback(null, parsedData);
      } catch (err) {
        callback({
          status: 500, // Internal Server Error (parsing issue)
          message: `Invalid JSON response: ${err.message}. Received: ${body.substring(0, 200)}`, // Show part of the body
        });
      }
    });
  });

  req.on("error", (e) => {
    // This typically handles network errors, DNS issues, etc.
    callback({
      status: 502, // Bad Gateway (problem reaching the upstream server)
      message: `Problem with request: ${e.message}`,
    });
  });

  // It's good practice to set a timeout for the request
  req.setTimeout(10000, () => { // 10 seconds timeout
    req.destroy(new Error('Request timed out')); // Destroy the request, will trigger 'error' event
  });

  req.end();
}

function formatStocks(data) {
  // The data structure is an array with one object: data[0]
  // Inside that object: result.data.json
  const stocks = data[0]?.result?.data?.json;

  if (!stocks) {
    // Log the received data structure for easier debugging if it's unexpected
    console.error("Malformed data structure received from API. Data:", JSON.stringify(data, null, 2).substring(0, 500));
    throw new Error("Malformed data structure from upstream API");
  }

  return {
    gearStock: formatStockItems(stocks.gearStock || []),
    eggStock: formatStockItems(stocks.eggStock || []),
    seedsStock: formatStockItems(stocks.seedsStock || []),
    nightStock: formatStockItems(stocks.nightStock || []),
    bloodStock: formatStockItems(stocks.bloodStock || []), // Assuming 'bloodStock' exists or might exist
    cosmeticsStock: formatStockItems(stocks.cosmeticsStock || []),
    lastSeen: {
      Seeds: formatLastSeenItems(stocks.lastSeen?.Seeds || []),
      Gears: formatLastSeenItems(stocks.lastSeen?.Gears || []),
      Weather: formatLastSeenItems(stocks.lastSeen?.Weather || []),
      Eggs: formatLastSeenItems(stocks.lastSeen?.Eggs || []),
    },
  };
}

function formatStockItems(items) {
  if (!Array.isArray(items)) return []; // Ensure items is an array
  return items.map((item) => ({
    name: item.name,
    value: item.value,
    image: item.image,
    emoji: item.emoji,
  }));
}

function formatLastSeenItems(items) {
  if (!Array.isArray(items)) return []; // Ensure items is an array
  return items.map((item) => ({
    name: item.name,
    image: item.image,
    emoji: item.emoji,
    seen: item.seen ? new Date(item.seen).toLocaleString('en-US', { timeZone: 'America/New_York' }) : 'N/A', // Added timezone for consistency
  }));
}

// Export the register function using ES module syntax
export function register(app) {
  app.get("/api/stock/GetStock", (req, res) => {
    fetchStocks((error, data) => {
      if (error) {
        // Log the error server-side for monitoring
        console.error(`[GetStock API] Fetch error: Status ${error.status}, Message: ${error.message}`);
        res.status(error.status || 500).json({
          success: false,
          error: {
            code: error.status || 500,
            message: error.message,
          },
        });
      } else {
        try {
          const formattedStocks = formatStocks(data);
          res.status(200).json({
            success: true,
            ...formattedStocks,
          });
        } catch (err) {
          // This catches errors from formatStocks (e.g., "Malformed data structure")
          console.error(`[GetStock API] Formatting error: ${err.message}`, err.stack);
          res.status(500).json({
            success: false,
            error: {
              code: 500,
              message: `Error processing stock data: ${err.message}`,
            },
          });
        }
      }
    });
  });
}