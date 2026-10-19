import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createRepo } from "../src/data/repo.js";
import { sqlJsExecutor } from "../src/data/exec-sqljs.js";

const require = createRequire(import.meta.url);
const initSqlJs = require("sql.js");
let repo;

beforeEach(async () => {
  const SQL = await initSqlJs();
  repo = await createRepo(sqlJsExecutor(new SQL.Database()));
});

const profile = { goal: "perder", sex: "mujer", age: 31, heightCm: 168, weightKg: 72.5, activity: "ligero", pace: "medio", target: 1520 };

test("a fresh database has no profile", async () => {
  assert.equal(await repo.getProfile(), null);
});

test("saveProfile stores and replaces the single profile", async () => {
  await repo.saveProfile(profile);
  assert.deepEqual(await repo.getProfile(), profile);
  await repo.saveProfile({ ...profile, weightKg: 71 });
  assert.equal((await repo.getProfile()).weightKg, 71);
});

const entry = (over = {}) => ({
  date: "2026-10-19", meal: "comida", name: "Lentejas", grams: 300, kcal: 351, prot: 27, hc: 60, grasa: 1.2,
  source: "foto", detail: { per100: { kcal: 117, prot: 9, hc: 20, grasa: 0.4 }, estimated: false }, ...over,
});

test("addEntry returns an id and entriesForDate returns that day's entries in order", async () => {
  const a = await repo.addEntry(entry());
  const b = await repo.addEntry(entry({ meal: "desayuno", name: "Tostada", kcal: 180 }));
  await repo.addEntry(entry({ date: "2026-10-18", name: "Ayer" }));
  assert.ok(a > 0 && b > a);
  const rows = await repo.entriesForDate("2026-10-19");
  assert.deepEqual(rows.map((r) => r.name), ["Lentejas", "Tostada"]);
  assert.deepEqual(rows[0].detail, entry().detail);
  assert.equal(rows[0].kcal, 351);
});

test("text with quotes and markup is stored verbatim", async () => {
  const id = await repo.addEntry(entry({ name: `Pan "de pueblo" <b>'s</b>` }));
  const [row] = await repo.entriesForDate("2026-10-19");
  assert.equal(row.id, id);
  assert.equal(row.name, `Pan "de pueblo" <b>'s</b>`);
});

test("updateEntry changes grams and nutrients, deleteEntry removes it", async () => {
  const id = await repo.addEntry(entry());
  await repo.updateEntry(id, { grams: 200, kcal: 234, prot: 18, hc: 40, grasa: 0.8 });
  let [row] = await repo.entriesForDate("2026-10-19");
  assert.equal(row.grams, 200);
  assert.equal(row.kcal, 234);
  await repo.deleteEntry(id);
  assert.equal((await repo.entriesForDate("2026-10-19")).length, 0);
});

test("updateEntry ignores fields it does not own", async () => {
  const id = await repo.addEntry(entry());
  await repo.updateEntry(id, { date: "1999-01-01", meal: "cena", grams: 100 });
  const [row] = await repo.entriesForDate("2026-10-19");
  assert.equal(row.meal, "cena");
  assert.equal(row.grams, 100);
});

test("daySummaries totals each day with the target that applied, newest first", async () => {
  await repo.saveProfile(profile);
  await repo.addEntry(entry({ date: "2026-10-17", kcal: 1000 }));
  await repo.addEntry(entry({ date: "2026-10-17", kcal: 700 }));
  await repo.addEntry(entry({ date: "2026-10-18", kcal: 1200 }));
  await repo.setDayTarget("2026-10-17", 1600);
  const s = await repo.daySummaries(10);
  assert.deepEqual(s, [
    { date: "2026-10-18", kcal: 1200, count: 1, target: 1520 },
    { date: "2026-10-17", kcal: 1700, count: 2, target: 1600 },
  ]);
});

test("settings round-trip and missing ones are null", async () => {
  assert.equal(await repo.getSetting("usdaKey"), null);
  await repo.setSetting("usdaKey", "abc'123");
  assert.equal(await repo.getSetting("usdaKey"), "abc'123");
  await repo.setSetting("usdaKey", "");
  assert.equal(await repo.getSetting("usdaKey"), "");
});

test("getDayTarget returns the stored target or null", async () => {
  assert.equal(await repo.getDayTarget("2026-10-19"), null);
  await repo.setDayTarget("2026-10-19", 1550.4);
  assert.equal(await repo.getDayTarget("2026-10-19"), 1550);
});

test("reset deletes every profile, entry, target and setting", async () => {
  await repo.saveProfile(profile);
  await repo.addEntry(entry());
  await repo.setDayTarget("2026-10-19", 1500);
  await repo.setSetting("usdaKey", "x");
  await repo.reset();
  assert.equal(await repo.getProfile(), null);
  assert.deepEqual(await repo.entriesForDate("2026-10-19"), []);
  assert.equal(await repo.getDayTarget("2026-10-19"), null);
  assert.equal(await repo.getSetting("usdaKey"), null);
});

test("createRepo is idempotent on an existing database", async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  const r1 = await createRepo(sqlJsExecutor(db));
  await r1.saveProfile(profile);
  const r2 = await createRepo(sqlJsExecutor(db));
  assert.deepEqual(await r2.getProfile(), profile);
});
