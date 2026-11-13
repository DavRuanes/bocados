import { h, icon, toast } from "../dom.js";
import { buildExport } from "../../core/export.js";
import { dateKey, formatInt } from "../../core/day.js";
import { longDate, dayScreen } from "./day.js";
import { formatDec } from "../../core/day.js";

// Ejercicio, peso y sueño del día, en una línea bajo la barra.
function activityLine(d) {
  const parts = [
    d.workouts?.length ? d.workouts.join(", ") : null,
    d.weight !== null && d.weight !== undefined ? `${formatDec(d.weight, 1)} kg` : null,
    d.sleep !== null && d.sleep !== undefined ? `${formatDec(d.sleep, 1)} h de sueño` : null,
  ].filter(Boolean);
  return parts.length ? h("span", { class: "muted small", style: { gridColumn: "1 / -1" } }, parts.join(" · ")) : null;
}

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
                  activityLine(d),
                  isOver ? h("span", { class: "pill negative", style: { gridColumn: "1 / -1", justifySelf: "start" } }, `${formatInt(d.kcal - d.target)} kcal por encima`) : null);
              })
            : h("p", { class: "empty-line" }, "Todavía no hay días anteriores. Lo que anotes hoy aparecerá aquí mañana.")),
        exportPanel(app),
        h("button", { class: "btn block", type: "button", onclick: () => app.setTab("hoy") }, icon("today"), "Ir a hoy"));
    },
  };
}

// Copia los últimos 7 días (hoy incluido) como texto para pegárselo a Claude.
function exportPanel(app) {
  const box = h("textarea", { class: "input", readonly: true, rows: "8", hidden: true, style: { padding: "12px 14px", fontSize: "14px", minHeight: "160px" }, "aria-label": "Resumen para copiar" });
  const copy = async () => {
    const all = await app.repo.daySummaries(60);
    const dates = [...new Set([dateKey(), ...all.map((d) => d.date)])].sort().reverse().slice(0, 7);
    const days = [];
    for (const date of dates) {
      days.push({
        date, target: await app.targetFor(date),
        entries: await app.repo.entriesForDate(date),
        workouts: await app.repo.workoutsForDate(date),
        body: await app.repo.getBody(date),
      });
    }
    const text = buildExport(app.profile, days);
    try {
      await navigator.clipboard.writeText(text);
      toast("Copiado. Pégalo en tu chat con Claude.");
      box.hidden = true;
    } catch {
      box.value = text; box.hidden = false; box.focus(); box.select();
      toast("Mantén pulsado el texto y elige Copiar.");
    }
  };
  return h("section", { class: "panel", "aria-label": "Compartir con Claude" },
    h("h2", {}, "Compartir con Claude"),
    h("p", { class: "muted small" }, "Copia tus últimos 7 días (comidas, ejercicio, peso y sueño) y pégalos en el chat para que revise cómo vas."),
    h("button", { class: "btn primary block", type: "button", onclick: copy }, "Copiar resumen de la semana"),
    box);
}
