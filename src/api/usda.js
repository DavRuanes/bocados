import { fetchJson } from "./http.js";
import { parseUsdaSearch } from "../core/parse.js";

const BASE = "https://api.nal.usda.gov/fdc/v1/foods/search";
export const DEMO_KEY = "DEMO_KEY";

export function usdaSearchUrl(query, key) {
  const u = new URL(BASE);
  u.searchParams.set("query", query);
  for (const t of ["Foundation", "SR Legacy", "Survey (FNDDS)"]) u.searchParams.append("dataType", t);
  u.searchParams.set("pageSize", "5");
  u.searchParams.set("api_key", (key || "").trim() || DEMO_KEY);
  return u.toString();
}

// Devuelve {fdcId, description, per100} o null si USDA no tiene el alimento.
export async function searchFood(query, key) {
  const json = await fetchJson(usdaSearchUrl(query, key), {}, "USDA");
  return parseUsdaSearch(json);
}
