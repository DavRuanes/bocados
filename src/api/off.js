import { fetchJson, ApiError } from "./http.js";
import { parseOffProduct } from "../core/parse.js";

const FIELDS = "code,product_name,product_name_es,brands,nutriments";
// Open Food Facts pide un User-Agent que identifique la app.
const USER_AGENT = "Bocado/1.0 (https://github.com/DavRuanes/bocados)";

export function cleanBarcode(raw) {
  const digits = String(raw ?? "").replace(/[\s-]/g, "");
  return /^\d{8,14}$/.test(digits) ? digits : null;
}

export function offProductUrl(code) {
  const u = new URL(`https://world.openfoodfacts.org/api/v2/product/${code}`);
  u.searchParams.set("fields", FIELDS);
  return u.toString();
}

export async function getProduct(raw) {
  const code = cleanBarcode(raw);
  if (!code) throw new ApiError("bad", "Ese código de barras no es válido.");
  try {
    const json = await fetchJson(offProductUrl(code), { headers: { "User-Agent": USER_AGENT } }, "Open Food Facts");
    return { ...parseOffProduct(json), code };
  } catch (e) {
    if (e.kind === "notfound") return { found: false, code };
    throw e;
  }
}
