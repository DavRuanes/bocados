import { h, icon, toast } from "../dom.js";
import { backButton } from "../app.js";
import { scaleNutrients, formatInt } from "../../core/day.js";
import { scanBarcode, pickPhoto } from "../../platform.js";
import { getProduct, cleanBarcode } from "../../api/off.js";
import { readLabel } from "../../api/groq.js";
import { afterAdd, nutritionTable, gramsField, errorPanel, loadingPanel, toMeal } from "./common.js";
import { manualScreen } from "./manual.js";
import { isStoreCode } from "../../core/products.js";
import { parseNumber } from "../../core/profile.js";

// Abre el escáner nativo y, al leer un código, busca el producto.
export async function scanFlow(app, date, meal) {
  let code;
  try {
    code = await scanBarcode((msg) => toast(msg));
  } catch (e) {
    toast(e.message);
    return;
  }
  if (!code) return;
  await app.push(lookupScreen(app, date, meal, code));
}

export function codeEntryScreen(app, date, meal) {
  return {
    render() {
      const input = h("input", { id: "ean", type: "text", inputmode: "numeric", autocomplete: "off", placeholder: "8410000000000" });
      const err = h("p", { class: "error", hidden: true });
      const submit = (ev) => {
        ev.preventDefault();
        const code = cleanBarcode(input.value);
        if (!code) {
          err.textContent = "Escribe los 8 o 13 números que hay debajo de las barras.";
          err.hidden = false;
          return;
        }
        app.replace(lookupScreen(app, date, meal, code));
      };
      return h("main", { class: "screen" },
        h("div", { class: "top" }, backButton(app)),
        h("header", {}, h("h1", {}, "Código de barras"), h("p", { class: "lede" }, "Escribe el número que aparece debajo de las barras del envase.")),
        h("form", { class: "panel", onsubmit: submit },
          h("div", { class: "field" }, h("label", { for: "ean" }, "Número del código"), h("div", { class: "input with-unit" }, input)),
          err,
          h("button", { class: "btn primary block", type: "submit" }, "Buscar producto")));
    },
  };
}

function lookupScreen(app, date, meal, code) {
  return {
    async render() {
      const main = h("main", { class: "screen" },
        h("div", { class: "top" }, backButton(app)),
        h("header", {}, h("h1", {}, "Buscando producto"), h("p", { class: "lede num" }, `Código ${code}`)),
        loadingPanel("Buscando el producto…"));
      queueMicrotask(async () => {
        try {
          // 1) Productos que el usuario ya completó antes ("Mis productos").
          const mine = await app.repo.findMyProduct(code);
          if (!app.stack.includes(this)) return;
          if (mine) {
            await app.replace(productScreen(app, date, meal, { ...mine.product, savedCode: mine.product.code, code, source: "mio", match: mine.match }));
            return;
          }
          // 2) Open Food Facts. Algunas marcas de supermercado usan códigos que empiezan por 2
          //    y sí están, así que se consulta siempre.
          const p = await getProduct(code);
          if (!app.stack.includes(this)) return;
          // 3) Si no está: los códigos de tienda tienen su propia explicación.
          await app.replace(p.found
            ? productScreen(app, date, meal, { name: p.name, brand: p.brand, code: p.code, per100: p.per100, source: "barcode" })
            : missingScreen(app, date, meal, code, isStoreCode(code)));
        } catch (e) {
          if (!app.stack.includes(this)) return;
          main.lastChild.replaceWith(errorPanel(e.message, "Volver a intentarlo", () => app.replace(lookupScreen(app, date, meal, code))));
        }
      });
      return main;
    },
  };
}

// Producto sin datos: código de tienda o que no está en Open Food Facts.
function missingScreen(app, date, meal, code, store) {
  return {
    render() {
      return h("main", { class: "screen" },
        h("div", { class: "top" }, backButton(app)),
        h("header", {},
          h("h1", {}, store ? "Código de la tienda" : "Producto no encontrado"),
          h("p", { class: "lede num" }, store
            ? `El código ${code} lo pone el supermercado (por ejemplo en carne, pescado o fruta pesada) y no está en ninguna base de datos.`
            : `La base de datos de productos no tiene el código ${code}.`)),
        h("p", { class: "note" }, "Complétalo una vez con la etiqueta o con los valores por 100 g y Bocado lo recordará la próxima vez que lo escanees."),
        h("div", { class: "actions" },
          h("button", { class: "btn primary big block", type: "button", onclick: () => app.replace(labelScreen(app, date, meal, code)) }, icon("label"), "Fotografiar la etiqueta"),
          h("button", { class: "btn big block", type: "button", onclick: () => app.replace(productFormScreen(app, date, meal, code)) }, icon("pencil"), "Escribir valores por 100 g"),
          h("button", { class: "btn text", type: "button", onclick: () => app.replace(manualScreen(app, date, meal)) }, "Solo sé las calorías totales")));
    },
  };
}

