// Todo lo que depende de Android vive aquí, con alternativas para el navegador
// (vista previa y pruebas de diseño).
import { Capacitor } from "@capacitor/core";
import { createRepo } from "./data/repo.js";
import { downscaleBlob } from "./ui/image.js";

export const isNative = Capacitor.isNativePlatform();

// ---------- Base de datos ----------
export async function openRepo() {
  if (isNative) {
    const { capacitorExecutor } = await import("./data/exec-capacitor.js");
    return createRepo(await capacitorExecutor());
  }
  const [{ default: initSqlJs }, { sqlJsExecutor }] = await Promise.all([
    import("sql.js/dist/sql-wasm.js"),
    import("./data/exec-sqljs.js"),
  ]);
  const SQL = await initSqlJs({ locateFile: () => "./sql-wasm.wasm" });
  const db = new SQL.Database();
  const repo = await createRepo(sqlJsExecutor(db));
  repo.preview = true;
  return repo;
}

// ---------- Fotos ----------
// source: "camera" | "gallery". Devuelve un data URL JPEG de 1024 px como máximo, o null si se cancela.
export async function pickPhoto(source) {
  if (isNative) {
    const { Camera } = await import("@capacitor/camera");
    try {
      const opts = { quality: 85, targetWidth: 1600, targetHeight: 1600, correctOrientation: true };
      const res = source === "camera"
        ? await Camera.takePhoto({ ...opts, saveToGallery: false, editable: "no" })
        : (await Camera.chooseFromGallery({ ...opts, mediaType: 0, limit: 1 })).results?.[0];
      if (!res?.webPath) return null;
      const blob = await (await fetch(res.webPath)).blob();
      return downscaleBlob(blob);
    } catch (e) {
      if (/cancel/i.test(String(e?.message ?? e))) return null;
      throw new Error(source === "camera"
        ? "No se pudo abrir la cámara. Revisa el permiso de cámara de Bocado en los ajustes del móvil."
        : "No se pudo abrir la galería.");
    }
  }
  return pickFileInBrowser(source === "camera");
}

function pickFileInBrowser(capture) {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    if (capture) input.capture = "environment";
    input.onchange = async () => {
      const f = input.files?.[0];
      resolve(f ? await downscaleBlob(f) : null);
    };
    input.click();
  });
}

// ---------- Código de barras ----------
export const scanAvailable = isNative;

// onProgress(texto) informa mientras se descarga el módulo de Google la primera vez.
export async function scanBarcode(onProgress = () => {}) {
  const { BarcodeScanner, BarcodeFormat } = await import("@capacitor-mlkit/barcode-scanning");
  const { supported } = await BarcodeScanner.isSupported();
  if (!supported) throw new Error("Este móvil no permite escanear códigos de barras. Escribe el número a mano.");

  const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
  if (!available) {
    onProgress("Preparando el escáner por primera vez…");
    await new Promise((resolve, reject) => {
      let handle;
      BarcodeScanner.addListener("googleBarcodeScannerModuleInstallProgress", (ev) => {
        if (ev.progress != null) onProgress(`Preparando el escáner: ${ev.progress}%`);
        if (ev.state === 4) { handle?.remove(); resolve(); }
        if (ev.state === 3 || ev.state === 5) {
          handle?.remove();
          reject(new Error("No se pudo preparar el escáner. Comprueba tu conexión y vuelve a intentarlo."));
        }
      }).then((h) => { handle = h; });
      BarcodeScanner.installGoogleBarcodeScannerModule().catch(reject);
    });
  }

  try {
    const { barcodes } = await BarcodeScanner.scan({
      formats: [BarcodeFormat.Ean13, BarcodeFormat.Ean8, BarcodeFormat.UpcA, BarcodeFormat.UpcE],
    });
    return barcodes?.[0]?.rawValue ?? null;
  } catch (e) {
    if (/cancel/i.test(String(e?.message ?? e))) return null;
    throw new Error("No se pudo usar la cámara para escanear.");
  }
}

// ---------- Notificaciones ----------
export async function scheduleNotifications(list) {
  if (!isNative) return;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  let perm = await LocalNotifications.checkPermissions();
  if (perm.display === "prompt" || perm.display === "prompt-with-rationale") {
    perm = await LocalNotifications.requestPermissions();
  }
  if (perm.display !== "granted") return;
  await LocalNotifications.cancel({ notifications: list.map((n) => ({ id: n.id })) });
  await LocalNotifications.schedule({
    notifications: list.map((n) => ({
      id: n.id, title: n.title, body: n.body, extra: n.extra,
      schedule: { at: n.at, allowWhileIdle: true },
    })),
  });
}

export async function onNotificationTap(handler) {
  if (!isNative) return;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  LocalNotifications.addListener("localNotificationActionPerformed", (ev) => {
    const date = ev?.notification?.extra?.date;
    if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) handler(date);
  });
}

// ---------- Botón atrás y volver a la app ----------
export async function onBackButton(handler) {
  if (!isNative) return;
  const { App } = await import("@capacitor/app");
  App.addListener("backButton", () => {
    if (!handler()) App.exitApp();
  });
}

export async function onResume(handler) {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") handler();
  });
}
