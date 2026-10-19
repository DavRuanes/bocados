// Base de datos de Bocado. Un único conjunto de SQL que funciona igual con
// SQLite nativo (Android) y con sql.js (tests y vista previa en el navegador).
// Un "executor" expone: exec(sql), run(sql, params) -> {lastId}, all(sql, params) -> rows.

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS profile (
     id INTEGER PRIMARY KEY CHECK (id = 1),
     data TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS entries (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     date TEXT NOT NULL,
     meal TEXT NOT NULL,
     name TEXT NOT NULL,
     grams REAL NOT NULL DEFAULT 0,
     kcal REAL NOT NULL DEFAULT 0,
     prot REAL,
     hc REAL,
     grasa REAL,
     source TEXT NOT NULL,
     detail TEXT,
     created_at TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS entries_date ON entries(date)`,
  `CREATE TABLE IF NOT EXISTS day_targets (
     date TEXT PRIMARY KEY,
     target INTEGER NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS settings (
     key TEXT PRIMARY KEY,
     value TEXT
   )`,
];

const ENTRY_COLS = "id, date, meal, name, grams, kcal, prot, hc, grasa, source, detail";
const EDITABLE = ["meal", "name", "grams", "kcal", "prot", "hc", "grasa", "detail"];

function rowToEntry(r) {
  let detail = null;
  try { detail = r.detail ? JSON.parse(r.detail) : null; } catch { detail = null; }
  return { ...r, detail };
}

const numOrNull = (v) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v));

export async function createRepo(db) {
  for (const s of SCHEMA) await db.exec(s);
  const now = () => new Date().toISOString();

  return {
    async getProfile() {
      const rows = await db.all("SELECT data FROM profile WHERE id = 1");
      return rows.length ? JSON.parse(rows[0].data) : null;
    },

    async saveProfile(p) {
      await db.run(
        "INSERT INTO profile (id, data, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
        [JSON.stringify(p), now()]
      );
    },

    async addEntry(e) {
      const r = await db.run(
        "INSERT INTO entries (date, meal, name, grams, kcal, prot, hc, grasa, source, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [e.date, e.meal, String(e.name), Number(e.grams) || 0, Number(e.kcal) || 0,
          numOrNull(e.prot), numOrNull(e.hc), numOrNull(e.grasa), e.source,
          e.detail ? JSON.stringify(e.detail) : null, now()]
      );
      return r.lastId;
    },

    async updateEntry(id, patch) {
      const keys = EDITABLE.filter((k) => k in patch);
      if (!keys.length) return;
      const values = keys.map((k) => (k === "detail" ? JSON.stringify(patch.detail) : patch[k]));
      await db.run(`UPDATE entries SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE id = ?`, [...values, id]);
    },

    async deleteEntry(id) {
      await db.run("DELETE FROM entries WHERE id = ?", [id]);
    },

    async entriesForDate(date) {
      const rows = await db.all(`SELECT ${ENTRY_COLS} FROM entries WHERE date = ? ORDER BY id`, [date]);
      return rows.map(rowToEntry);
    },

    async setDayTarget(date, target) {
      await db.run(
        "INSERT INTO day_targets (date, target) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET target = excluded.target",
        [date, Math.round(target)]
      );
    },

    async daySummaries(limit = 60) {
      const profile = await this.getProfile();
      const fallback = profile?.target ?? null;
      const rows = await db.all(
        `SELECT e.date AS date, SUM(e.kcal) AS kcal, COUNT(*) AS count, t.target AS target
           FROM entries e LEFT JOIN day_targets t ON t.date = e.date
          GROUP BY e.date ORDER BY e.date DESC LIMIT ?`,
        [limit]
      );
      return rows.map((r) => ({ date: r.date, kcal: Math.round(r.kcal), count: r.count, target: r.target ?? fallback }));
    },

    async getSetting(key) {
      const rows = await db.all("SELECT value FROM settings WHERE key = ?", [key]);
      return rows.length ? rows[0].value : null;
    },

    async setSetting(key, value) {
      await db.run(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [key, value]
      );
    },
  };
}
