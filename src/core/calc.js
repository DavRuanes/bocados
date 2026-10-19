// Cálculo del límite diario de calorías.
// Fuentes (ver docs/superpowers/specs):
//  - Mifflin-St Jeor: Frankenfield et al. 2005, J Am Diet Assoc 105(5):775-789.
//  - Factores de actividad 1.2-1.9 (QxMD, calculadora Mifflin-St Jeor).
//  - Déficit 500-1.000 kcal/día y suelos de 1.200 / 1.500 kcal: Harvard Health.

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
};

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
    return { bmr: b, tdee: total, deficit: 0, target: total, floor, clampedToFloor: false };
  }

  const pace = PACES[profile.pace];
  if (!pace) throw new Error(`ritmo desconocido: ${profile.pace}`);
  const wanted = total - pace.deficit;
  const target = Math.max(wanted, floor);
  return {
    bmr: b,
    tdee: total,
    deficit: Math.max(0, total - target),
    target,
    floor,
    clampedToFloor: wanted < floor,
  };
}
