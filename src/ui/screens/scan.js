import { h, icon, toast } from "../dom.js";
import { backButton } from "../app.js";
import { scaleNutrients, formatInt } from "../../core/day.js";
import { scanBarcode, pickPhoto } from "../../platform.js";
import { getProduct, cleanBarcode } from "../../api/off.js";
import { readLabel } from "../../api/groq.js";
import { afterAdd, nutritionTable, gramsField, errorPanel, loadingPanel, toMeal } from "./common.js";
import { manualScreen } from "./manual.js";

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
        loadingPanel("Consultando Open Food Facts…"));
      queueMicrotask(async () => {
        try {
          const p = await getProduct(code);
          if (!app.stack.includes(this)) return;
          await app.replace(p.found
            ? productScreen(app, date, meal, { name: p.name, brand: p.brand, code: p.code, per100: p.per100, source: "barcode" })
            : notFoundScreen(app, date, meal, code));
        } catch (e) {
          if (!app.stack.includes(this)) return;
          main.lastChild.replaceWith(errorPanel(e.message, "Volver a intentarlo", () => app.replace(lookupScreen(app, date, meal, code))));
        }
      });
      return main;
    },
  };
}

function notFoundScreen(app, date, meal, code) {
  return {
    render() {
      return h("main", { class: "screen" },
        h("div", { class: "top" }, backButton(app)),
        h("header", {}, h("h1", {}, "Producto no encontrado"),
          h("p", { class: "lede num" }, `Open Food Facts no tiene el código ${code}. Puedes leer la etiqueta con una foto o escribir los valores.`)),
        h("div", { class: "actions" },
          h("button", { class: "btn primary big block", type: "button", onclick: () => app.replace(labelScreen(app, date, meal, code)) }, icon("label"), "Fotografiar la etiqueta"),
          h("button", { class: "btn big block", type: "button", onclick: () => app.replace(manualScreen(app, date, meal)) }, icon("pencil"), "Añadir a mano")));
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
        const s = scaleNutrients(product.per100, grams);
        await app.repo.addEntry({
          date, meal, name: product.brand ? `${product.name} (${product.brand})` : product.name, grams,
          kcal: s.kcal ?? 0, prot: s.prot, hc: s.hc, grasa: s.grasa, source: product.source,
          detail: { per100: product.per100, code: product.code || null, origin: product.source },
        });
        await afterAdd(app, date, meal);
        app.stack.pop();
        await app.show();
      };

      const meta = [product.brand, product.code ? `Código ${product.code}` : "", product.source === "etiqueta" ? "Leído de la etiqueta" : "Datos de Open Food Facts"].filter(Boolean).join(". ");
      return h("main", { class: "screen" },
        h("div", { class: "top" }, backButton(app)),
        h("header", {}, h("h1", {}, product.name), h("p", { class: "lede" }, meta)),
        !hasKcal ? h("p", { class: "notice" }, "Este producto no tiene calorías registradas. Puedes leer la etiqueta o añadirlo a mano.") : null,
        h("section", { class: "panel" },
          gramsField("grams", grams, (g) => { grams = g; update(); }),
          h("div", { class: "today-figure" }, figure, h("p", { class: "muted" }, "en la cantidad elegida")),
          h("button", { class: "btn primary block", type: "button", disabled: !hasKcal, onclick: add }, `Añadir ${toMeal(meal)}`)),
        h("section", { class: "panel" }, h("h2", {}, "Información nutricional"), tableWrap),
        !hasKcal && product.source !== "etiqueta"
          ? h("button", { class: "btn block", type: "button", onclick: () => app.replace(labelScreen(app, date, meal, product.code)) }, icon("label"), "Fotografiar la etiqueta")
          : null,
        product.source === "barcode" ? h("p", { class: "meta" }, "Datos: Open Food Facts, base de datos abierta (licencia ODbL).") : null);
    },
  };
}
