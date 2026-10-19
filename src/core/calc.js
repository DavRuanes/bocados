// Cálculo del límite diario de calorías.
// Fuentes (ver docs/superpowers/specs):
//  - Mifflin-St Jeor: Frankenfield et al. 2005, J Am Diet Assoc 105(5):775-789.
//  - Factores de actividad 1.2-1.9 (QxMD, calculadora Mifflin-St Jeor).
//  - Déficit 500-1.000 kcal/día y suelos de 1.200 / 1.500 kcal: Harvard Health.
//  - Ganar músculo: superávit 10-20 % (Iraki et al. 2019); se usa el 10 %.
//  - Proteína: 1,6 g/kg (Morton et al. 2018), 2,3-3,1 g/kg en déficit (ISSN 2017); por comida 0,40-0,55 g/kg (Iraki 2019).

export const ACTIVITY = {
  sedentario: { factor: 1.2, label: "Sedentario", hint: "Trabajo sentado y casi nada de ejercicio" },
  ligero: { factor: 1.375, label: "Ligero", hint: "Ejercicio suave 1 a 3 días por semana" },
  moderado: { factor: 1.55, label: "Moderado", hint: "Ejercicio 3 a 5 días por semana" },
  activo: { factor: 1.725, label: "Activo", hint: "Ejercicio intenso 6 o 7 días por semana" },
  muy_activo: { factor: 1.9, label: "Muy activo", hint: "Trabajo físico o entrenas dos veces al día" },
};

export const PACES = {
  suave: { deficit: 500, label: "Suave", hint: "500 kcal menos al día" },
  medio: { deficit: 750, label: "Medio", hint: "750 kcal menos al día" },
  rapido: { deficit: 1000, label: "Rápido", hint: "1.000 kcal menos al día" },
};

export const FLOORS = { mujer: 1200, hombre: 1500 };

export const GOALS = {
  perder: { label: "Adelgazar" },
  mantener: { label: "Mantener mi peso" },
  musculo: { label: "Ganar masa muscular", protein: 1.6 },
  recomp: { label: "Ganar músculo y perder grasa", protein: 2.3 },
};

export const MUSCLE_SURPLUS = 0.10;
export const RECOMP_DEFICIT = 500;
export const PROTEIN_PER_MEAL = 0.4;

// Gramos de proteína al día; solo para los objetivos de músculo.
export function proteinTarget(profile) {
  const g = GOALS[profile.goal]?.protein;
  return g ? Math.round(profile.weightKg * g) : null;
}

export function proteinPerMeal(weightKg) {
  return Math.round(weightKg * PROTEIN_PER_MEAL);
}

export function bmr({ sex, weightKg, heightCm, age }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (sex === "hombre") return base + 5;
  if (sex === "mujer") return base - 161;
  throw new Error(`sexo desconocido: ${sex}`);
}

export function tdee(bmrValue, activity) {
  const a = ACTIVITY[activity];
  if (!a) throw new Error(`actividad desconocida: ${activity}`);
  return bmrValue * a.factor;
}

export function dailyTarget(profile) {
  if (!GOALS[profile.goal]) throw new Error(`objetivo desconocido: ${profile.goal}`);
  const b = bmr(profile);
  const total = Math.round(tdee(b, profile.activity));
  const floor = FLOORS[profile.sex];

  if (profile.goal === "mantener") {
    // Mantener no sube el límite (comer más de lo que gastas haría engordar),
    // pero se avisa si el gasto estimado queda por debajo del mínimo recomendado.
    return { bmr: b, tdee: total, deficit: 0, target: total, floor, clampedToFloor: false, belowFloor: total < floor };
  }

  if (profile.goal === "musculo") {
    const target = Math.round(total * (1 + MUSCLE_SURPLUS));
    return { bmr: b, tdee: total, deficit: 0, surplus: target - total, target, floor, clampedToFloor: false, belowFloor: target < floor };
  }

  let deficitWanted;
  if (profile.goal === "recomp") {
    deficitWanted = RECOMP_DEFICIT;
  } else {
    const pace = PACES[profile.pace];
    if (!pace) throw new Error(`ritmo desconocido: ${profile.pace}`);
    deficitWanted = pace.deficit;
  }
  const wanted = total - deficitWanted;
  const target = Math.max(wanted, floor);
  return {
    bmr: b,
    tdee: total,
    deficit: Math.max(0, total - target),
    target,
    floor,
    clampedToFloor: wanted < floor,
    belowFloor: false,
  };
}
