let lastFetch = {
  time: null,
  success: null,
  message: "Not fetched yet.",
};

export function updateLastFetchStatus(success, message = "") {
  lastFetch = {
    time: new Date().toISOString(),
    success,
    message: message || (success ? "Stock updated." : "Fetch failed."),
  };
}

export function getLastFetchStatus() {
  return lastFetch;
}
