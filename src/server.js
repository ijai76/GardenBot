// src/server.js
import server from "server";
import { getLastFetchStatus } from "./statusTracker.js";
const { get, post } = server.router;

export function startStatusServer(port = 8080) {
  server({ port }, [
    get("/", () => {
      const status = getLastFetchStatus();
      return {
        status: status.success ? "✅ Success" : "❌ Failure",
        time: status.time,
        message: status.message,
      };
    }),
    post("/", () => "ok"),
  ]);
}
