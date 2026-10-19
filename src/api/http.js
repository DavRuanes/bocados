// fetch con mensajes de error en español. En Android, CapacitorHttp sustituye
// a fetch para evitar los bloqueos CORS (capacitor.config.json).

export class ApiError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind;
  }
}

export async function fetchJson(url, options = {}, service = "el servicio") {
  let res;
  try {
    res = await fetch(url, options);
  } catch {
    throw new ApiError("network", `No hay conexión con ${service}. Comprueba que tienes internet.`);
  }
  if (res.status === 401 || res.status === 403) {
    throw new ApiError("auth", `La clave de ${service} no es válida o está desactivada. Revísala en Ajustes.`);
  }
  if (res.status === 429) {
    throw new ApiError("limit", `Has llegado al límite de consultas de ${service}. Prueba más tarde.`);
  }
  if (res.status === 404) throw new ApiError("notfound", `${service} no tiene este dato.`);
  if (!res.ok) throw new ApiError("server", `${service} no responde ahora mismo (error ${res.status}).`);
  try {
    return await res.json();
  } catch {
    throw new ApiError("bad", `${service} ha devuelto una respuesta que no se puede leer.`);
  }
}
