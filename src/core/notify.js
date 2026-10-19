import { nextMidnights, dateKey, notificationText } from "./day.js";

export const NOTIFY_IDS = [1001, 1002, 1003, 1004, 1005, 1006, 1007];

// Formato del plugin @capacitor/local-notifications. Sin permiso de alarma exacta,
// la notificación es inexacta (Android puede retrasarla unos minutos) en vez de
// abrir los ajustes del sistema cada vez que se programa.
export function toPluginNotifications(list, exact) {
  return list.map((n) => ({
    id: n.id, title: n.title, body: n.body, extra: n.extra,
    isExactNotification: Boolean(exact),
    schedule: { at: n.at, allowWhileIdle: true },
  }));
}

// Android no puede calcular el texto en el momento de mostrarla, así que la app
// reprograma estas siete notificaciones cada vez que cambia lo comido hoy.
// La de esta noche lleva el total real; las siguientes, 0 kcal, que es lo correcto
// si no se abre la app esos días (abrirla las vuelve a programar).
export function buildMidnightNotifications({ target, todayKcal, now = new Date() }) {
  return nextMidnights(now, NOTIFY_IDS.length).map((at, i) => {
    const dayThatEnds = new Date(at.getFullYear(), at.getMonth(), at.getDate() - 1);
    const { title, body } = notificationText(target, i === 0 ? todayKcal : 0);
    return { id: NOTIFY_IDS[i], title, body, at, extra: { date: dateKey(dayThatEnds) } };
  });
}
