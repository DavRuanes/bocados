import { scaleNutrients } from "./day.js";

// Para cada alimento que la IA ve en la foto, busca sus valores en USDA.
// Si USDA falla o no lo tiene, usa la estimación de la IA marcada como "estimado".
// Las búsquedas van de una en una para no agotar el límite de DEMO_KEY.
export async function resolvePlate(plate, lookup) {
  const out = [];
  for (const it of plate.items) {
    let found = null;
    try { found = await lookup(it.query); } catch { found = null; }
    if (found && found.per100 && found.per100.kcal !== null) {
      out.push({ ...it, per100: found.per100, source: "usda", sourceName: found.description, fdcId: found.fdcId });
    } else if (it.estimate && it.estimate.kcal !== null) {
      out.push({ ...it, per100: it.estimate, source: "estimado" });
    } else {
      out.push({ ...it, per100: { kcal: null, prot: null, hc: null, grasa: null }, source: "sin-datos" });
    }
  }
  return out;
}

export function entryFromItem(item, grams, { date, meal }) {
  const s = scaleNutrients(item.per100, grams);
  const detail = { per100: item.per100, origin: item.source };
  if (item.sourceName) detail.originName = item.sourceName;
  if (item.fdcId) detail.fdcId = item.fdcId;
  return {
    date, meal, name: item.name, grams: Number(grams) || 0,
    kcal: s.kcal ?? 0, prot: s.prot, hc: s.hc, grasa: s.grasa,
    source: "foto", detail,
  };
}
