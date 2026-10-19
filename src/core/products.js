// Códigos de circulación restringida de GS1 (prefijos 02 y 20-29): no son GTIN, no son
// únicos fuera de la tienda o del país, y ninguna base de datos pública los tiene.
// En EAN-13 son los que empiezan por 02 o por 2; en UPC-A (12 cifras), el sistema numérico 2.
export function isStoreCode(code) {
  const c = String(code ?? "");
  if (c.length === 13) return c[0] === "2" || c.startsWith("02");
  if (c.length === 12) return c[0] === "2";
  return false;
}

// Clave para "Mis productos". En los códigos de tienda parte del número cambia con el peso o
// el precio de cada bandeja, así que se usa solo el principio, que suele identificar el artículo:
// 7 cifras en EAN-13 y 6 en UPC-A (donde la 7.ª suele ser un dígito de control del precio).
// Es una aproximación: la app pide confirmar que es el mismo producto.
export function productKey(code) {
  const c = String(code);
  if (!isStoreCode(c)) return { key: c, store: false };
  return { key: `S:${c.slice(0, c.length === 12 ? 6 : 7)}`, store: true };
}
