// bot.js
import { Client, GatewayIntentBits } from "discord.js";
import { updateLastFetchStatus } from "./src/statusTracker.js";
import {
  checkStockAndNotify,
  checkNightBloodStockAndNotify,
} from "./src/checkStock.js";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();
import { startApiServer } from "./src/api/Server.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

const CHANNEL_ID = process.env.CHANNEL_ID;

const fetchLiveStock = async () => {
  const res = await fetch("http://localhost:3000/api/stock/GetStock");
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  const stock = await res.json();
  return stock;
};

const scheduleStockCheck = () => {
  const now = new Date();
  const next = new Date(now);
  next.setMinutes(Math.ceil(now.getMinutes() / 5) * 5);
  next.setSeconds(8);
  next.setMilliseconds(0);

  const delay = next - now;
  setTimeout(
    async () => {
      const bufferMs = 12000;
      await new Promise((r) => setTimeout(r, bufferMs));

      try {
        const stock = await fetchLiveStock();
        await checkStockAndNotify(client, CHANNEL_ID, stock);
        await checkNightBloodStockAndNotify(
          client,
          process.env.NIGHT_BLOOD_CHANNEL_ID,
          stock
        );
        updateLastFetchStatus(true, "Stock fetched and notified.");
      } catch (err) {
        console.error("❌ Error fetching or notifying stock:", err);
        updateLastFetchStatus(false, err.message);
      }

      scheduleStockCheck();
    },
    delay > 0 ? delay : 5 * 60 * 1000
  );
};

const scheduleNightBloodCheck = () => {
  const now = new Date();
  const next = new Date(now);
  next.setHours(now.getHours() + 1);
  next.setMinutes(0);
  next.setSeconds(15); // 15-second grace buffer
  next.setMilliseconds(0);

  const delay = next - now;
  setTimeout(async () => {
    try {
      const stock = await fetchLiveStock();
      await checkNightBloodStockAndNotify(
        client,
        process.env.NIGHT_BLOOD_CHANNEL_ID,
        stock
      );
      updateLastFetchStatus(true, "Night/Blood stock fetched and notified.");
    } catch (err) {
      console.error("❌ Night/Blood stock error:", err);
      updateLastFetchStatus(false, err.message);
    }

    scheduleNightBloodCheck(); // Reschedule for the next hour
  }, delay);
};

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  scheduleStockCheck();
  scheduleNightBloodCheck();
});

client.login(process.env.BOT_TOKEN);

startApiServer();
