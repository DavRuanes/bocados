import { h, icon } from "../dom.js";
import { backButton } from "../app.js";
import { dateKey, sumEntries, dayStatus, formatInt, formatDec } from "../../core/day.js";
import { scanAvailable } from "../../platform.js";
import { mealById, sourcePill } from "./common.js";
import { longDate } from "./day.js";
import { scanFlow, codeEntryScreen } from "./scan.js";
import { photoScreen } from "./photo.js";
import { manualScreen } from "./manual.js";
import { itemScreen } from "./item.js";

export function mealScreen(app, date, mealId) {
  const meal = mealById(mealId);
  return {
    async render() {
      const entries = await app.repo.entriesForDate(date);
      const mine = entries.filter((e) => e.meal === mealId);
      const total = sumEntries(mine).kcal;
      const target = await app.targetFor(date);
      const st = dayStatus(sumEntries(entries).kcal, target);
      const share = mine.length && target ? `${Math.round((total / target) * 100)} %` : "—";
      const isToday = date === dateKey();

      return h("main", { class: "screen" },
        h("div", { class: "top" }, backButton(app, isToday ? "Hoy" : "Día")),
        h("header", { class: "meal-head" },
          h("span", { class: `meal-tile num t-${mealId}`, title: "Parte de tu límite diario" }, share),
          h("div", {}, h("h1", {}, meal.label), h("p", { class: "lede" }, isToday ? "Hoy" : longDate(date))),
          h("div", { class: "total num" }, h("b", {}, `${formatInt(total)} kcal`), h("span", { class: "meta" }, `${mine.length} ${mine.length === 1 ? "plato" : "platos"}`))),
        st.over ? h("div", { class: "over-banner", role: "alert" }, icon("alert"),
          isToday ? "Hoy te has pasado de tu límite diario" : "Ese día te pasaste de tu límite diario") : null,
        h("div", { class: "actions" },
          h("button", {
            class: "btn primary big block", type: "button",
            onclick: () => (scanAvailable ? scanFlow(app, date, mealId) : app.push(codeEntryScreen(app, date, mealId))),
          }, icon("barcode"), "Escanear código de barras"),
          h("button", { class: "btn big block", type: "button", onclick: () => app.push(photoScreen(app, date, mealId)) },
            icon("camera"), "Foto del plato"),
          h("div", { style: { display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap" } },
            scanAvailable ? h("button", { class: "btn text", type: "button", onclick: () => app.push(codeEntryScreen(app, date, mealId)) }, "Escribir el código") : null,
            h("button", { class: "btn text", type: "button", onclick: () => app.push(manualScreen(app, date, mealId)) }, icon("pencil"), "Añadir a mano"))),
        h("section", { class: "panel flush", "aria-label": `Platos de ${meal.label}` },
          h("h2", { style: { padding: "12px 20px 4px" } }, "Platos"),
          mine.length
            ? mine.map((e) => h("button", { class: "item-row", type: "button", onclick: () => app.push(itemScreen(app, e)) },
                h("span", { class: "name" }, e.name),
                h("span", { class: "kcal num" }, `${formatInt(e.kcal)} kcal`),
                h("span", { class: "sub num" }, `${formatDec(e.grams, 0)} g`, sourcePill(e))))
            : h("p", { class: "empty-line" }, `Todavía no has añadido nada ${mealId === "desayuno" ? "al desayuno" : `a la ${meal.label.toLowerCase()}`}. Escanea un producto o haz una foto del plato.`)),
      );
    },
  };
}
