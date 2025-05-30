import db from "./src/db/stockDB.js";

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS night_stock (
    type TEXT,
    item_id TEXT,
    name TEXT,
    value INTEGER
  )
`
).run();

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS blood_stock (
    type TEXT,
    item_id TEXT,
    name TEXT,
    value INTEGER
  )
`
).run();

console.log("✅ Night and Blood stock tables created!");
