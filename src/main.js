import "./styles/app.css";
import { h } from "./ui/dom.js";
import { createApp } from "./ui/app.js";
import { dateKey } from "./core/day.js";
import { openRepo, onBackButton, onResume, onNotificationTap } from "./platform.js";
import { dayScreen } from "./ui/screens/day.js";
import { historyScreen } from "./ui/screens/history.js";
import { profileScreen } from "./ui/screens/profile.js";
import { startOnboarding } from "./ui/screens/onboarding.js";

const root = document.getElementById("app");

async function boot() {
  const repo = await openRepo();
  const app = createApp({
    root,
    repo,
    screens: {
      hoy: (a) => dayScreen(a, null),
      historial: (a) => historyScreen(a),
      perfil: (a) => profileScreen(a),
      day: (a, date) => dayScreen(a, date),
    },
  });
  if (repo.preview) window.__bocado = app; // solo en la vista previa del navegador

  let pendingDay = null;
  await onNotificationTap((date) => {
    if (app.profile) app.openDay(date);
    else pendingDay = date;
  });
  await onBackButton(() => {
    if (app.onboardingBack) return app.onboardingBack();
    const handled = app.stack.length > 1 || app.tab !== "hoy";
    if (handled) app.back();
    return handled;
  });
  await onResume(() => app.checkDayChange());
  scheduleMidnightRefresh(app);

  // Solo en la vista previa del navegador: #demo carga datos de ejemplo para revisar el diseño.
  if (repo.preview && location.hash.startsWith("#demo")) {
    const { seedDemo, openDemo } = await import("./demo.js");
    await seedDemo(repo);
    await app.loadProfile();
    return openDemo(app, location.hash.slice(1), root);
  }

  const profile = await app.loadProfile();
  if (!profile) {
    startOnboarding(app, root, {
      onDone: async (p) => {
        await repo.saveProfile(p);
        app.profile = p;
        await repo.setDayTarget(dateKey(), p.target);
        await app.reschedule();
        await app.setTab("hoy");
      },
    });
    return;
  }
  await app.reschedule();
  if (pendingDay) await app.openDay(pendingDay);
  else await app.setTab("hoy");
}

// Con la app abierta a medianoche, la pantalla pasa sola al día nuevo.
function scheduleMidnightRefresh(app) {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2);
  setTimeout(async () => { await app.checkDayChange(); scheduleMidnightRefresh(app); }, next - now);
}

boot().catch((e) => {
  console.error(e);
  root.replaceChildren(h("main", { class: "screen no-nav" },
    h("h1", {}, "Bocado no ha podido arrancar"),
    h("p", { class: "error" }, "No se pudo abrir la base de datos del móvil. Cierra la app y vuelve a abrirla. Si sigue pasando, reinstálala."),
    h("p", { class: "meta" }, String(e?.message ?? e))));
});
