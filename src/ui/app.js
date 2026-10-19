// Estado y navegación de la app.
import { h, icon } from "./dom.js";
import { dateKey } from "../core/day.js";
import { buildMidnightNotifications } from "../core/notify.js";
import { sumEntries } from "../core/day.js";
import { scheduleNotifications } from "../platform.js";
import { BUILT_IN_GROQ_KEY } from "../api/groq.js";

const TABS = [
  { id: "hoy", label: "Hoy", icon: "today" },
  { id: "historial", label: "Historial", icon: "history" },
  { id: "perfil", label: "Perfil", icon: "person" },
];

export function createApp({ root, repo, screens }) {
  const app = {
    repo,
    profile: null,
    tab: "hoy",
    stack: [],
    today: dateKey(),

    async loadProfile() {
      app.profile = await repo.getProfile();
      return app.profile;
    },

    async groqKey() {
      const own = (await repo.getSetting("groqKey")) || "";
      return own.trim() || BUILT_IN_GROQ_KEY;
    },

    async usdaKey() {
      return ((await repo.getSetting("usdaKey")) || "").trim();
    },

    async targetFor(date) {
      if (date === dateKey()) return app.profile.target;
      return (await repo.getDayTarget(date)) ?? app.profile.target;
    },

    // La pantalla de arriba de la pila es la que se ve.
    async show() {
      const top = app.stack[app.stack.length - 1];
      const node = await top.render();
      root.className = "";
      root.replaceChildren(node);
      if (!top.noNav) root.append(tabbar());
      window.scrollTo(0, top.scroll ?? 0);
    },

    async push(screen) {
      const top = app.stack[app.stack.length - 1];
      if (top) top.scroll = window.scrollY;
      app.stack.push(screen);
      await app.show();
    },

    async replace(screen) {
      app.stack[app.stack.length - 1] = screen;
      await app.show();
    },

    // Devuelve false si ya estaba en la raíz (el botón atrás de Android cierra la app).
    async back() {
      if (app.stack.length <= 1) {
        if (app.tab !== "hoy") { await app.setTab("hoy"); return true; }
        return false;
      }
      app.stack.pop();
      await app.show();
      return true;
    },

    async setTab(id) {
      app.tab = id;
      app.stack = [screens[id](app)];
      await app.show();
    },

    async refresh() {
      await app.show();
    },

    // Si ha pasado la medianoche con la app abierta, el día nuevo empieza a cero.
    async checkDayChange() {
      const now = dateKey();
      if (now !== app.today) {
        app.today = now;
        if (app.profile) {
          await repo.setDayTarget(now, app.profile.target);
          await app.reschedule();
          await app.setTab(app.tab);
        }
      }
    },

    async reschedule() {
      if (!app.profile) return;
      try {
        const entries = await repo.entriesForDate(dateKey());
        await scheduleNotifications(buildMidnightNotifications({
          target: app.profile.target, todayKcal: sumEntries(entries).kcal,
        }));
      } catch (e) {
        console.warn("No se pudieron programar las notificaciones", e);
      }
    },

    async openDay(date) {
      app.tab = date === dateKey() ? "hoy" : "historial";
      app.stack = [screens[app.tab](app)];
      if (date !== dateKey()) app.stack.push(screens.day(app, date));
      await app.show();
    },
  };

  function tabbar() {
    return h("nav", { class: "tabbar", "aria-label": "Secciones" },
      h("div", { class: "tabbar-inner" },
        TABS.map((t) => h("button", {
          class: "tab", type: "button",
          "aria-current": app.tab === t.id && app.stack.length === 1 ? "page" : false,
          onclick: () => app.setTab(t.id),
        }, h("span", { class: "tab-ic" }, icon(t.icon)), t.label))));
  }

  return app;
}

export function backButton(app, label = "Atrás") {
  return h("button", { class: "back", type: "button", onclick: () => app.back() }, icon("back"), label);
}
