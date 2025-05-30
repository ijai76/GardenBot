import express from "express";
import fs from "fs";
import { readdir } from "fs/promises"; // For async directory reading
import path from "path";
import os from "os";
import blessed from "blessed";
import { fileURLToPath } from "url"; // To replicate __dirname
import { pathToFileURL } from "url"; // For dynamic imports

// Replicate __dirname functionality in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, "config.json");
let config = {
  IPWhitelist: false,
  WhitelistedIPs: [],
  Dashboard: true,
  Port: 3000,
};

if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (e) {
    console.error(`Error reading or parsing config.json: ${e.message}`);
    console.log("Using default config and attempting to rewrite config.json.");
    try {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(`Recreated config.json with default settings.`);
    } catch (writeError) {
      console.error(`Failed to write config.json: ${writeError.message}`);
    }
  }
} else {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`Created config.json with default settings.`);
  } catch (writeError) {
    console.error(`Failed to write config.json: ${writeError.message}`);
  }
}

const app = express();
const PORT = config.Port || 3000;

let screen, settingsBox, perfBox, activityBox, consoleBox;

if (config.Dashboard) {
  screen = blessed.screen({
    smartCSR: true,
    title: "GAG Dashboard",
  });

  settingsBox = blessed.box({
    top: 0,
    left: "0%",
    width: "50%",
    height: "20%",
    tags: true,
    border: { type: "line" },
    style: { border: { fg: "cyan" } },
    label: " Settings ",
  });

  perfBox = blessed.box({
    top: 0,
    left: "50%",
    width: "50%",
    height: "20%",
    tags: true,
    border: { type: "line" },
    style: { border: { fg: "magenta" } },
    label: " Performance ",
  });

  activityBox = blessed.box({
    top: "20%",
    left: "0%",
    width: "100%",
    height: "60%",
    tags: true,
    border: { type: "line" },
    scrollable: true,
    alwaysScroll: true,
    style: { border: { fg: "green" } },
    label: " Activity ",
  });

  consoleBox = blessed.box({
    bottom: 0,
    left: "center",
    width: "100%",
    height: "20%",
    tags: true,
    border: { type: "line" },
    scrollable: true,
    alwaysScroll: true,
    style: { border: { fg: "yellow" } },
    label: " Console ",
  });

  screen.append(settingsBox);
  screen.append(perfBox);
  screen.append(activityBox);
  screen.append(consoleBox);
  screen.key(["escape", "q", "C-c"], () => process.exit(0));
  screen.render();
}

const activityLog = [];

// Store original console methods before overriding
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function (...args) {
  const message = args
    .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
    .join(" ");
  if (config.Dashboard && consoleBox) {
    // Check if consoleBox is initialized
    consoleBox.insertBottom(message);
    consoleBox.setScrollPerc(100);
    if (screen) screen.render();
  } else {
    originalConsoleLog.apply(console, args);
  }
};

console.error = function (...args) {
  const message = args
    .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
    .join(" ");
  originalConsoleError.apply(console, args); // Still log to actual stderr
  if (config.Dashboard && consoleBox) {
    // Check if consoleBox is initialized
    consoleBox.insertBottom(`[ERROR] ${message}`);
    consoleBox.setScrollPerc(100);
    if (screen) screen.render();
  }
};

function formatIP(ip) {
  if (typeof ip !== "string") return ip;
  // Example: Simplify ::ffff:192.168.1.1 to 192.168.1.1
  if (ip.startsWith("::ffff:")) return ip.substring(7);
  return ip;
}

function updateSettings() {
  if (config.Dashboard && settingsBox) {
    settingsBox.setContent(
      `IP Whitelisting: ${config.IPWhitelist}\n` +
        `Whitelisted IPs: ${config.WhitelistedIPs.join(", ") || "None"}\n` +
        `Port: ${config.Port}`
    );
  }
}

function updateActivity() {
  if (config.Dashboard && activityBox) {
    activityBox.setContent(activityLog.join("\n"));
    activityBox.setScrollPerc(100);
  }
}