// Valores por 100 g escritos por el usuario; se guardan en "Mis productos".
export function productFormScreen(app, date, meal, code = "", initial = null) {
  const FIELDS = [["kcal", "Calorías", "kcal", true], ["prot", "Proteínas", "g"], ["hc", "Hidratos", "g"], ["azuc", "Azúcares", "g"], ["grasa", "Grasas", "g"], ["sal", "Sal", "g"]];
  return {
    render() {
      const err = h("p", { class: "error", hidden: true, role: "alert" });
      const field = (id, label, unit, attrs = {}) => h("div", { class: "field" },
        h("label", { for: id }, label),
        h("div", { class: "input with-unit" }, h("input", { id, type: "text", inputmode: "decimal", autocomplete: "off", ...attrs }), unit ? h("span", {}, unit) : null));
      const submit = (ev) => {
        ev.preventDefault();
        const f = ev.target;
        const name = f.elements.pname.value.trim();
        const per100 = { kcal: null, grasa: null, sat: null, hc: null, azuc: null, fibra: null, prot: null, sal: null };
        for (const [k, , , required] of FIELDS) {
          const raw = f.elements[`p${k}`].value.trim();
          if (!raw) { if (required) return show("Escribe las calorías por 100 g (están en la tabla del envase)."); continue; }
          const n = parseNumber(raw);
          if (!Number.isFinite(n) || (k === "kcal" ? n > 900 : n > 100)) return show("Revisa los números: son valores por 100 g.");
          per100[k] = n;
        }
        if (!name) return show("Ponle un nombre al producto.");
        if ((per100.prot ?? 0) + (per100.hc ?? 0) + (per100.grasa ?? 0) > 100) return show("Proteínas, hidratos y grasas no pueden sumar más de 100 g por cada 100 g.");
        app.replace(productScreen(app, date, meal, { name: name.slice(0, 80), brand: initial?.brand || "", code, per100, source: "manual-producto" }));
      };
      const show = (m) => { err.textContent = m; err.hidden = false; };
      return h("main", { class: "screen" },
        h("div", { class: "top" }, backButton(app)),
        h("header", {}, h("h1", {}, "Valores por 100 g"), h("p", { class: "lede" }, "Cópialos de la tabla de información nutricional del envase.")),
        h("form", { class: "panel", onsubmit: submit, novalidate: true },
          field("pname", "Nombre", "", { inputmode: "text", maxlength: "80", placeholder: "Pechuga de pollo en filetes", value: initial?.name ?? "" }),
          h("div", { style: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" } },
            FIELDS.map(([k, label, unit]) => field(`p${k}`, label, unit, { value: initial?.per100?.[k] ?? "" }))),
          err,
          h("button", { class: "btn primary block", type: "submit" }, "Continuar")));
    },
  };
}

// Foto de la tabla nutricional, leída por Groq.
export function labelScreen(app, date, meal, code = "") {
  return {
    render() {
      const body = h("div", { class: "actions" });
      const main = h("main", { class: "screen" },
        h("div", { class: "top" }, backButton(app)),
        h("header", {}, h("h1", {}, "Leer la etiqueta"),
          h("p", { class: "lede" }, "Haz una foto de cerca a la tabla de información nutricional, con buena luz y sin reflejos.")),
        body);
      const go = async (source) => {
        let img;
        try { img = await pickPhoto(source); } catch (e) { toast(e.message); return; }
        if (!img) return;
        const loading = loadingPanel("Leyendo la etiqueta…");
        body.replaceChildren(h("img", { class: "photo-preview", src: img, alt: "Foto de la etiqueta" }), loading);
        try {
          const r = await readLabel(await app.groqKey(), [img]);
          if (!app.stack.includes(this)) return;
          if (!r.legible) {
            body.replaceChildren(errorPanel(`No se puede leer la tabla: ${r.reason}`, "Hacer otra foto", () => app.replace(labelScreen(app, date, meal, code))));
            return;
          }
          await app.replace(productScreen(app, date, meal, { name: r.name, brand: r.brand, code, per100: r.per100, source: "etiqueta" }));
        } catch (e) {
          if (!app.stack.includes(this)) return;
          body.replaceChildren(errorPanel(e.message, "Volver a intentarlo", () => app.replace(labelScreen(app, date, meal, code))));
        }
      };
      body.append(
        h("button", { class: "btn primary big block", type: "button", onclick: () => go("camera") }, icon("camera"), "Hacer foto"),
        h("button", { class: "btn big block", type: "button", onclick: () => go("gallery") }, icon("gallery"), "Elegir de la galería"));
      return main;
    },
  };
}

// Producto con valores por 100 g: eliges los gramos y lo añades.
export function productScreen(app, date, meal, product) {
  return {
    render() {
      let grams = 100;
      const hasKcal = product.per100.kcal !== null;
      const figure = h("p", { class: "figure num" });
      const tableWrap = h("div", {});
      const update = () => {
        const s = scaleNutrients(product.per100, grams);
        figure.replaceChildren(hasKcal ? `${formatInt(s.kcal)} ` : "— ", h("span", { class: "unit" }, "kcal"));
        tableWrap.replaceChildren(nutritionTable(product.per100, grams));
      };
      update();

      const add = async () => {
        if (grams <= 0) { toast("Escribe cuántos gramos vas a comer."); return; }
        const s = scaleNutrients(product.per100, grams);
        const entrySource = product.source === "etiqueta" ? "etiqueta" : product.source === "manual-producto" ? "manual" : "barcode";
        try {
          await app.repo.addEntry({
            date, meal, name: product.brand ? `${product.name} (${product.brand})` : product.name, grams,
            kcal: s.kcal ?? 0, prot: s.prot, hc: s.hc, grasa: s.grasa, source: entrySource,
            detail: { per100: product.per100, code: product.code || null, origin: product.source },
          });
        } catch {
          toast("No se pudo guardar. Inténtalo otra vez.");
          return;
        }
        // Lo que el usuario completa a mano o con la etiqueta se recuerda para el próximo escaneo.
        // Si esto fallara, el plato ya está anotado: no se avisa para no provocar un duplicado.
        if (product.code && (product.source === "etiqueta" || product.source === "manual-producto")) {
          try {
            await app.repo.saveMyProduct({ code: product.code, name: product.name, brand: product.brand, per100: product.per100 });
          } catch (e) {
            console.warn("No se pudo guardar en Mis productos", e);
          }
        }
        await afterAdd(app, date, meal);
        app.stack.pop();
        await app.show();
      };

      const ORIGIN = { etiqueta: "Leído de la etiqueta", "manual-producto": "Valores escritos por ti", mio: "Guardado en Mis productos", barcode: "Datos de Open Food Facts" };
      const meta = [product.brand, product.code ? `Código ${product.code}` : "", ORIGIN[product.source]].filter(Boolean).join(". ");
      return h("main", { class: "screen" },
        h("div", { class: "top" }, backButton(app)),
        h("header", {}, h("h1", {}, product.name), h("p", { class: "lede" }, meta)),
        !hasKcal ? h("p", { class: "notice" }, "Este producto no tiene calorías registradas. Puedes leer la etiqueta o añadirlo a mano.") : null,
        product.match === "store"
          ? h("section", { class: "notice", style: { display: "flex", flexDirection: "column", gap: "8px" } },
              h("span", {}, `Este código de tienda se parece al de «${product.name}», que guardaste antes. Comprueba que es el mismo producto.`),
              h("button", { class: "btn", type: "button", style: { alignSelf: "flex-start" }, onclick: () => app.replace(missingScreen(app, date, meal, product.code, true)) }, "No es este producto"))
          : null,
        h("section", { class: "panel" },
          gramsField("grams", grams, (g) => { grams = g; update(); }),
          h("div", { class: "today-figure" }, figure, h("p", { class: "muted" }, "en la cantidad elegida")),
          h("button", { class: "btn primary block", type: "button", disabled: !hasKcal, onclick: add }, `Añadir ${toMeal(meal)}`)),
        h("section", { class: "panel" }, h("h2", {}, "Información nutricional"), tableWrap),
        !hasKcal && product.source !== "etiqueta"
          ? h("button", { class: "btn block", type: "button", onclick: () => app.replace(labelScreen(app, date, meal, product.code)) }, icon("label"), "Fotografiar la etiqueta")
          : null,
        product.source === "mio"
          ? h("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap" } },
              h("button", { class: "btn", type: "button", onclick: () => app.replace(productFormScreen(app, date, meal, product.match === "store" ? product.code : product.savedCode, product)) }, icon("pencil"), "Corregir valores"),
              h("button", { class: "btn text", type: "button", onclick: async () => {
                try { await app.repo.deleteMyProduct(product.savedCode); } catch { toast("No se pudo olvidar. Inténtalo otra vez."); return; }
                toast("Producto olvidado.");
                await app.replace(missingScreen(app, date, meal, product.code, isStoreCode(product.code)));
              } }, "Olvidar este producto"))
          : null,
        product.source === "barcode" ? h("p", { class: "meta" }, "Datos: Open Food Facts, base de datos abierta (licencia ODbL).") : null);
    },
  };
}
