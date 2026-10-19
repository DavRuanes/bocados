import { h, icon, brandMark } from "../dom.js";
import { ACTIVITY, PACES, GOALS, dailyTarget } from "../../core/calc.js";
import { validateProfile } from "../../core/profile.js";
import { dateKey, formatInt } from "../../core/day.js";

// Preguntas de la primera vez (y de "Cambiar mis datos").
export function startOnboarding(app, root, { initial = null, onDone }) {
  const answers = initial
    ? { goal: initial.goal, sex: initial.sex, age: String(initial.age), heightCm: String(initial.heightCm), weightKg: String(initial.weightKg).replace(".", ","), activity: initial.activity, pace: initial.pace || "" }
    : { goal: "", sex: "", age: "", heightCm: "", weightKg: "", activity: "", pace: "" };

  const steps = () => [
    ...(initial ? [] : ["welcome"]),
    "goal", "sex", "age", "heightCm", "weightKg", "activity",
    ...(answers.goal === "perder" ? ["pace"] : []),
    "result",
  ];
  let i = 0;

  const go = (delta) => {
    i = Math.max(0, Math.min(steps().length - 1, i + delta));
    render();
  };

  function render() {
    const list = steps();
    const step = list[i];
    const qSteps = list.filter((s) => s !== "welcome");
    const progress = Math.round(((qSteps.indexOf(step) + 1) / qSteps.length) * 100);
    root.className = "onboarding";
    root.replaceChildren(h("main", { class: "ob" },
      h("div", { class: "top" },
        i > 0 || initial
          ? h("button", { class: "back", type: "button", onclick: () => (i === 0 ? onDone(null) : go(-1)) }, icon("back"), i === 0 ? "Cancelar" : "Atrás")
          : h("div", { class: "brand" }, brandMark(), "Bocado"),
        step !== "welcome" ? h("span", { class: "meta num" }, `${qSteps.indexOf(step) + 1} de ${qSteps.length}`) : null),
      step !== "welcome" ? h("div", { class: "progress", role: "progressbar", "aria-valuenow": String(progress), "aria-valuemin": "0", "aria-valuemax": "100" }, h("i", { style: { width: `${progress}%` } })) : null,
      STEP[step]()));
    root.querySelector("input")?.focus();
  }

  const choice = (key, value, title, hint, next = true) => h("button", {
    class: "choice", type: "button", role: "radio", "aria-checked": String(answers[key] === value),
    onclick: () => { answers[key] = value; if (next) go(1); else render(); },
  }, h("span", {}, h("b", {}, title), hint ? h("span", {}, hint) : null), h("span", { class: "tick" }, answers[key] === value ? icon("check") : null));

  const question = (title, lede) => h("div", { class: "q" }, h("h1", {}, title), lede ? h("p", { class: "lede" }, lede) : null);

  const numberStep = (key, title, lede, unit, attrs) => () => {
    const input = h("input", { id: key, type: "text", inputmode: "decimal", autocomplete: "off", value: answers[key], "aria-label": title, ...attrs });
    const err = h("p", { class: "error", hidden: true, role: "alert" });
    const submit = (ev) => {
      ev.preventDefault();
      answers[key] = input.value;
      const r = validateProfile({ ...answers });
      if (r.errors[key]) { err.textContent = r.errors[key]; err.hidden = false; return; }
      go(1);
    };
    return h("form", { onsubmit: submit, novalidate: true, style: { display: "contents" } },
      question(title, lede),
      h("div", { class: "big-input" }, input, h("span", {}, unit)),
      err,
      h("div", { class: "foot" }, h("button", { class: "btn primary block big", type: "submit" }, "Siguiente")));
  };

  const STEP = {
    welcome: () => [
      question("Tu límite de calorías, cada día", "Te haré unas preguntas para calcular cuántas calorías necesitas. Tus respuestas se guardan solo en este móvil."),
      h("section", { class: "panel" },
        h("p", {}, "Con tu peso, altura, edad, sexo y actividad calculo lo que gastas al día. Si quieres adelgazar, le resto un déficit y ese será tu límite."),
        h("p", { class: "note" }, "Es una estimación. Si tienes alguna enfermedad, estás embarazada o has tenido problemas con la comida, consúltalo antes con un profesional sanitario.")),
      h("div", { class: "foot" }, h("button", { class: "btn primary block big", type: "button", onclick: () => go(1) }, "Empezar")),
    ],
    goal: () => [
      question("¿Qué quieres conseguir?"),
      h("div", { class: "choices", role: "radiogroup" },
        choice("goal", "perder", GOALS.perder.label, "Comer algo menos de lo que gastas"),
        choice("goal", "mantener", GOALS.mantener.label, "Comer lo mismo que gastas")),
    ],
    sex: () => [
      question("¿Eres hombre o mujer?", "La fórmula usa valores distintos para cada uno."),
      h("div", { class: "choices", role: "radiogroup" },
        choice("sex", "hombre", "Hombre"),
        choice("sex", "mujer", "Mujer")),
    ],
    age: numberStep("age", "¿Cuántos años tienes?", null, "años", { inputmode: "numeric", maxlength: "3" }),
    heightCm: numberStep("heightCm", "¿Cuánto mides?", "En centímetros, por ejemplo 172.", "cm", { inputmode: "numeric", maxlength: "3" }),
    weightKg: numberStep("weightKg", "¿Cuánto pesas ahora?", "En kilos. Puedes usar decimales, por ejemplo 78,5.", "kg", { maxlength: "5" }),
    activity: () => [
      question("¿Cuánto te mueves?", "Piensa en una semana normal."),
      h("div", { class: "choices", role: "radiogroup" },
        Object.entries(ACTIVITY).map(([id, a]) => choice("activity", id, a.label, a.hint))),
    ],
    pace: () => [
      question("¿A qué ritmo quieres adelgazar?", "Cuanto más rápido, más hambre. Nunca bajaré de un mínimo seguro."),
      h("div", { class: "choices", role: "radiogroup" },
        Object.entries(PACES).map(([id, p]) => choice("pace", id, p.label, p.hint))),
    ],
    result: () => {
      const v = validateProfile(answers);
      if (!v.ok) {
        const firstBad = steps().findIndex((s) => v.errors[s]);
        return [question("Falta algún dato"), h("p", { class: "error" }, Object.values(v.errors)[0]),
          h("div", { class: "foot" }, h("button", { class: "btn primary block big", type: "button", onclick: () => { i = Math.max(0, firstBad); render(); } }, "Corregirlo"))];
      }
      const p = v.profile;
      const c = dailyTarget(p);
      const factor = ACTIVITY[p.activity].factor;
      const finish = () => onDone({ ...p, target: c.target, calc: c, updatedAt: new Date().toISOString(), since: initial?.since ?? dateKey() });
      return [
        question("Tu límite diario"),
        h("section", { class: "panel" },
          h("div", { class: "today-figure" }, h("p", { class: "figure num" }, `${formatInt(c.target)} `, h("span", { class: "unit" }, "kcal al día"))),
          h("div", { class: "calc" },
            h("div", { class: "row" }, h("span", {}, "Gasto en reposo"), h("b", { class: "num" }, `${formatInt(c.bmr)} kcal`)),
            h("div", { class: "row" }, h("span", {}, `Con tu actividad (× ${String(factor).replace(".", ",")})`), h("b", { class: "num" }, `${formatInt(c.tdee)} kcal`)),
            p.goal === "perder" ? h("div", { class: "row" }, h("span", {}, "Déficit para adelgazar"), h("b", { class: "num" }, `−${formatInt(c.deficit)} kcal`)) : null,
            h("div", { class: "row total" }, h("span", {}, "Tu límite"), h("b", { class: "num" }, `${formatInt(c.target)} kcal`))),
          c.clampedToFloor
            ? h("p", { class: "notice" }, `He subido tu límite a ${formatInt(c.floor)} kcal, el mínimo recomendado para ${p.sex === "mujer" ? "mujeres" : "hombres"} sin supervisión de un profesional.`)
            : null),
        h("p", { class: "formula" },
          `Fórmula de Mifflin-St Jeor: 10 × peso + 6,25 × altura − 5 × edad ${p.sex === "hombre" ? "+ 5" : "− 161"}, multiplicado por tu nivel de actividad. `,
          "Déficit y mínimos según Harvard Health. Es una estimación: revisa tu peso cada semana y ajusta tus datos si hace falta."),
        h("div", { class: "foot" }, h("button", { class: "btn primary block big", type: "button", onclick: finish }, initial ? "Guardar mis datos" : "Empezar a contar")),
      ];
    },
  };

  render();
}
