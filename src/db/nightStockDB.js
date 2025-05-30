import db from "./stockDB.js";

export function loadNightStock() {
  const rows = db.prepare("SELECT * FROM night_stock").all();
  return {
    seedsStock: rows.filter((r) => r.type === "seed"),
    gearStock: rows.filter((r) => r.type === "gear"),
    eggStock: rows.filter((r) => r.type === "egg"),
  };
}

export function saveNightStock(stock) {
  const deleteStmt = db.prepare("DELETE FROM night_stock");
  const insertStmt = db.prepare(`
    INSERT INTO night_stock (type, item_id, name, value)
    VALUES (@type, @item_id, @name, @value)
  `);

  const tx = db.transaction(() => {
    deleteStmt.run();
    stock.seedsStock.forEach((s) => insertStmt.run({ ...s, type: "seed" }));
    stock.gearStock.forEach((g) => insertStmt.run({ ...g, type: "gear" }));
    stock.eggStock.forEach((e) => insertStmt.run({ ...e, type: "egg" }));
  });

  tx();
}
