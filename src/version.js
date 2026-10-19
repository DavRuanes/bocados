// Versión inyectada al compilar (scripts/build.mjs) a partir del número de compilación de GitHub.
/* global __APP_VERSION__ */
export const APP_VERSION = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "desarrollo";
