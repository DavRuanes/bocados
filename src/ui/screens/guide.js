import { h } from "../dom.js";
import { backButton } from "../app.js";
import { GOALS, PACES, proteinTarget, proteinPerMeal, MUSCLE_SURPLUS, RECOMP_DEFICIT } from "../../core/calc.js";
import { formatInt } from "../../core/day.js";

// "Qué tienes que hacer": lo que significa tu objetivo, en cifras, con sus fuentes.
export function guideScreen(app) {
  return {
    render() {
      const p = app.profile;
      const c = p.calc;
      const prot = proteinTarget(p);
      const perMeal = proteinPerMeal(p.weightKg);
      const li = (...t) => h("li", {}, ...t);
      const steps = [];
      let intro;
      let sources;

      if (p.goal === "perder") {
        intro = c.clampedToFloor
          ? `Tu límite es ${formatInt(c.target)} kcal, el mínimo recomendado sin supervisión, porque restarle el déficit a tu gasto estimado de ${formatInt(c.tdee)} kcal te dejaría por debajo. Te conviene consultar con un profesional sanitario cómo adelgazar con seguridad.`
          : `Para adelgazar comes cada día menos de lo que gastas. Tu límite es ${formatInt(c.target)} kcal: ${formatInt(c.deficit)} kcal menos que tu gasto estimado de ${formatInt(c.tdee)} kcal.`;
        steps.push(
          li(`Intenta no pasar de ${formatInt(c.target)} kcal al día. Si un día te pasas, al siguiente vuelve a tu límite.`),
          li(`Ritmo ${PACES[p.pace].label.toLowerCase()}: ${PACES[p.pace].hint}. Harvard Health considera seguro un déficit de 500 a 1.000 kcal al día.`),
          li("Pésate una vez por semana, a la misma hora. Si cambia tu peso, actualiza tus datos en Perfil para recalcular el límite."),
          li(`Nunca bajes de ${formatInt(c.floor)} kcal al día sin supervisión de un profesional.`));
        sources = "Fuentes: Harvard Health, NHS, Mifflin-St Jeor (Frankenfield y cols., 2005).";
      } else if (p.goal === "mantener") {
        intro = `Para mantener tu peso comes más o menos lo que gastas: unas ${formatInt(c.target)} kcal al día.`;
        steps.push(
          li("Intenta quedarte cerca de tu límite cada día; pasarte de vez en cuando no pasa nada."),
          li("Pésate una vez por semana. Si subes o bajas de forma constante, actualiza tus datos o cambia de objetivo."));
        sources = "Fuentes: Mifflin-St Jeor (Frankenfield y cols., 2005), NHS.";
      } else if (p.goal === "musculo") {
        intro = `Para ganar masa muscular comes un poco más de lo que gastas y mucha proteína, mientras entrenas fuerza. Tu límite es ${formatInt(c.target)} kcal: un ${Math.round(MUSCLE_SURPLUS * 100)} % más que tu gasto de ${formatInt(c.tdee)} kcal.`
          + (c.belowFloor ? ` Aun así queda por debajo de ${formatInt(c.floor)} kcal, el mínimo recomendado: consúltalo con un profesional sanitario.` : "");
        steps.push(
          li(`Proteína: unos ${formatInt(prot)} g al día (1,6 g por kilo). Un metaanálisis vio que por encima de 1,6 g/kg ya no se ganaba más músculo.`),
          li(`Repártela en 3 a 6 comidas, unos ${formatInt(perMeal)} g en cada una.`),
          li("Superávit pequeño: según la revisión de Iraki y cols., un superávit grande añade grasa que no necesitas."),
          li("Busca subir entre un 0,25 % y un 0,5 % de tu peso por semana. Si subes más rápido, baja un poco; si no subes, come algo más."),
          li("Entrena fuerza de forma regular: la comida da los materiales, pero el entrenamiento es lo que hace crecer el músculo."));
        sources = "Fuentes: Iraki y cols. 2019 (superávit, ritmo y reparto), Morton y cols. 2018 (proteína), ISSN 2017.";
      } else {
        intro = c.clampedToFloor
          ? `Tu límite es ${formatInt(c.target)} kcal, el mínimo recomendado sin supervisión, porque restar ${formatInt(RECOMP_DEFICIT)} kcal a tu gasto de ${formatInt(c.tdee)} kcal te dejaría por debajo. Te conviene consultarlo con un profesional sanitario.`
          : `Para ganar músculo y perder grasa a la vez comes algo menos de lo que gastas, mucha proteína y entrenas fuerza. Tu límite es ${formatInt(c.target)} kcal: ${formatInt(c.deficit)} kcal menos que tu gasto de ${formatInt(c.tdee)} kcal.`;
        steps.push(
          li(`Proteína: unos ${formatInt(prot)} g al día (2,3 g por kilo). Con menos calorías hace falta más proteína para no perder músculo.`),
          li(`Repártela en 3 a 6 comidas, unos ${formatInt(perMeal)} g en cada una.`),
          c.clampedToFloor ? null : li(`Déficit suave de ${formatInt(RECOMP_DEFICIT)} kcal, el más bajo de los que Harvard Health considera seguros para perder peso.`),
          li("Entrena fuerza de forma regular: es lo que le dice al cuerpo que conserve y construya músculo mientras pierdes grasa."),
          li("El peso puede bajar despacio, porque ganas músculo mientras pierdes grasa. Fíjate también en cómo te queda la ropa o en tu cintura."));
        sources = "Fuentes: ISSN 2017 (2,3–3,1 g/kg en déficit), Iraki y cols. 2019, Harvard Health, revisión de recomposición corporal (Strength and Conditioning Journal, 2020).";
      }

      const proteinFoods = ["Pechuga de pollo o pavo", "Huevos y claras", "Atún, merluza, salmón", "Yogur griego o natural, queso fresco batido", "Legumbres: lentejas, garbanzos, alubias", "Tofu y soja"];

      return h("main", { class: "screen" },
        h("div", { class: "top" }, backButton(app)),
        h("header", {}, h("h1", {}, "Qué tienes que hacer"), h("p", { class: "lede" }, GOALS[p.goal].label)),
        h("section", { class: "panel" },
          h("p", {}, intro),
          h("ol", { style: { margin: "0", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "10px" } }, steps)),
        prot ? h("section", { class: "panel" },
          h("h2", {}, "Alimentos con mucha proteína"),
          h("ul", { style: { margin: "0", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" } }, proteinFoods.map((f) => h("li", {}, f)))) : null,
        prot ? h("p", { class: "notice" }, "Si tienes alguna enfermedad de riñón u otra condición médica, consulta con un profesional antes de tomar tanta proteína.") : null,
        h("p", { class: "meta" }, `${sources} Son estimaciones: tu cuerpo puede necesitar algo distinto.`));
    },
  };
}
