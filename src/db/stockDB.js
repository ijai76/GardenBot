import Database from "better-sqlite3";
import fs from "fs";

if (!fs.existsSync("./src/data")) fs.mkdirSync("./src/data");
const db = new Database("./src/data/stock.sqlite");

// Initialize table
db.exec(`
  CREATE TABLE IF NOT EXISTS current_stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    item_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    quantity INTEGER NOT NULL
  );
`);

export default db;
