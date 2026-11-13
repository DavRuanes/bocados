// Estimación de calorías quemadas con METs: kcal = MET × kg × horas.
// Fuente: Compendium of Physical Activities (Ainsworth et al. 2011; actualización 2024,
// pacompendium.com). Pesas: general 3,5 y vigoroso 6,0. Fútbol: walking football 3,5,
// casual 7,0, competitivo 9,5. Circuito vigoroso 8,0. Caminar: lento 2,8, moderado 3,5, rápido 5,0.
// Los valores "media" de pesas, HIIT, cardio y "otro" son intermedios elegidos por Bocado.
// Es solo informativo: el límite diario ya cuenta con el ejercicio a través del nivel de actividad.

const STRENGTH = { baja: 3.5, media: 5.0, alta: 6.0 };
export const METS = {
  Espalda: STRENGTH, Pierna: STRENGTH, Brazo: STRENGTH, Hombro: STRENGTH,
  "Fútbol": { baja: 3.5, media: 7.0, alta: 9.5 },
  HIIT: { baja: 5.0, media: 6.5, alta: 8.0 },
  Cardio: { baja: 4.0, media: 6.0, alta: 8.0 },
  Caminar: { baja: 2.8, media: 3.5, alta: 5.0 },
  Otro: { baja: 3.0, media: 4.5, alta: 6.0 },
};

export function metFor(type, intensity) {
  const t = METS[type] ?? METS.Otro;
  return t[intensity] ?? t.media;
}

export function burnedKcal({ type, intensity, minutes }, weightKg) {
  const m = Number(minutes), w = Number(weightKg);
  if (!(m > 0) || !(w > 0)) return 0;
  return Math.round(metFor(type, intensity) * w * (m / 60));
}
