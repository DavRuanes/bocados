import { h, icon, brandMark } from "../dom.js";
import { backButton } from "../app.js";
import { MEALS, dateKey, keyToDate, mealTotals, dayStatus, formatInt } from "../../core/day.js";
import { mealScreen } from "./meal.js";

const DAY_FMT = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" });
export const longDate = (key) => {
  const s = DAY_FMT.format(keyToDate(key));
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// date = null significa "hoy", calculado cada vez que se pinta (cambia sola a medianoche).
export function dayScreen(app, fixedDate = null) {
  return {
    async render() {
      const date = fixedDate ?? dateKey();
      const isToday = date === dateKey();
      const target = await app.targetFor(date);
      if (isToday) await app.repo.setDayTarget(date, target);
      const entries = await app.repo.entriesForDate(date);
      const totals = mealTotals(entries);
      const eaten = MEALS.reduce((s, m) => s + totals[m.id].kcal, 0);
      const st = dayStatus(eaten, target);

      return h("main", { class: "screen" },
        isToday
          ? h("div", { class: "top" }, h("div", { class: "brand" }, brandMark(), "Bocado"))
          : h("div", { class: "top" }, backButton(app, "Historial")),
        h("header", {},
          h("h1", {}, isToday ? "Hoy" : longDate(date)),
          h("p", { class: "lede" }, isToday ? longDate(date) : `Límite de ese día: ${formatInt(target)} kcal`)),
        summaryPanel(st, totals, isToday),
        h("section", { class: "panel flush", "aria-label": "Comidas del día" },
          MEALS.map((m) => mealRow(app, date, m, totals[m.id], entries.filter((e) => e.meal === m.id), target))),
        app.repo.preview ? h("p", { class: "note" }, "Vista previa en el navegador: los datos no se guardan al cerrar.") : null,
      );
    },
  };
}

function summaryPanel(st, totals, isToday) {
  const figure = st.over
    ? h("p", { class: "figure over num" }, `${formatInt(st.overBy)} `, h("span", { class: "unit" }, "kcal de más"))
    : h("p", { class: "figure num" }, `${formatInt(st.remaining)} `, h("span", { class: "unit" }, isToday ? "kcal te quedan" : "kcal sobraron"));

  return h("section", { class: "panel", "aria-label": "Resumen del día" },
    st.over
      ? h("div", { class: "over-banner", role: "alert" }, icon("alert"),
          isToday ? "Hoy te has pasado de tu límite diario" : "Ese día te pasaste de tu límite diario")
      : null,
    h("div", { class: "today-figure" },
      figure,
      h("p", { class: "muted num" }, `Has comido ${formatInt(st.eaten)} de ${formatInt(st.target)} kcal`)),
    dayBar(st, totals));
}

// Barra del día: cada comida ocupa su parte del límite; lo que pasa del límite, en rojo.
function dayBar(st, totals) {
  const scale = Math.max(st.target, st.eaten) || 1;
  const segs = [];
  let used = 0;
  for (const m of MEALS) {
    const k = totals[m.id].kcal;
    if (k <= 0) continue;
    const inLimit = Math.max(0, Math.min(k, st.target - used));
    if (inLimit > 0) segs.push(h("span", { class: "seg", style: { width: `${(inLimit / scale) * 100}%`, background: `var(--${m.id}-mark)` } }));
    used += k;
  }
  if (st.over) segs.push(h("span", { class: "seg over", style: { width: `${(st.overBy / scale) * 100}%` } }));

  const present = MEALS.filter((m) => totals[m.id].kcal > 0);
  return h("div", { class: "daybar" },
    h("div", { class: "track", role: "img", "aria-label": `${formatInt(st.eaten)} de ${formatInt(st.target)} kcal` }, segs),
    h("div", { class: "ends num" }, h("span", {}, "0"), h("span", {}, `Límite ${formatInt(st.target)} kcal`)),
    present.length
      ? h("div", { class: "legend" },
          present.map((m) => h("span", {}, h("i", { style: { background: `var(--${m.id}-mark)` } }), m.label)),
          st.over ? h("span", {}, h("i", { style: { background: "var(--negative)" } }), "Exceso") : null)
      : null);
}

function mealRow(app, date, meal, total, items, target) {
  const sub = items.length ? items.map((e) => e.name).join(", ") : "Sin platos. Toca para añadir";
  // La baldosa muestra qué parte del límite del día se lleva esta comida.
  const share = total.count && target ? `${Math.round((total.kcal / target) * 100)} %` : "—";
  return h("button", { class: "meal-row", type: "button", onclick: () => app.push(mealScreen(app, date, meal.id)) },
    h("span", { class: `meal-tile num t-${meal.id}`, title: "Parte de tu límite diario" }, share),
    h("span", { style: { minWidth: 0 } },
      h("span", { class: "name", style: { display: "block" } }, meal.label),
      h("span", { class: "sub", style: { display: "block" } }, sub)),
    h("span", { class: "kcal num" }, total.count ? [formatInt(total.kcal), h("small", {}, " kcal")] : h("small", {}, "—")),
    icon("chev", "chev"));
}
