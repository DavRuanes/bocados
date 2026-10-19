import { h, toast } from "../dom.js";
import { backButton } from "../app.js";
import { MEALS, scaleNutrients, dateKey, formatInt } from "../../core/day.js";
import { parseNumber } from "../../core/profile.js";
import { mealById, sourcePill, gramsField, nutritionTable } from "./common.js";

// Ver, cambiar o borrar un plato ya añadido. Con valores por 100 g, los gramos recalculan
// todo; si no (añadido a mano o sin datos), se editan directamente calorías y gramos.
export function itemScreen(app, entry) {
  return {
    render() {
      const per100 = entry.detail?.per100;
      const scalable = per100 && per100.kcal !== null && per100.kcal !== undefined;
      let grams = entry.grams;
      let meal = entry.meal;
      const err = h("p", { class: "error", hidden: true, role: "alert" });

      const nameInput = h("input", { id: "iname", type: "text", maxlength: "80", value: entry.name, autocomplete: "off" });
      const kcalInput = h("input", { id: "ikcal", type: "text", inputmode: "decimal", value: String(Math.round(entry.kcal)) });
      const gramsInput = h("input", { id: "igrams-free", type: "text", inputmode: "decimal", value: entry.grams ? String(entry.grams) : "" });

      const figure = h("p", { class: "figure num" });
      const tableWrap = h("div", {});
      const paint = () => {
        if (!scalable) return;
        figure.replaceChildren(`${formatInt(scaleNutrients(per100, grams).kcal)} `, h("span", { class: "unit" }, "kcal"));
        tableWrap.replaceChildren(nutritionTable(per100, grams));
      };
      paint();

      const mealChips = h("div", { class: "chips", role: "radiogroup", "aria-label": "Comida" },
        MEALS.map((m) => h("button", {
          class: "chip", type: "button", role: "radio", "aria-pressed": String(m.id === meal), "aria-checked": String(m.id === meal),
          onclick: (ev) => {
            meal = m.id;
            for (const c of mealChips.children) { const on = c === ev.currentTarget; c.setAttribute("aria-pressed", String(on)); c.setAttribute("aria-checked", String(on)); }
          },
        }, m.label)));

      const save = async () => {
        const name = nameInput.value.trim();
        let patch;
        if (scalable) {
          if (grams <= 0) return showErr("Escribe cuántos gramos has comido.");
          const s = scaleNutrients(per100, grams);
          patch = { grams, kcal: s.kcal ?? 0, prot: s.prot ?? null, hc: s.hc ?? null, grasa: s.grasa ?? null };
        } else {
          const kcal = parseNumber(kcalInput.value);
          const g = gramsInput.value.trim() === "" ? 0 : parseNumber(gramsInput.value);
          if (!Number.isFinite(kcal) || kcal > 5000) return showErr("Escribe las calorías como un número (por ejemplo, 250).");
          if (!Number.isFinite(g)) return showErr("Los gramos tienen que ser un número.");
          patch = { kcal, grams: g };
        }
        if (!name) return showErr("El plato necesita un nombre.");
        try {
          await app.repo.updateEntry(entry.id, { ...patch, name: name.slice(0, 80), meal });
        } catch {
          return showErr("No se pudo guardar. Inténtalo otra vez.");
        }
        if (entry.date === dateKey()) await app.reschedule();
        toast("Cambios guardados.");
        await app.back();
      };
      const showErr = (msg) => { err.textContent = msg; err.hidden = false; };

      const confirmBox = h("div", { class: "panel", hidden: true, role: "alertdialog", "aria-label": "Confirmar borrado" },
        h("p", {}, `¿Borrar «${entry.name}» de ${mealById(entry.meal).label.toLowerCase()}?`),
        h("div", { style: { display: "flex", gap: "10px", flexWrap: "wrap" } },
          h("button", { class: "btn danger", type: "button", onclick: async () => {
            try { await app.repo.deleteEntry(entry.id); } catch { toast("No se pudo borrar. Inténtalo otra vez."); return; }
            if (entry.date === dateKey()) await app.reschedule();
            toast("Plato borrado.");
            await app.back();
          } }, "Sí, borrar"),
          h("button", { class: "btn", type: "button", onclick: () => { confirmBox.hidden = true; } }, "Cancelar")));

      const field = (id, label, input, unit) => h("div", { class: "field" },
        h("label", { for: id }, label), h("div", { class: "input with-unit" }, input, unit ? h("span", {}, unit) : null));

      return h("main", { class: "screen" },
        h("div", { class: "top" }, backButton(app)),
        h("header", {}, h("h1", {}, entry.name),
          h("p", { class: "lede", style: { display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" } },
            mealById(entry.meal).label, sourcePill(entry))),
        h("section", { class: "panel" },
          scalable ? h("div", { class: "today-figure" }, figure) : null,
          scalable ? gramsField("igrams", grams, (g) => { grams = g; paint(); }) : field("ikcal", "Calorías en total", kcalInput, "kcal"),
          scalable ? null : field("igrams-free", "Cantidad (opcional)", gramsInput, "g"),
          field("iname", "Nombre", nameInput),
          h("div", { class: "field" }, h("span", { class: "label" }, "Comida"), mealChips),
          err,
          h("button", { class: "btn primary block", type: "button", onclick: save }, "Guardar cambios")),
        scalable ? h("section", { class: "panel" }, h("h2", {}, "Información nutricional"), tableWrap) : null,
        entry.detail?.originName ? h("p", { class: "meta" }, `Valores de USDA FoodData Central: ${entry.detail.originName}.`) : null,
        h("button", { class: "btn danger block", type: "button", onclick: () => { confirmBox.hidden = false; confirmBox.scrollIntoView({ block: "center" }); } }, "Borrar este plato"),
        confirmBox);
    },
  };
}
