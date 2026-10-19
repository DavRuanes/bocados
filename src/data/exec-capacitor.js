// Adaptador de @capacitor-community/sqlite al "executor" de repo.js (Android).
import { CapacitorSQLite, SQLiteConnection } from "@capacitor-community/sqlite";

const DB_NAME = "bocado";

export async function capacitorExecutor() {
  const sqlite = new SQLiteConnection(CapacitorSQLite);
  const consistent = (await sqlite.checkConnectionsConsistency()).result;
  const exists = (await sqlite.isConnection(DB_NAME, false)).result;
  const conn = consistent && exists
    ? await sqlite.retrieveConnection(DB_NAME, false)
    : await sqlite.createConnection(DB_NAME, false, "no-encryption", 1, false);
  await conn.open();

  return {
    async exec(sql) {
      await conn.execute(sql, false);
    },
    async run(sql, params = []) {
      const r = await conn.run(sql, params, false);
      return { lastId: r?.changes?.lastId ?? null };
    },
    async all(sql, params = []) {
      const r = await conn.query(sql, params);
      return r?.values ?? [];
    },
  };
}
