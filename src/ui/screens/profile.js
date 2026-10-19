import { h, toast } from "../dom.js";
import { ACTIVITY, PACES, GOALS } from "../../core/calc.js";
import { dateKey, formatInt, formatDec } from "../../core/day.js";
import { BUILT_IN_GROQ_KEY } from "../../api/groq.js";
import { startOnboarding } from "./onboarding.js";
import { isNative, exactAlarmGranted, requestExactAlarm, cancelNotifications } from "../../platform.js";

export function profileScreen(app) {
  return {
    async render() {
      const p = app.profile;
      const groqOwn = (await app.repo.getSetting("groqKey")) || "";
      const usdaOwn = (await app.repo.getSetting("usdaKey")) || "";
      const exact = await exactAlarmGranted();

      const kv = (k, v) => h("div", { class: "kv" }, h("span", { class: "muted" }, k), h("b", {}, v));

      const edit = () => startOnboarding(app, document.getElementById("app"), {
        initial: p,
        onDone: async (np) => {
          if (np) {
            await app.repo.saveProfile(np);
            app.profile = np;
            await app.repo.setDayTarget(dateKey(), np.target);
            await app.reschedule();
            toast(`Tu nuevo límite es ${formatInt(np.target)} kcal.`);
          }
          await app.setTab("perfil");
        },
      });

      const keyForm = (id, label, value, help) => {
        const input = h("input", { id, type: "password", autocomplete: "off", value, placeholder: "Pega aquí tu clave" });
        return h("form", { class: "field", onsubmit: async (ev) => {
          ev.preventDefault();
          await app.repo.setSetting(id, input.value.trim());
          toast(input.value.trim() ? "Clave guardada." : "Clave quitada.");
          await app.refresh();
        } },
          h("label", { for: id }, label),
          h("div", { style: { display: "flex", gap: "8px", minWidth: "0" } },
            h("div", { class: "input with-unit", style: { flex: "1 1 auto", minWidth: "0" } }, input),
            h("button", { class: "btn", type: "submit", style: { flex: "none" } }, "Guardar")),
          help);
      };

      const confirmBox = h("div", { class: "panel", hidden: true, role: "alertdialog", "aria-label": "Confirmar borrado de datos" },
        h("p", {}, "Se borrarán tu perfil, todas tus comidas y el historial de este móvil. No se puede deshacer."),
        h("div", { style: { display: "flex", gap: "10px", flexWrap: "wrap" } },
          h("button", { class: "btn danger", type: "button", onclick: async () => {
            await cancelNotifications().catch(() => {});
            await app.repo.reset();
            location.reload();
          } }, "Sí, borrar todo"),
          h("button", { class: "btn", type: "button", onclick: () => { confirmBox.hidden = true; } }, "Cancelar")));

      return h("main", { class: "screen" },
        h("header", {}, h("h1", {}, "Perfil"), h("p", { class: "lede" }, "Tus datos y cómo se calcula tu límite.")),
        h("section", { class: "panel" },
          h("div", { class: "today-figure" },
            h("p", { class: "figure num" }, `${formatInt(p.target)} `, h("span", { class: "unit" }, "kcal al día")),
            h("p", { class: "muted" }, p.goal === "perder" ? `Para adelgazar a ritmo ${PACES[p.pace].label.toLowerCase()}` : "Para mantener tu peso")),
          h("div", {},
            kv("Gasto en reposo", `${formatInt(p.calc.bmr)} kcal`),
            kv("Gasto diario con actividad", `${formatInt(p.calc.tdee)} kcal`),
            p.goal === "perder" ? kv("Déficit", `−${formatInt(p.calc.deficit)} kcal`) : null),
          p.calc.clampedToFloor ? h("p", { class: "notice" }, `Tu límite está en el mínimo recomendado de ${formatInt(p.calc.floor)} kcal.`) : null,
          p.calc.belowFloor ? h("p", { class: "notice" }, `Tu gasto estimado es menor que ${formatInt(p.calc.floor)} kcal, el mínimo que se recomienda no bajar sin supervisión. Te conviene consultarlo con un profesional sanitario.`) : null),
        h("section", { class: "panel" },
          h("h2", {}, "Mis datos"),
          h("div", {},
            kv("Objetivo", GOALS[p.goal].label),
            kv("Sexo", p.sex === "mujer" ? "Mujer" : "Hombre"),
            kv("Edad", `${p.age} años`),
            kv("Altura", `${formatInt(p.heightCm)} cm`),
            kv("Peso", `${formatDec(p.weightKg, p.weightKg % 1 ? 1 : 0)} kg`),
            kv("Actividad", ACTIVITY[p.activity].label)),
          h("button", { class: "btn primary block", type: "button", onclick: edit }, "Cambiar mis datos"),
          h("p", { class: "note" }, "Si cambias tu peso, el límite se recalcula desde hoy. Los días anteriores conservan el suyo.")),
        h("section", { class: "panel" },
          h("h2", {}, "Análisis de fotos y calorías"),
          keyForm("groqKey", "Clave de Groq (fotos de platos y etiquetas)", groqOwn,
            h("p", { class: "note" }, groqOwn
              ? "Usas tu propia clave."
              : BUILT_IN_GROQ_KEY ? "La app ya trae una clave incluida. Pon la tuya solo si quieres usar tu propio límite." : "Esta copia de la app no trae clave: consigue una gratis en console.groq.com y pégala aquí.")),
          keyForm("usdaKey", "Clave de USDA FoodData Central (calorías de los alimentos de la foto)", usdaOwn,
            h("p", { class: "note" }, usdaOwn
              ? "Usas tu propia clave."
              : "Sin clave se usa la clave de prueba de USDA, limitada a 30 consultas por hora y 50 al día. Consigue una gratis en api.data.gov/signup.")),
          h("p", { class: "note" }, "El escáner de códigos de barras usa Open Food Facts y no necesita clave.")),
        h("section", { class: "panel" },
          h("h2", {}, "Aviso de medianoche"),
          h("p", { class: "note" }, "Cada día a medianoche recibes una notificación con tu límite y lo que comiste. Si no te llega, activa las notificaciones de Bocado en los ajustes del móvil."),
          isNative && !exact
            ? [h("p", { class: "note" }, "Ahora Android puede retrasarla unos minutos. Para que llegue justo a las 00:00, permite a Bocado usar alarmas exactas."),
               h("button", { class: "btn block", type: "button", onclick: async () => {
                 const ok = await requestExactAlarm();
                 await app.reschedule();
                 toast(ok ? "El aviso llegará a las 00:00 en punto." : "Sin alarmas exactas, el aviso puede llegar unos minutos tarde.");
                 await app.refresh();
               } }, "Avisar a las 00:00 en punto")]
            : isNative ? h("p", { class: "note" }, "El aviso está configurado para las 00:00 en punto.") : null),
        h("button", { class: "btn danger block", type: "button", onclick: () => { confirmBox.hidden = false; confirmBox.scrollIntoView({ block: "center" }); } }, "Borrar todos mis datos"),
        confirmBox,
        h("p", { class: "meta" }, "Fuentes: Mifflin-St Jeor (Frankenfield y cols., 2005), Harvard Health, NHS. Datos de alimentos: USDA FoodData Central (dominio público) y Open Food Facts (ODbL)."));
    },
  };
}
