import { EmbedBuilder } from "discord.js";
import { readFileSync } from "fs";
import db from "./db/stockDB.js";
import emojiMap from "./utils/emojiMap.js";
import commonItems from "./utils/commonItems.js";

const roleMap = JSON.parse(readFileSync("./src/data/roleMap.json", "utf-8"));

function normalizeName(name) {
  return name.toLowerCase().replace(/\s+/g, "_");
}

function getEmoji(itemId) {
  return emojiMap[itemId] || "📦";
}

function getCurrentStockFromDB() {
  const rows = db.prepare("SELECT * FROM current_stock").all();

  const seedsStock = rows.filter((r) => r.type === "seed");
  const gearStock = rows.filter((r) => r.type === "gear");
  const eggStock = rows.filter((r) => r.type === "egg");

  return {
    seedsStock,
    gearStock,
    eggStock,
  };
}

function updateStockInDB(newStock) {
  const deleteStmt = db.prepare("DELETE FROM current_stock");
  const insertStmt = db.prepare(`
    INSERT INTO current_stock (type, item_id, name, value)
    VALUES (@type, @item_id, @name, @value)
  `);

  const insertMany = db.transaction((stock) => {
    deleteStmt.run(); // Clear old stock

    for (const s of stock.seedsStock || [])
      insertStmt.run({ ...s, type: "seed" });

    for (const g of stock.gearStock || [])
      insertStmt.run({ ...g, type: "gear" });

    for (const e of stock.eggStock || []) insertStmt.run({ ...e, type: "egg" });
  });

  insertMany(newStock);
}

function buildStockEmbed(stock) {
  const seeds = (stock.seedsStock || [])
    .map((item) => `${getEmoji(item.item_id)} **${item.name}** x${item.value}`)
    .join("\n");

  const gear = (stock.gearStock || [])
    .map((item) => `${getEmoji(item.item_id)} **${item.name}** x${item.value}`)
    .join("\n");

  const egg = (stock.eggStock || [])
    .map((item) => `${getEmoji(item.item_id)} **${item.name}** x${item.value}`)
    .join("\n");

  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setAuthor({ name: "🌦️ GardenBot • Grow a Garden Stocks" })
    .addFields(
      { name: "🌱 SEEDS STOCK", value: seeds || "None", inline: true },
      { name: "🛠️ GEAR STOCK", value: gear || "None", inline: true },
      { name: "🐣 EGG STOCK", value: egg || "None", inline: true }
    );
}

function generatePingLine(stock) {
  const allItems = [
    ...(stock.seedsStock || []),
    ...(stock.gearStock || []),
    ...(stock.eggStock || []),
  ];

  const mentions = allItems
    .filter((i) => !commonItems.includes(i.item_id))
    .map((i) => (roleMap[i.item_id] ? `<@&${roleMap[i.item_id]}>` : null))
    .filter(Boolean);

  return mentions.join(" ");
}

function hasStockChanged(newStock, oldStock) {
  return JSON.stringify(newStock) !== JSON.stringify(oldStock);
}

function normalizeIncomingStock(stock) {
  const normalize = (items, type) =>
    (items || []).map((i) => ({
      type,
      item_id: normalizeName(i.name),
      name: i.name,
      value: i.value,
    }));

  return {
    seedsStock: normalize(stock.seedsStock, "seed"),
    gearStock: normalize(stock.gearStock, "gear"),
    eggStock: normalize(stock.eggStock, "egg"),
  };
}

const loadLastStock = getCurrentStockFromDB;
const saveLastStock = updateStockInDB;

export async function checkStockAndNotify(client, channelId, rawNewStock) {
  const newStock = normalizeIncomingStock(rawNewStock);
  const lastStock = loadLastStock();

  if (!hasStockChanged(newStock, lastStock)) return;

  saveLastStock(newStock);

  const channel = await client.channels.fetch(channelId);
  const embed = buildStockEmbed(newStock);
  const pingLine = generatePingLine(newStock);

  await channel.send({ content: pingLine, embeds: [embed] });
}
