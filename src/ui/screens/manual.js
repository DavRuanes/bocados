import { h } from "../dom.js";
import { backButton } from "../app.js";
import { parseNumber } from "../../core/profile.js";
import { afterAdd, toMeal } from "./common.js";

export function manualScreen(app, date, meal) {
  return {
    render() {
      const field = (id, label, unit, attrs = {}) => h("div", { class: "field" },
        h("label", { for: id }, label),
        h("div", { class: "input with-unit" }, h("input", { id, type: "text", inputmode: "decimal", autocomplete: "off", ...attrs }), unit ? h("span", {}, unit) : null));
      const err = h("p", { class: "error", hidden: true, role: "alert" });

      const submit = async (ev) => {
        ev.preventDefault();
        const f = ev.target;
        const name = f.elements.mname.value.trim();
        const kcal = parseNumber(f.elements.mkcal.value);
        const grams = f.elements.mgrams.value.trim() === "" ? 0 : parseNumber(f.elements.mgrams.value);
        const opt = (k) => (f.elements[k].value.trim() === "" ? null : parseNumber(f.elements[k].value));
        const prot = opt("mprot"), hc = opt("mhc"), grasa = opt("mgrasa");
        const bad = !name ? "Escribe qué has comido."
          : !Number.isFinite(kcal) || kcal > 5000 ? "Escribe las calorías como un número (por ejemplo, 250)."
          : !Number.isFinite(grams) ? "Los gramos tienen que ser un número."
          : [prot, hc, grasa].some((v) => v !== null && !Number.isFinite(v)) ? "Proteínas, hidratos y grasas tienen que ser números." : "";
        if (bad) { err.textContent = bad; err.hidden = false; return; }
        try {
          await app.repo.addEntry({ date, meal, name: name.slice(0, 80), grams, kcal, prot, hc, grasa, source: "manual", detail: { origin: "manual" } });
        } catch {
          err.textContent = "No se pudo guardar. Inténtalo otra vez.";
          err.hidden = false;
          return;
        }
        await afterAdd(app, date, meal);
        app.stack.pop();
        await app.show();
      };

      return h("main", { class: "screen" },
        h("div", { class: "top" }, backButton(app)),
        h("header", {}, h("h1", {}, "Añadir a mano"), h("p", { class: "lede" }, "Para cuando sabes las calorías o no tienes el envase a mano.")),
        h("form", { class: "panel", onsubmit: submit, novalidate: true },
          field("mname", "Qué has comido", "", { inputmode: "text", maxlength: "80", placeholder: "Tortilla de patatas" }),
          field("mkcal", "Calorías en total", "kcal"),
          field("mgrams", "Cantidad (opcional)", "g"),
          h("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px" } },
            field("mprot", "Proteínas", "g"), field("mhc", "Hidratos", "g"), field("mgrasa", "Grasas", "g")),
          err,
          h("button", { class: "btn primary block", type: "submit" }, `Añadir ${toMeal(meal)}`)));
    },
  };
}
