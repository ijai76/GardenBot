import fs from "fs";
import { EmbedBuilder } from "discord.js";
import emojiMap from "./utils/emojiMap.js";
import { readFileSync } from 'fs';
const roleMap = JSON.parse(readFileSync('./data/roleMap.json', 'utf-8'));
import commonItems from "./utils/commonItems.js";

function getEmoji(itemId) {
  return emojiMap[itemId] || "📦";
}

function buildStockEmbed(stock) {
  const seed = stock.seed_stock
    .map(
      (item) =>
        `${getEmoji(item.item_id)} **${item.display_name}** x${item.quantity}`
    )
    .join("\n");

  const gear = stock.gear_stock
    .map(
      (item) =>
        `${getEmoji(item.item_id)} **${item.display_name}** x${item.quantity}`
    )
    .join("\n");
  
    const egg = stock.egg_stock
    .map(
      (item) =>
        `${getEmoji(item.item_id)} **${item.display_name}** x${item.quantity}`
    )
    .join("\n");

  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setAuthor({ name: "🌦️ GardenBot • Grow a Garden Stocks" })
    .addFields(
      { name: "🌱 SEEDS STOCK", value: seed || "None", inline: true },
      { name: "🛠️ GEAR STOCK", value: gear || "None", inline: true },
      { name: "🐣 EGG STOCK", value: egg || "None", inline: true }
    )
}

function generatePingLine(stock) {
  const allItems = [...stock.seed_stock, ...stock.gear_stock, ...stock.egg_stock];

  const mentions = allItems
    .filter((i) => !commonItems.includes(i.item_id))
    .map((i) => (roleMap[i.item_id] ? `<@&${roleMap[i.item_id]}>` : null))
    .filter(Boolean);

  return mentions.join(" ");
}

function hasStockChanged(newStock, oldStock) {
  return JSON.stringify(newStock) !== JSON.stringify(oldStock);
}

function loadLastStock() {
  if (!fs.existsSync("./data/lastStock.json")) return null;
  return JSON.parse(fs.readFileSync("./data/lastStock.json", "utf-8"));
}

function saveLastStock(stock) {
  fs.writeFileSync("./data/lastStock.json", JSON.stringify(stock, null, 2));
}

export async function checkStockAndNotify(client, channelId, newStock) {
  const lastStock = loadLastStock();
  if (!hasStockChanged(newStock, lastStock)) return;

  const channel = await client.channels.fetch(channelId);
  const embed = buildStockEmbed(newStock);
  const pingLine = generatePingLine(newStock);

  await channel.send({ content: pingLine, embeds: [embed] });
  saveLastStock(newStock);
}
