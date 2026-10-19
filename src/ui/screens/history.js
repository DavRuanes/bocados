import { h, icon } from "../dom.js";
import { dateKey, formatInt } from "../../core/day.js";
import { longDate, dayScreen } from "./day.js";

export function historyScreen(app) {
  return {
    async render() {
      const days = (await app.repo.daySummaries(90)).filter((d) => d.date !== dateKey());
      const over = days.filter((d) => d.kcal > d.target).length;
      return h("main", { class: "screen" },
        h("header", {}, h("h1", {}, "Historial"),
          h("p", { class: "lede" }, days.length
            ? `${days.length} ${days.length === 1 ? "día anotado" : "días anotados"}, ${over === 0 ? "ninguno por encima del límite" : `${over} por encima del límite`}.`
            : "Aquí verás cada día que anotes, con lo que comiste frente a tu límite.")),
        h("section", { class: "panel flush", "aria-label": "Días anteriores" },
          days.length
            ? days.map((d) => {
                const isOver = d.kcal > d.target;
                const ratio = Math.min(1, d.kcal / (d.target || 1));
                return h("button", { class: "day-row", type: "button", onclick: () => app.push(dayScreen(app, d.date)) },
                  h("span", { class: "name" }, longDate(d.date)),
                  h("span", { class: "kcal" }, `${formatInt(d.kcal)}`, h("small", {}, ` / ${formatInt(d.target)} kcal`)),
                  h("span", { class: "mini", "aria-hidden": "true" }, h("i", { class: isOver ? "over" : false, style: { width: `${ratio * 100}%` } })),
                  isOver ? h("span", { class: "pill negative", style: { gridColumn: "1 / -1", justifySelf: "start" } }, `${formatInt(d.kcal - d.target)} kcal por encima`) : null);
              })
            : h("p", { class: "empty-line" }, "Todavía no hay días anteriores. Lo que anotes hoy aparecerá aquí mañana.")),
        h("button", { class: "btn block", type: "button", onclick: () => app.setTab("hoy") }, icon("today"), "Ir a hoy"));
    },
  };
}
