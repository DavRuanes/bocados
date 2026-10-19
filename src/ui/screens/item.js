import { h, toast } from "../dom.js";
import { backButton } from "../app.js";
import { scaleNutrients, dateKey, formatInt, formatDec } from "../../core/day.js";
import { mealById, sourcePill, gramsField, nutritionTable } from "./common.js";

// Ver, cambiar los gramos o borrar un plato ya añadido.
export function itemScreen(app, entry) {
  return {
    render() {
      const per100 = entry.detail?.per100;
      const scalable = per100 && per100.kcal !== null && per100.kcal !== undefined;
      let grams = entry.grams;
      const figure = h("p", { class: "figure num" });
      const tableWrap = h("div", {});
      const paint = () => {
        const kcal = scalable ? scaleNutrients(per100, grams).kcal : entry.kcal;
        figure.replaceChildren(`${formatInt(kcal)} `, h("span", { class: "unit" }, "kcal"));
        if (scalable) tableWrap.replaceChildren(nutritionTable(per100, grams));
      };
      paint();

      const save = async () => {
        const s = scaleNutrients(per100, grams);
        await app.repo.updateEntry(entry.id, { grams, kcal: s.kcal ?? 0, prot: s.prot ?? null, hc: s.hc ?? null, grasa: s.grasa ?? null });
        if (entry.date === dateKey()) await app.reschedule();
        toast("Cambios guardados.");
        await app.back();
      };

      const confirmBox = h("div", { class: "panel", hidden: true, role: "alertdialog", "aria-label": "Confirmar borrado" },
        h("p", {}, `¿Borrar «${entry.name}» de ${mealById(entry.meal).label.toLowerCase()}?`),
        h("div", { style: { display: "flex", gap: "10px", flexWrap: "wrap" } },
          h("button", { class: "btn danger", type: "button", onclick: async () => {
            await app.repo.deleteEntry(entry.id);
            if (entry.date === dateKey()) await app.reschedule();
            toast("Plato borrado.");
            await app.back();
          } }, "Sí, borrar"),
          h("button", { class: "btn", type: "button", onclick: () => { confirmBox.hidden = true; } }, "Cancelar")));

      return h("main", { class: "screen" },
        h("div", { class: "top" }, backButton(app)),
        h("header", {}, h("h1", {}, entry.name),
          h("p", { class: "lede", style: { display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" } },
            mealById(entry.meal).label, sourcePill(entry))),
        h("section", { class: "panel" },
          h("div", { class: "today-figure" }, figure,
            !scalable ? h("p", { class: "muted num" }, `${formatDec(entry.grams, 0)} g, añadido a mano`) : null),
          scalable ? gramsField("igrams", grams, (g) => { grams = g; paint(); }) : null,
          scalable ? h("button", { class: "btn primary block", type: "button", onclick: save }, "Guardar cambios") : null),
        scalable ? h("section", { class: "panel" }, h("h2", {}, "Información nutricional"), tableWrap) : null,
        entry.detail?.originName ? h("p", { class: "meta" }, `Valores de USDA FoodData Central: ${entry.detail.originName}.`) : null,
        h("button", { class: "btn danger block", type: "button", onclick: () => { confirmBox.hidden = false; confirmBox.scrollIntoView({ block: "center" }); } }, "Borrar este plato"),
        confirmBox);
    },
  };
}
