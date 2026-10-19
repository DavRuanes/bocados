// Reduce una foto a 1024 px por el lado largo y la convierte en JPEG,
// para que el envío a Groq sea rápido y quede muy por debajo de su límite.
const MAX_SIDE = 1024;

export async function downscaleBlob(blob) {
  if (!blob || !/^image\//.test(blob.type || "image/")) throw new Error("El archivo elegido no es una imagen.");
  const bitmap = await loadBitmap(blob);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", 0.82);
}

async function loadBitmap(blob) {
  if (typeof createImageBitmap === "function") {
    try { return await createImageBitmap(blob, { imageOrientation: "from-image" }); } catch { /* sigue con <img> */ }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw new Error("No se pudo abrir la foto. Prueba con otra.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
