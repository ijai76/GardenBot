const fs = require("fs");
const { EmbedBuilder } = require("discord.js");
const emojiMap = require("./utils/emojiMap");
const roleMap = require("./data/roleMap.json");

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

  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setAuthor({ name: "🌦️ GardenBot • Grow a Garden Stocks" })
    .addFields(
      { name: "🌱 SEEDS STOCK", value: seed || "None", inline: true },
      { name: "🛠️ GEAR STOCK", value: gear || "None", inline: true }
    )
    .setFooter({ text: "https://imgur.com/" });
}

function generatePingLine(stock) {
  const allItems = [...stock.seed_stock, ...stock.gear_stock];
  const commonItems = require("./utils/commonItems");

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

module.exports = {
  checkStockAndNotify: async (client, channelId, newStock) => {
    const lastStock = loadLastStock();
    if (!hasStockChanged(newStock, lastStock)) return;

    const channel = await client.channels.fetch(channelId);
    const embed = buildStockEmbed(newStock);
    const pingLine = generatePingLine(newStock);

    await channel.send({ content: pingLine, embeds: [embed] });
    saveLastStock(newStock);
  },
};
