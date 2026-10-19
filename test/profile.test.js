import { test } from "node:test";
import assert from "node:assert/strict";
import { parseNumber, validateProfile } from "../src/core/profile.js";

const good = { goal: "perder", sex: "hombre", age: "30", heightCm: "180", weightKg: "80,5", activity: "moderado", pace: "medio" };

test("parseNumber accepts a comma as decimal separator", () => {
  assert.equal(parseNumber("80,5"), 80.5);
  assert.equal(parseNumber(" 72.25 "), 72.25);
  assert.equal(parseNumber(65), 65);
});

test("parseNumber returns NaN for junk and empty values", () => {
  assert.ok(Number.isNaN(parseNumber("")));
  assert.ok(Number.isNaN(parseNumber("abc")));
  assert.ok(Number.isNaN(parseNumber("1.2.3")));
  assert.ok(Number.isNaN(parseNumber(null)));
});

test("a complete profile validates and is converted to numbers", () => {
  const r = validateProfile(good);
  assert.equal(r.ok, true);
  assert.deepEqual(r.profile, { goal: "perder", sex: "hombre", age: 30, heightCm: 180, weightKg: 80.5, activity: "moderado", pace: "medio" });
});

test("height given in metres is rejected with a hint", () => {
  const r = validateProfile({ ...good, heightCm: "1,80" });
  assert.equal(r.ok, false);
  assert.match(r.errors.heightCm, /centímetros/);
});

test("ages outside 14-100 are rejected", () => {
  assert.equal(validateProfile({ ...good, age: "0" }).ok, false);
  assert.equal(validateProfile({ ...good, age: "13" }).ok, false);
  assert.equal(validateProfile({ ...good, age: "101" }).ok, false);
  assert.equal(validateProfile({ ...good, age: "14" }).ok, true);
});

test("weight outside 35-300 kg is rejected", () => {
  assert.equal(validateProfile({ ...good, weightKg: "20" }).ok, false);
  assert.equal(validateProfile({ ...good, weightKg: "301" }).ok, false);
});

test("missing choices are reported per field", () => {
  const r = validateProfile({ ...good, sex: "", activity: undefined });
  assert.equal(r.ok, false);
  assert.ok(r.errors.sex);
  assert.ok(r.errors.activity);
});

test("pace is only required when the goal is to lose weight", () => {
  const r = validateProfile({ ...good, goal: "mantener", pace: "" });
  assert.equal(r.ok, true);
  assert.equal(r.profile.pace, null);
  assert.equal(validateProfile({ ...good, pace: "" }).ok, false);
});
