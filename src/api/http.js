// fetch con mensajes de error en español. En Android, CapacitorHttp sustituye
// a fetch para evitar los bloqueos CORS (capacitor.config.json).

export class ApiError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind;
  }
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export async function fetchJson(url, options = {}, service = "el servicio") {
  let res;
  try {
    res = await fetch(url, options);
  } catch {
    throw new ApiError("network", `No hay conexión con ${service}. Comprueba que tienes internet.`);
  }
  if (res.status === 401 || res.status === 403) {
    throw new ApiError("auth", `${cap(service)} no está disponible ahora mismo. Prueba más tarde o añádelo a mano.`);
  }
  if (res.status === 429) {
    throw new ApiError("limit", `${cap(service)} ha llegado a su límite de consultas por ahora. Prueba más tarde o añádelo a mano.`);
  }
  if (res.status === 404) throw new ApiError("notfound", `${cap(service)} no tiene este dato.`);
  if (!res.ok) throw new ApiError("server", `${cap(service)} no responde ahora mismo (error ${res.status}).`);
  try {
    return await res.json();
  } catch {
    throw new ApiError("bad", `${cap(service)} ha devuelto una respuesta que no se puede leer.`);
  }
}
