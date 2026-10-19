// Crea nodos sin usar innerHTML con datos: todo texto entra como textContent.
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v === null || v === undefined) continue;
    if (k === "class") el.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "dataset") Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, String(v));
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

// Iconos propios (trazo 1,8 px). Solo SVG fijo, sin datos externos.
const PATHS = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  chev: '<path d="M9 5l7 7-7 7"/>',
  barcode: '<path d="M4 6v12M7 6v12M10 6v12M14 6v12M17 6v12M20 6v12" /><path d="M2 4h3M19 4h3M2 20h3M19 20h3"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  gallery: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 16l5-5 4 4 3-3 4 4"/><circle cx="15.5" cy="9.5" r="1.3"/>',
  pencil: '<path d="M5 19l1-4L16 5l3 3L9 18z"/><path d="M14 7l3 3"/>',
  today: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
  history: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  person: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.2v.3"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  label: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
};

export function icon(name, cls) {
  const span = document.createElement("span");
  span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name]}</svg>`;
  const svg = span.firstChild;
  if (cls) svg.setAttribute("class", cls);
  return svg;
}

// Marca de Bocado: un círculo con un mordisco.
export function brandMark() {
  const span = document.createElement("span");
  span.innerHTML = `<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="var(--cena-mark)" d="M16 3a13 13 0 1 0 12.6 16.2 4.2 4.2 0 0 1-4.9-4.1 4.2 4.2 0 0 1-4.6-4.6A4.2 4.2 0 0 1 15.6 3z"/></svg>`;
  return span.firstChild;
}

let toastTimer;
export function toast(msg) {
  document.querySelector(".toast")?.remove();
  const t = h("div", { class: "toast", role: "status" }, msg);
  document.body.append(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), 2600);
}
