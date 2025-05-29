import { Client, GatewayIntentBits } from "discord.js";
import { checkStockAndNotify } from "./checkStock.js";
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
  next.setSeconds(0);
  next.setMilliseconds(100);

  const delay = next - now;
  setTimeout(
    async () => {
      try {
        const stock = await fetchLiveStock();
        await checkStockAndNotify(client, CHANNEL_ID, stock);
      } catch (err) {
        console.error("❌ Error fetching or notifying stock:", err);
      }
      scheduleStockCheck(); // 🔁 Reschedule
    },
    delay > 0 ? delay : 5 * 60 * 1000
  ); // Fallback
};

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  scheduleStockCheck();
});

client.login(process.env.BOT_TOKEN);

import server from "server";
const { get, post } = server.router;

server({ port: 8080 }, [
  get("/", (ctx) => "200 OK"),
  post("/", (ctx) => {
    return "ok";
  }),
]);
