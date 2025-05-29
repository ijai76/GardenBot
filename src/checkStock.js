import { EmbedBuilder } from "discord.js";
import { readFileSync } from "fs";
import db from "./db/stockDB.js";
import emojiMap from "./utils/emojiMap.js";
import commonItems from "./utils/commonItems.js";
const roleMap = JSON.parse(readFileSync("./src/data/roleMap.json", "utf-8"));

function getEmoji(itemId) {
  return emojiMap[itemId] || "📦";
}

function getCurrentStockFromDB() {
  const rows = db.prepare("SELECT * FROM current_stock").all();

  const seed_stock = rows.filter((r) => r.type === "seed");
  const gear_stock = rows.filter((r) => r.type === "gear");
  const egg_stock = rows.filter((r) => r.type === "egg");

  return {
    seed_stock,
    gear_stock,
    egg_stock,
  };
}

function updateStockInDB(newStock) {
  const deleteStmt = db.prepare("DELETE FROM current_stock");
  const insertStmt = db.prepare(`
    INSERT INTO current_stock (type, item_id, display_name, quantity)
    VALUES (@type, @item_id, @display_name, @quantity)
  `);

  const insertMany = db.transaction((stock) => {
    deleteStmt.run(); // Clear old stock

    for (const s of stock.seed_stock) insertStmt.run({ ...s, type: "seed" });

    for (const g of stock.gear_stock) insertStmt.run({ ...g, type: "gear" });

    for (const e of stock.egg_stock) insertStmt.run({ ...e, type: "egg" });
  });

  insertMany(newStock);
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
    );
}

function generatePingLine(stock) {
  const allItems = [
    ...stock.seed_stock,
    ...stock.gear_stock,
    ...stock.egg_stock,
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

const loadLastStock = getCurrentStockFromDB;
const saveLastStock = updateStockInDB;

export async function checkStockAndNotify(client, channelId, newStock) {
  const lastStock = loadLastStock();
  if (!hasStockChanged(newStock, lastStock)) return;

  // Save new stock immediately.
  saveLastStock(newStock);

  const channel = await client.channels.fetch(channelId);
  const embed = buildStockEmbed(newStock);
  const pingLine = generatePingLine(newStock);

  await channel.send({ content: pingLine, embeds: [embed] });
}
