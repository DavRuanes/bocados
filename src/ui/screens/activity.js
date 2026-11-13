import { h, icon, toast } from "../dom.js";
import { backButton } from "../app.js";
import { dateKey, formatInt, formatDec } from "../../core/day.js";
import { parseNumber } from "../../core/profile.js";
import { longDate } from "./day.js";

export const WORKOUT_TYPES = ["Espalda", "Pierna", "Brazo", "Hombro", "Fútbol", "HIIT", "Cardio", "Caminar", "Otro"];
export const INTENSITIES = [
  { id: "baja", label: "Baja" },
  { id: "media", label: "Media" },
  { id: "alta", label: "Alta" },
];
const intensityLabel = (id) => INTENSITIES.find((i) => i.id === id)?.label ?? id;

// Panel del día: ejercicio, peso y sueño. Toca para abrir el detalle.
export async function activityPanel(app, date) {
  const workouts = await app.repo.workoutsForDate(date);
  const body = await app.repo.getBody(date);
  const minutes = workouts.reduce((s, w) => s + (Number(w.minutes) || 0), 0);
  const sub = workouts.length ? workouts.map((w) => w.type).join(", ") : "Sin ejercicio. Toca para añadir";
  const extra = [
    body.weight !== null ? `${formatDec(body.weight, 1)} kg` : null,
    body.sleep !== null ? `${formatDec(body.sleep, 1)} h de sueño` : null,
  ].filter(Boolean).join(" · ");

  return h("section", { class: "panel flush", "aria-label": "Ejercicio y descanso" },
    h("button", { class: "meal-row", type: "button", onclick: () => app.push(activityScreen(app, date)) },
      h("span", { class: "meal-tile num t-ejercicio", title: "Minutos de ejercicio" }, workouts.length ? `${formatInt(minutes)}′` : "—"),
      h("span", { style: { minWidth: 0 } },
        h("span", { class: "name", style: { display: "block" } }, "Ejercicio"),
        h("span", { class: "sub", style: { display: "block" } }, sub),
        extra ? h("span", { class: "sub", style: { display: "block" } }, extra) : null),
      h("span", { class: "kcal num" }, workouts.length ? [formatInt(workouts.length), h("small", {}, workouts.length === 1 ? " sesión" : " sesiones")] : h("small", {}, "—")),
      icon("chev", "chev")));
}

