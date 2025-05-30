import db from "./stockDB.js";

export function loadBloodStock() {
  const rows = db.prepare("SELECT * FROM blood_stock").all();
  return {
    seedsStock: rows.filter((r) => r.type === "seed"),
    gearStock: rows.filter((r) => r.type === "gear"),
    eggStock: rows.filter((r) => r.type === "egg"),
  };
}

export function saveBloodStock(stock) {
  const deleteStmt = db.prepare("DELETE FROM blood_stock");
  const insertStmt = db.prepare(`
    INSERT INTO blood_stock (type, item_id, name, value)
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
