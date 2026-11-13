import { MEALS, formatInt, formatDec } from "./day.js";
import { burnedKcal } from "./exercise.js";

// Resumen en texto de varios días para pegárselo a Claude.
// days: [{ date, target, entries, workouts, body }], del más reciente al más antiguo.
export function buildExport(profile, days) {
  const lines = ["Resumen de Bocado"];
  if (profile) {
    lines.push(`Perfil: ${profile.sex}, ${profile.age} años, ${profile.heightCm} cm, ${formatDec(profile.weightKg, 1)} kg. Límite: ${formatInt(profile.target)} kcal.`);
  }
  for (const d of days) {
    lines.push("", `== ${d.date} ==`);
    const kcal = d.entries.reduce((s, e) => s + (Number(e.kcal) || 0), 0);
    const prot = d.entries.reduce((s, e) => s + (Number(e.prot) || 0), 0);
    lines.push(`Comido: ${formatInt(kcal)} de ${formatInt(d.target ?? 0)} kcal · Proteína ${formatInt(prot)} g`);
    for (const m of MEALS) {
      const list = d.entries.filter((e) => e.meal === m.id);
      if (!list.length) continue;
      lines.push(`${m.label}: ${list.map((e) => `${e.name} (${formatInt(e.grams)} g, ${formatInt(e.kcal)} kcal${e.prot !== null && e.prot !== undefined ? `, P ${formatInt(e.prot)} g` : ""})`).join("; ")}`);
    }
    const weight = d.body?.weight ?? profile?.weightKg;
    for (const w of d.workouts) {
      lines.push(`Ejercicio: ${w.type}, ${formatInt(w.minutes)} min, intensidad ${w.intensity}, ~${formatInt(burnedKcal(w, weight))} kcal estimadas${w.notes ? ` · ${w.notes}` : ""}`);
    }
    if (d.body?.weight !== null && d.body?.weight !== undefined) lines.push(`Peso: ${formatDec(d.body.weight, 1)} kg`);
    if (d.body?.sleep !== null && d.body?.sleep !== undefined) lines.push(`Sueño: ${formatDec(d.body.sleep, 1)} h`);
  }
  return lines.join("\n");
}