export function activityScreen(app, date) {
  let type = "Espalda";
  let intensity = "media";
  return {
    async render() {
      const isToday = date === dateKey();
      const workouts = await app.repo.workoutsForDate(date);
      const body = await app.repo.getBody(date);

      const field = (id, label, unit, attrs = {}) => h("div", { class: "field" },
        h("label", { for: id }, label),
        h("div", { class: "input with-unit" }, h("input", { id, type: "text", inputmode: "decimal", autocomplete: "off", ...attrs }), unit ? h("span", {}, unit) : null));

      const chips = (list, get, set, label) => h("div", { class: "chips", role: "radiogroup", "aria-label": label },
        list.map((it) => {
          const id = typeof it === "string" ? it : it.id;
          const text = typeof it === "string" ? it : it.label;
          return h("button", {
            class: "chip", type: "button", role: "radio", "aria-pressed": String(get() === id), "aria-checked": String(get() === id),
            onclick: (ev) => {
              set(id);
              ev.currentTarget.parentElement.querySelectorAll(".chip").forEach((c) => {
                const on = c === ev.currentTarget;
                c.setAttribute("aria-pressed", String(on)); c.setAttribute("aria-checked", String(on));
              });
            },
          }, text);
        }));

      const err = h("p", { class: "error", hidden: true, role: "alert" });
      const addWorkout = async (ev) => {
        ev.preventDefault();
        const f = ev.target;
        const minutes = f.elements.wmin.value.trim() === "" ? 0 : parseNumber(f.elements.wmin.value);
        if (!Number.isFinite(minutes) || minutes < 0 || minutes > 600) {
          err.textContent = "Escribe los minutos como un número (por ejemplo, 60)."; err.hidden = false; return;
        }
        try {
          await app.repo.addWorkout({ date, type, minutes, intensity, notes: f.elements.wnotes.value.trim() });
        } catch {
          err.textContent = "No se pudo guardar. Inténtalo otra vez."; err.hidden = false; return;
        }
        toast(`${type} añadido.`);
        await app.show();
      };

      const bodyErr = h("p", { class: "error", hidden: true, role: "alert" });
      const saveBody = async (ev) => {
        ev.preventDefault();
        const f = ev.target;
        const opt = (k) => (f.elements[k].value.trim() === "" ? null : parseNumber(f.elements[k].value));
        const weight = opt("bweight"), sleep = opt("bsleep");
        const bad = weight !== null && (!Number.isFinite(weight) || weight < 30 || weight > 300) ? "El peso tiene que estar entre 30 y 300 kg."
          : sleep !== null && (!Number.isFinite(sleep) || sleep < 0 || sleep > 24) ? "Las horas de sueño tienen que estar entre 0 y 24." : "";
        if (bad) { bodyErr.textContent = bad; bodyErr.hidden = false; return; }
        try { await app.repo.setBody(date, { weight, sleep }); } catch {
          bodyErr.textContent = "No se pudo guardar. Inténtalo otra vez."; bodyErr.hidden = false; return;
        }
        toast("Peso y sueño guardados.");
        await app.show();
      };

      return h("main", { class: "screen" },
        h("div", { class: "top" }, backButton(app, isToday ? "Hoy" : "Día")),
        h("header", {}, h("h1", {}, "Ejercicio y descanso"), h("p", { class: "lede" }, isToday ? "Hoy" : longDate(date))),

        h("section", { class: "panel flush", "aria-label": "Ejercicio del día" },
          h("h2", { style: { padding: "12px 20px 4px" } }, "Ejercicio"),
          workouts.length
            ? workouts.map((w) => h("div", { class: "item-row", style: { cursor: "default" } },
                h("span", { class: "name" }, w.type),
                h("button", {
                  class: "btn text", type: "button", "aria-label": `Quitar ${w.type}`,
                  onclick: async () => {
                    try { await app.repo.deleteWorkout(w.id); } catch { toast("No se pudo borrar. Inténtalo otra vez."); return; }
                    toast(`${w.type} quitado.`); await app.show();
                  },
                }, "Quitar"),
                h("span", { class: "sub num" },
                  `${formatInt(w.minutes)} min`, h("span", { class: "pill" }, `Intensidad ${intensityLabel(w.intensity).toLowerCase()}`),
                  w.notes ? h("span", { style: { overflowWrap: "anywhere" } }, w.notes) : null)))
            : h("p", { class: "empty-line" }, "Todavía no has apuntado ejercicio este día.")),

        h("form", { class: "panel", onsubmit: addWorkout, novalidate: true },
          h("h2", {}, "Añadir ejercicio"),
          h("div", { class: "field" }, h("span", { class: "label" }, "Qué has hecho"), chips(WORKOUT_TYPES, () => type, (v) => { type = v; }, "Tipo de ejercicio")),
          field("wmin", "Duración", "min", { inputmode: "numeric", value: "60" }),
          h("div", { class: "field" }, h("span", { class: "label" }, "Intensidad"), chips(INTENSITIES, () => intensity, (v) => { intensity = v; }, "Intensidad")),
          field("wnotes", "Detalle (opcional)", "", { inputmode: "text", maxlength: "200", placeholder: "Jalón al pecho 12×40, 12×50, 12×60" }),
          err,
          h("button", { class: "btn primary block", type: "submit" }, "Añadir ejercicio")),

        h("form", { class: "panel", onsubmit: saveBody, novalidate: true },
          h("h2", {}, "Peso y sueño"),
          h("div", { style: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px" } },
            field("bweight", "Peso en ayunas", "kg", { value: body.weight ?? "" }),
            field("bsleep", "Sueño anoche", "h", { value: body.sleep ?? "" })),
          bodyErr,
          h("button", { class: "btn block", type: "submit" }, "Guardar peso y sueño")),
      );
    },
  };
}
