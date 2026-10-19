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
// el precio de cada bandeja, así que se usa solo el principio (7 cifras), que suele identificar
// el artículo. Es una aproximación: la app pide confirmar que es el mismo producto.
export function productKey(code) {
  const c = String(code);
  return isStoreCode(c) ? { key: `S:${c.slice(0, 7)}`, store: true } : { key: c, store: false };
}
