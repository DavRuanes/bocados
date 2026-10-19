import { ACTIVITY, PACES, GOALS } from "./calc.js";

export function parseNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return NaN;
  const s = value.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
  return Number(s);
}

const RANGES = {
  age: { min: 14, max: 100, msg: "Escribe tu edad en años, entre 14 y 100." },
  heightCm: { min: 120, max: 230, msg: "Escribe tu altura en centímetros, entre 120 y 230 (por ejemplo, 172)." },
  weightKg: { min: 35, max: 300, msg: "Escribe tu peso en kilos, entre 35 y 300." },
};

export function validateProfile(input) {
  const errors = {};
  const profile = {};

  if (GOALS[input.goal]) profile.goal = input.goal;
  else errors.goal = "Elige tu objetivo.";

  if (input.sex === "hombre" || input.sex === "mujer") profile.sex = input.sex;
  else errors.sex = "Elige una opción.";

  for (const [key, r] of Object.entries(RANGES)) {
    const n = parseNumber(input[key]);
    if (Number.isFinite(n) && n >= r.min && n <= r.max) profile[key] = n;
    else errors[key] = r.msg;
  }

  if (ACTIVITY[input.activity]) profile.activity = input.activity;
  else errors.activity = "Elige tu nivel de actividad.";

  if (profile.goal === "perder") {
    if (PACES[input.pace]) profile.pace = input.pace;
    else errors.pace = "Elige a qué ritmo quieres adelgazar.";
  } else {
    profile.pace = null;
  }

  const ok = Object.keys(errors).length === 0;
  return ok
    ? { ok, errors, profile: { goal: profile.goal, sex: profile.sex, age: profile.age, heightCm: profile.heightCm, weightKg: profile.weightKg, activity: profile.activity, pace: profile.pace } }
    : { ok, errors, profile: null };
}