function updatePerf() {
  const mem = process.memoryUsage();
  const usedMemMB = (mem.rss / 1024 / 1024).toFixed(2);
  const loadAvg = os.loadavg();
  const uptimeInSeconds = process.uptime();

  const days = Math.floor(uptimeInSeconds / (24 * 3600));
  const hours = Math.floor((uptimeInSeconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((uptimeInSeconds % 3600) / 60);
  const seconds = Math.floor(uptimeInSeconds % 60);

  const uptime = `${days}d ${hours}h ${minutes}m ${seconds}s`;

  if (config.Dashboard && perfBox) {
    perfBox.setContent(
      `{bold}RAM Usage:{/bold} ${usedMemMB} MB\n` +
        `{bold}CPU Load (1m, 5m, 15m):{/bold} ${loadAvg
          .map((v) => v.toFixed(2))
          .join(", ")}\n` +
        `{bold}Uptime:{/bold} ${uptime}`
    );
    if (screen) screen.render();
  }

  return {
    usedMemMB,
    loadAvg,
    uptime,
  };
}

function updateUI() {
  updateSettings();
  updateActivity();
  if (config.Dashboard && screen) {
    screen.render();
  }
}

// Use console.log defined above for dashboard compatibility
function logConsole(message) {
  console.log(message);
}

logConsole("🚀 Started Host");
if (config.IPWhitelist) {
  logConsole(
    `IP Whitelisting ENABLED. Allowed IPs: ${
      config.WhitelistedIPs.join(", ") || "None"
    }`
  );
} else {
  logConsole(`IP Whitelisting DISABLED.`);
}

const colors = {
  reset: "\x1b[0m",
  timestamp: "\x1b[38;5;15m",
  method: "\x1b[32m",
  path: "\x1b[33m",
  ip: "\x1b[36m",
  error: "\x1b[31m",
};

function formatLogEntry(timestamp, method, pathValue, ip) {
  return `${colors.timestamp}[${timestamp}]${colors.reset} ${colors.method}${method}${colors.reset} ${colors.path}${pathValue}${colors.reset} - ${colors.ip}${ip}${colors.reset}`;
}

app.use((req, res, next) => {
  const rawIp =
    req.headers["x-forwarded-for"] || req.socket.remoteAddress || ""; // req.connection is an alias for req.socket
  const ip = formatIP(rawIp);
  const timestamp = new Date().toISOString();

  const logEntry = formatLogEntry(timestamp, req.method, req.originalUrl, ip);
  activityLog.push(logEntry);

  if (config.IPWhitelist && !config.WhitelistedIPs.includes(ip)) {
    logConsole(`[403] Blocked IP: ${ip}`);
    updateUI();
    return res.status(403).json({ error: "Forbidden" });
  }

  logConsole(logEntry);
  updateUI();
  next();
});

app.get("/status", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

const funcsDir = path.join(__dirname, "Funcs");

// Ensure Funcs directory exists (sync is fine for startup)
if (!fs.existsSync(funcsDir)) {
  try {
    fs.mkdirSync(funcsDir);
    logConsole(`Created Funcs directory at: ${funcsDir}`);
  } catch (dirError) {
    console.error(`Failed to create Funcs directory: ${dirError.message}`);
  }
}

let loadCount = 0;

(async () => {
  try {
    const files = await readdir(funcsDir);
    for (const file of files) {
      if (file.endsWith(".js") || file.endsWith(".mjs")) {
        // Also check for .mjs
        const funcPath = path.join(funcsDir, file);
        const funcPathUrl = pathToFileURL(funcPath).href; // Convert to file URL for import()
        try {
          const funcModule = await import(funcPathUrl);
          if (typeof funcModule.register === "function") {
            funcModule.register(app);
            logConsole(`[Loader] Registered module: ${file}`);
            loadCount++;
          } else if (
            funcModule.default &&
            typeof funcModule.default.register === "function"
          ) {
            // Handle cases like: module.exports = { register: ... } in a CJS module
            funcModule.default.register(app);
            logConsole(
              `[Loader] Registered module (via default export): ${file}`
            );
            loadCount++;
          } else {
            logConsole(`[Loader] No compatible register() export in ${file}`);
          }
        } catch (error) {
          console.error(`[Loader] Error in ${file}: ${error.message}`);
          // console.error(error.stack); // Uncomment for more detailed error stack
        }
      }
    }
  } catch (err) {
    if (err.code === "ENOENT") {
      logConsole(
        `Funcs directory not found at: ${funcsDir}. Skipping module loading.`
      );
    } else {
      console.error(`Failed to read Funcs directory: ${err.message}`);
    }
  }

  app.listen(PORT, () => {
    logConsole(`🚀 Server live at http://localhost:${PORT}`);
    logConsole(`Available endpoints: GET /status`);
    if (loadCount > 0) {
      logConsole(`[Loader] Successfully loaded ${loadCount} module(s).`);
    } else {
      logConsole(`[Loader] No modules loaded from Funcs directory.`);
    }
    updateUI(); // Initial UI update after server starts
  });
})();

if (config.Dashboard) {
  setInterval(() => {
    updatePerf();
  }, 1000);
  // Initial updates
  updatePerf();
  updateSettings();
  updateActivity();
}

export async function startApiServer() {
  // Existing startup logic from (async () => { ... }) wrapped here
  try {
    const files = await readdir(funcsDir);
    for (const file of files) {
      // Module loading logic here
    }

    app.listen(PORT, () => {
      logConsole(`🌐 API Server listening on port ${PORT}`);
    });

    // Initial UI update
    updatePerf();
    updateUI();
    setInterval(updatePerf, 2000); // Update performance every 2s
  } catch (err) {
    console.error("API Server failed to start:", err);
  }
}
