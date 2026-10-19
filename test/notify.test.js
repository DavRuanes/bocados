import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMidnightNotifications, NOTIFY_IDS } from "../src/core/notify.js";

test("seven midnight notifications: today's real total, then zero for days not logged yet", () => {
  const now = new Date(2026, 9, 19, 21, 30);
  const list = buildMidnightNotifications({ target: 1850, todayKcal: 1720, now });
  assert.equal(list.length, 7);
  assert.deepEqual(list.map((n) => n.id), NOTIFY_IDS);
  assert.equal(list[0].title, "Ya puedes ver tu día de calorías");
  assert.equal(list[0].body, "Límite: 1.850 kcal. Comidas: 1.720 kcal.");
  assert.deepEqual([list[0].at.getDate(), list[0].at.getHours()], [20, 0]);
  assert.deepEqual(list[0].extra, { date: "2026-10-19" });
  assert.equal(list[1].body, "Límite: 1.850 kcal. Comidas: 0 kcal.");
  assert.deepEqual(list[1].extra, { date: "2026-10-20" });
  assert.deepEqual([list[6].at.getDate(), list[6].at.getMonth()], [26, 9]);
});

test("month boundaries roll over correctly", () => {
  const list = buildMidnightNotifications({ target: 1500, todayKcal: 0, now: new Date(2026, 9, 31, 10) });
  assert.deepEqual(list[0].extra, { date: "2026-10-31" });
  assert.deepEqual([list[0].at.getMonth(), list[0].at.getDate()], [10, 1]);
});

test("plugin payload is inexact unless exact alarms are allowed, and always allowed while idle", async () => {
  const { toPluginNotifications } = await import("../src/core/notify.js");
  const list = buildMidnightNotifications({ target: 1500, todayKcal: 300, now: new Date(2026, 9, 19, 10) });
  const inexact = toPluginNotifications(list, false);
  assert.equal(inexact.length, 7);
  assert.deepEqual(Object.keys(inexact[0]).sort(), ["body", "extra", "id", "isExactNotification", "schedule", "title"]);
  assert.equal(inexact[0].isExactNotification, false);
  assert.deepEqual(inexact[0].schedule, { at: list[0].at, allowWhileIdle: true });
  assert.equal(toPluginNotifications(list, true)[3].isExactNotification, true);
});
