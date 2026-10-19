// Convierte respuestas de las APIs en datos limpios. Nada de aquí genera HTML:
// los textos se pintan siempre con textContent.

const KJ_PER_KCAL = 4.184;
const round2 = (n) => Math.round(n * 100) / 100;

export function num(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const str = (v, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export const LABEL_FIELDS = ["kcal", "grasa", "sat", "hc", "azuc", "fibra", "prot", "sal"];

// ---------- Open Food Facts ----------
const OFF_KEYS = {
  grasa: "fat_100g", sat: "saturated-fat_100g", hc: "carbohydrates_100g", azuc: "sugars_100g",
  fibra: "fiber_100g", prot: "proteins_100g", sal: "salt_100g",
};

export function parseOffProduct(json) {
  if (!json || json.status !== 1 || !json.product) return { found: false };
  const p = json.product;
  const n = p.nutriments || {};
  let kcal = num(n["energy-kcal_100g"]);
  if (kcal === null) {
    const kj = num(n["energy-kj_100g"]) ?? num(n.energy_100g);
    kcal = kj === null ? null : round2(kj / KJ_PER_KCAL);
  }
  const per100 = { kcal };
  for (const [k, offKey] of Object.entries(OFF_KEYS)) per100[k] = num(n[offKey]);
  return {
    found: true,
    code: str(json.code, 20),
    name: str(p.product_name_es) || str(p.product_name) || "Producto sin nombre",
    brand: str(p.brands).split(",")[0].trim(),
    per100,
  };
}

// ---------- USDA FoodData Central ----------
// Acepta los dos formatos que se ven en la API: {nutrientNumber, value} y {number, amount}.
function usdaNutrients(list) {
  const out = {};
  for (const fn of list || []) {
    const id = String(fn.nutrientNumber ?? fn.number ?? fn.nutrient?.number ?? "");
    const value = num(fn.value ?? fn.amount);
    const unit = String(fn.unitName ?? fn.nutrient?.unitName ?? "").toLowerCase();
    if (id && value !== null) out[id] = { value, unit };
  }
  return out;
}

function usdaKcal(n) {
  for (const id of ["208", "958", "957"]) {
    if (n[id] && n[id].unit !== "kj") return n[id].value;
  }
  if (n["268"]) return round2(n["268"].value / KJ_PER_KCAL);
  return null;
}

export function parseUsdaSearch(json) {
  for (const food of json?.foods || []) {
    const n = usdaNutrients(food.foodNutrients);
    const kcal = usdaKcal(n);
    if (kcal === null) continue;
    return {
      fdcId: food.fdcId,
      description: str(food.description, 200),
      per100: { kcal, prot: n["203"]?.value ?? null, hc: n["205"]?.value ?? null, grasa: n["204"]?.value ?? null },
    };
  }
  return null;
}

// ---------- Groq ----------
export function parseGroqJson(content) {
  if (typeof content !== "string" || !content.trim()) return null;
  const attempts = [content];
  const fence = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) attempts.push(fence[1]);
  const first = content.indexOf("{");
  const last = content.lastIndexOf("}");
  if (first !== -1 && last > first) attempts.push(content.slice(first, last + 1));
  for (const a of attempts) {
    try {
      const v = JSON.parse(a);
      if (v && typeof v === "object") return v;
    } catch { /* probar el siguiente */ }
  }
  return null;
}

export function normalizePlate(obj) {
  if (!obj || obj.legible === false) {
    return { legible: false, reason: str(obj?.motivo, 200) || "La foto no se ve con claridad.", items: [] };
  }
  const items = [];
  for (const it of Array.isArray(obj.items) ? obj.items.slice(0, 12) : []) {
    const name = str(it?.nombre, 80);
    if (!name) continue;
    items.push({
      name,
      query: str(it.usda, 80) || name,
      grams: num(it.gramos) ?? 0,
      estimate: { kcal: num(it.kcal100), prot: num(it.prot100), hc: num(it.hc100), grasa: num(it.grasa100) },
      confidence: ["alta", "media", "baja"].includes(it.confianza) ? it.confianza : "media",
    });
  }
  if (!items.length) return { legible: false, reason: "No se distingue ningún alimento en la foto.", items: [] };
  return { legible: true, dish: str(obj.plato, 80) || items[0].name, items };
}

export function normalizeLabel(obj) {
  if (!obj || obj.legible === false) {
    return { legible: false, reason: str(obj?.motivo, 200) || "No se puede leer la tabla nutricional." };
  }
  const per100 = {};
  for (const k of LABEL_FIELDS) per100[k] = num(obj[k]);
  return { legible: true, name: str(obj.nombre, 80) || "Producto", brand: str(obj.marca, 60), per100 };
}
