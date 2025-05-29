// bot.js
import { Client, GatewayIntentBits } from "discord.js";
import { updateLastFetchStatus } from "./src/statusTracker.js";
import { checkStockAndNotify } from "./src/checkStock.js";
import { startStatusServer } from "./src/server.js";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

const CHANNEL_ID = process.env.CHANNEL_ID;

const fetchLiveStock = async () => {
  const res = await fetch("https://api.joshlei.com/v1/growagarden/stock");
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
      const bufferMs = 10000; // 5-second buffer to avoid premature fetching
      await new Promise((r) => setTimeout(r, bufferMs));

      try {
        const stock = await fetchLiveStock();
        await checkStockAndNotify(client, CHANNEL_ID, stock);
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

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  scheduleStockCheck();
});

client.login(process.env.BOT_TOKEN);

startStatusServer(8080);
