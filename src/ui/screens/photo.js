import { h, icon, toast } from "../dom.js";
import { backButton } from "../app.js";
import { scaleNutrients, formatInt } from "../../core/day.js";
import { pickPhoto } from "../../platform.js";
import { analyzePlate } from "../../api/groq.js";
import { searchFood } from "../../api/usda.js";
import { resolvePlate, entryFromItem } from "../../core/plate.js";
import { afterAdd, errorPanel, loadingPanel, toMeal } from "./common.js";

const SOURCE = {
  usda: ["pill positive", "USDA"],
  estimado: ["pill warning", "Estimado"],
  "sin-datos": ["pill negative", "Sin datos"],
};

export function photoScreen(app, date, meal) {
  return {
    render() {
      const body = h("div", { class: "actions" });
      const main = h("main", { class: "screen" },
        h("div", { class: "top" }, backButton(app)),
        h("header", {}, h("h1", {}, "Foto del plato"),
          h("p", { class: "lede" }, "Haz la foto desde arriba, con buena luz y todo el plato a la vista. Si no se ve bien, Bocado te lo dirá.")),
        body);

      const start = async (source) => {
        let img;
        try { img = await pickPhoto(source); } catch (e) { toast(e.message); return; }
        if (!img) return;
        const preview = h("img", { class: "photo-preview", src: img, alt: "Foto del plato" });
        const loading = loadingPanel("Mirando qué hay en el plato…");
        body.replaceChildren(preview, loading);
        try {
          const plate = await analyzePlate(await app.groqKey(), img);
          if (!app.stack.includes(this)) return;
          if (!plate.legible) {
            body.replaceChildren(preview, errorPanel(`No se puede analizar esta foto: ${plate.reason}`, "Hacer otra foto", () => app.replace(photoScreen(app, date, meal))));
            return;
          }
          const key = await app.usdaKey();
          let n = 0;
          const { items, problem } = await resolvePlate(plate, (q) => {
            n += 1;
            loading.setText(`Buscando calorías en USDA (${n} de ${plate.items.length})…`);
            return searchFood(q, key);
          });
          if (!app.stack.includes(this)) return;
          body.replaceChildren(preview, resultPanel(app, date, meal, plate.dish, items, problem));
        } catch (e) {
          if (!app.stack.includes(this)) return;
          body.replaceChildren(preview, errorPanel(e.message, "Volver a intentarlo", () => app.replace(photoScreen(app, date, meal))));
        }
      };

      body.append(
        h("button", { class: "btn primary big block", type: "button", onclick: () => start("camera") }, icon("camera"), "Hacer foto"),
        h("button", { class: "btn big block", type: "button", onclick: () => start("gallery") }, icon("gallery"), "Elegir de la galería"));
      return main;
    },
  };
}

function resultPanel(app, date, meal, dish, items, problem) {
  const state = items.map((it) => ({ it, grams: Math.round(it.grams), on: it.source !== "sin-datos" }));
  const totalEl = h("span", { class: "num" });
  const addBtn = h("button", { class: "btn primary block", type: "button" });
  const usedEstimate = items.some((i) => i.source === "estimado");

  const recompute = () => {
    let total = 0;
    let count = 0;
    for (const s of state) {
      if (!s.on || s.grams <= 0) continue;
      total += scaleNutrients(s.it.per100, s.grams).kcal ?? 0;
      count += 1;
    }
    totalEl.textContent = `${formatInt(total)} kcal`;
    addBtn.textContent = count === 0 ? "Elige al menos un alimento" : `Añadir ${count === 1 ? "1 alimento" : `${count} alimentos`} ${toMeal(meal)}`;
    addBtn.disabled = count === 0;
  };

  const rows = state.map((s, i) => {
    const kcalEl = h("span", { class: "kcal num" });
    const paint = () => {
      const k = scaleNutrients(s.it.per100, s.grams).kcal;
      kcalEl.textContent = k === null ? "—" : `${formatInt(k)} kcal`;
    };
    paint();
    const [cls, label] = SOURCE[s.it.source];
    const id = `g${i}`;
    return h("div", { class: "found-item" },
      h("input", { type: "checkbox", checked: s.on, disabled: s.it.source === "sin-datos", "aria-label": `Incluir ${s.it.name}`, onchange: (e) => { s.on = e.target.checked; recompute(); } }),
      h("span", { class: "name" }, s.it.name),
      kcalEl,
      h("div", { class: "controls" },
        h("div", { class: "input with-unit grams" },
          h("input", { id, type: "number", inputmode: "decimal", min: "0", step: "5", value: String(s.grams), "aria-label": `Gramos de ${s.it.name}`,
            oninput: (e) => { s.grams = Math.max(0, Number(e.target.value) || 0); paint(); recompute(); } }),
          h("span", {}, "g")),
        h("span", { class: cls }, label)));
  });

  addBtn.addEventListener("click", async () => {
    addBtn.disabled = true;
    const chosen = state.filter((s) => s.on);
    try {
      for (const s of chosen) await app.repo.addEntry(entryFromItem(s.it, s.grams, { date, meal }));
    } catch {
      toast("No se pudo guardar. Inténtalo otra vez.");
      addBtn.disabled = false;
      return;
    }
    await afterAdd(app, date, meal, chosen.length);
    app.stack.pop();
    await app.show();
  });
  recompute();

  return h("section", { class: "panel" },
    h("h2", {}, dish),
    problem ? h("p", { class: "notice" }, `${problem} Mientras tanto se usan los valores aproximados de la IA. Con tu propia clave de USDA (en Perfil) el límite es mucho mayor.`) : null,
    h("p", { class: "note" }, "Revisa los gramos: la IA los estima a ojo y es lo que más cambia el resultado."),
    rows,
    h("div", { class: "total-line" }, h("span", {}, "Total"), totalEl),
    usedEstimate ? h("p", { class: "note" }, "«Estimado» significa que USDA no encontró ese alimento y se usa el valor aproximado de la IA.") : null,
    addBtn);
}
