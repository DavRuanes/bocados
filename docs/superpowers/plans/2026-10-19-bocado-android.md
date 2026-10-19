# Bocado Android Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Android app (Capacitor) that computes a personal daily calorie limit and logs four meals per day from barcode scans and plate photos, stored in SQLite on the phone.

**Architecture:** Plain ES modules under `src/`, bundled by esbuild into `www/`. Pure logic lives in `src/core/` and is tested with `node:test`. Storage sits behind one repository interface (`src/data/`), with an in-memory implementation for tests and the browser and a SQLite one for Android. Network clients in `src/api/` only build requests and hand raw JSON to the tested parsers in `src/core/parse.js`.

**Tech Stack:** Capacitor 8.5.2, @capacitor-community/sqlite 8.1.1, @capacitor/local-notifications 8.3.1, @capacitor/camera 8.2.4, @capacitor-mlkit/barcode-scanning 8.2.1, esbuild 0.28.2, @fontsource/manrope, node:test, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-19-bocado-android-design.md`

## Global Constraints

- Meals, in this order: `desayuno` Desayuno, `comida` Comida, `merienda` Merienda, `cena` Cena.
- Activity factors: sedentario 1.2, ligero 1.375, moderado 1.55, activo 1.725, muy_activo 1.9.
- Paces: suave 500, medio 750, rapido 1000 kcal deficit.
- Floors when losing weight: mujer 1200, hombre 1500 kcal.
- Goals: `perder`, `mantener` only.
- Over-limit copy: "Hoy te has pasado de tu límite diario".
- Notification title "Ya puedes ver tu día de calorías"; body "Límite: {L} kcal. Comidas: {E} kcal."
- Groq model `qwen/qwen3.8-27b`; USDA default key `DEMO_KEY`.
- Every string from a network response is inserted with `textContent` or escaped.

## Review Focus

1. Profile values out of range or empty (age 0, height in metres, weight "80,5" with a comma): reject with a clear message; accept the comma decimal.
2. A day that crosses midnight while the app is open: new entries go to the new day; the date key uses local time, never UTC.
3. API responses with missing nutriments, nulls, strings for numbers, or HTML in product names: the parser returns null fields and the UI shows a dash; nothing executes.
4. A small person whose total expenditure is below the floor: the limit becomes the floor and the screen explains it, instead of a negative or tiny target.
5. Groq returning prose around the JSON, or `legible: false`: the app shows the reason and asks for a clearer photo.

---

### Task 1: Calorie maths (`src/core/calc.js`)

**Interfaces — Produces:**
- `bmr({sex, weightKg, heightCm, age}) -> number`
- `tdee(bmr, activity) -> number`
- `dailyTarget(profile) -> {bmr, tdee, deficit, target, floor, clampedToFloor}`
- `ACTIVITY`, `PACES`, `FLOORS` constants

Tests: worked examples for man and woman; every activity factor; floor clamping; `mantener` ignores pace and floor; unknown activity throws.

### Task 2: Profile validation (`src/core/profile.js`)

**Produces:** `parseNumber(str) -> number|NaN` (accepts comma), `validateProfile(input) -> {ok, profile, errors}` with ranges age 14-100, height 120-230 cm, weight 35-300 kg.

### Task 3: Day maths (`src/core/day.js`)

**Produces:** `dateKey(date) -> "YYYY-MM-DD"` (local), `scaleNutrients(per100, grams)`, `sumEntries(entries)`, `mealTotals(entries)`, `dayStatus(eatenKcal, target) -> {remaining, over, ratio}`, `nextMidnights(from, n) -> Date[]`, `notificationText(target, eaten)`.

### Task 4: API parsers (`src/core/parse.js`)

**Produces:** `parseOffProduct(json)`, `parseUsdaSearch(json)`, `parseGroqJson(content)`, `normalizePlate(obj)`, `normalizeLabel(obj)`.

### Task 5: Repository (`src/data/memory.js`, `src/data/sqlite.js`, `src/data/schema.js`)

**Produces:** `createRepo()` with `getProfile()`, `saveProfile(p)`, `addEntry(e) -> id`, `updateEntry(id, patch)`, `deleteEntry(id)`, `entriesForDate(key)`, `daySummaries(limit)`, `getSetting(k)`, `setSetting(k, v)`. Memory implementation tested; SQLite implementation mirrors it with the schema in `schema.js`.

### Task 6: API clients (`src/api/*.js`)

Groq, USDA and Open Food Facts clients that call the parsers. Image downscaling to 1024 px JPEG before upload.

### Task 7: UI (`src/ui/*`, `src/styles/*`)

Onboarding, Hoy, meal sheet (scan first, photo below), item editor, history, profile, settings. Pastel-consumer tokens, Manrope, bottom bar on the phone.

### Task 8: Native wiring and CI

`capacitor.config.json`, `npx cap add android`, manifest permissions, notifications rescheduling (7 midnights ahead), `.github/workflows/android.yml` running tests, build, `cap sync`, `assembleDebug`, uploading the APK and attaching it to a release.

### Task 9: Review and verification

Independent code review (superpowers:requesting-code-review), fixes, then fresh test run and taste-skill inspector on the browser build.
