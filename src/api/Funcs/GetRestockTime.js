// Helper function
function pad(n) {
  return n < 10 ? '0' + n : n;
}

// Main calculation logic
function calculateRestockTimes() {
  const now = new Date();
  const timezone = 'America/New_York'; // Example timezone, consider making this configurable or using client's
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  function formatTime(timestamp) {
    return new Date(timestamp).toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone
    });
  }

  function timeSince(timestamp) {
    const nowMs = Date.now();
    const diff = nowMs - timestamp;

    const seconds = Math.floor(diff / 1000);
    if (seconds < 0) return `in a bit`; // Handle cases where timestamp might be slightly in future due to sync
    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    // Optionally, you can add days, etc.
    return `${hours}h ago`;
  }

  function getResetTimes(baseTime, interval) {
    const nowMs = now.getTime();
    const baseMs = baseTime.getTime(); // Midnight in the specified timezone (effectively)

    // Calculate how many intervals have passed since the base time (midnight)
    const intervalsPassed = Math.floor((nowMs - baseMs) / interval);
    
    const lastReset = baseMs + intervalsPassed * interval;
    const nextReset = lastReset + interval;

    return { lastReset, nextReset };
  }
  
  // For America/New_York, "today" based on server's local time might be different.
  // It's often better to calculate 'today' in the target timezone if precision across DST is critical,
  // but for fixed intervals from a conceptual "start of day", the current approach is common.
  // Using 'today' (which is midnight in server's local time) as base for calculations.
  // If timezone consistency is paramount, you might need a library for robust timezone math.

  const eggInterval = 30 * 60 * 1000; // 30 minutes
  const { lastReset: eggLastReset, nextReset: eggNextReset } = getResetTimes(today, eggInterval);
  const eggCountdownMs = Math.max(0, eggNextReset - now.getTime());
  const eggCountdown = `${pad(Math.floor(eggCountdownMs / 3.6e6))}h ${pad(Math.floor((eggCountdownMs % 3.6e6) / 6e4))}m ${pad(Math.floor((eggCountdownMs % 6e4) / 1000))}s`;

  const gearInterval = 5 * 60 * 1000; // 5 minutes
  const { lastReset: gearLastReset, nextReset: gearNextReset } = getResetTimes(today, gearInterval);
  const gearCountdownMs = Math.max(0, gearNextReset - now.getTime());
  const gearCountdown = `${pad(Math.floor(gearCountdownMs / 6e4))}m ${pad(Math.floor((gearCountdownMs % 6e4) / 1000))}s`;

  const cosmeticInterval = 4 * 3600 * 1000; // 4 hours
  const { lastReset: cosmeticLastReset, nextReset: cosmeticNextReset } = getResetTimes(today, cosmeticInterval);
  const cosmeticCountdownMs = Math.max(0, cosmeticNextReset - now.getTime());
  const cosmeticCountdown = `${pad(Math.floor(cosmeticCountdownMs / 3.6e6))}h ${pad(Math.floor((cosmeticCountdownMs % 3.6e6) / 6e4))}m ${pad(Math.floor((cosmeticCountdownMs % 6e4) / 1000))}s`;

  const nightInterval = 3600 * 1000; // 1 hour
  const { lastReset: nightLastReset, nextReset: nightNextReset } = getResetTimes(today, nightInterval);
  const nightCountdownMs = Math.max(0, nightNextReset - now.getTime());
  const nightCountdown = `${pad(Math.floor(nightCountdownMs / 3.6e6))}h ${pad(Math.floor((nightCountdownMs % 3.6e6) / 6e4))}m ${pad(Math.floor((nightCountdownMs % 6e4) / 1000))}s`;

  return {
    egg: {
      timestamp: eggNextReset,
      countdown: eggCountdown,
      LastRestock: formatTime(eggLastReset),
      timeSinceLastRestock: timeSince(eggLastReset)
    },
    gear: {
      timestamp: gearNextReset,
      countdown: gearCountdown,
      LastRestock: formatTime(gearLastReset),
      timeSinceLastRestock: timeSince(gearLastReset)
    },
    seeds: { // Seeds use the same interval as gear
      timestamp: gearNextReset,
      countdown: gearCountdown,
      LastRestock: formatTime(gearLastReset),
      timeSinceLastRestock: timeSince(gearLastReset)
    },
    cosmetic: {
      timestamp: cosmeticNextReset,
      countdown: cosmeticCountdown,
      LastRestock: formatTime(cosmeticLastReset),
      timeSinceLastRestock: timeSince(cosmeticLastReset)
    },
    nightevent: {
      timestamp: nightNextReset,
      countdown: nightCountdown,
      LastRestock: formatTime(nightLastReset),
      timeSinceLastRestock: timeSince(nightLastReset)
    }
  };
}

// Export the register function using ES module syntax
export function register(app) {
  app.get('/api/stock/restock-time', (req, res) => {
    try {
      const restockTimes = calculateRestockTimes();
      res.json(restockTimes);
    } catch (error) {
      // Log the error on the server for debugging
      console.error("Error calculating restock times:", error);
      res.status(500).json({ error: "Failed to calculate restock times." });
    }
  });
}