// Adaptador de sql.js al "executor" de repo.js (tests y vista previa en navegador).
export function sqlJsExecutor(db) {
  return {
    async exec(sql) {
      db.run(sql);
    },
    async run(sql, params = []) {
      db.run(sql, params);
      const res = db.exec("SELECT last_insert_rowid() AS id");
      return { lastId: res[0]?.values[0][0] ?? null };
    },
    async all(sql, params = []) {
      const stmt = db.prepare(sql);
      try {
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        return rows;
      } finally {
        stmt.free();
      }
    },
  };
}
