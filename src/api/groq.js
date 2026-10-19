import { fetchJson, ApiError } from "./http.js";
import { parseGroqJson, normalizePlate, normalizeLabel } from "../core/parse.js";

export const GROQ_MODEL = "qwen/qwen3.8-27b";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MAX_IMAGES = 3;

// Clave incluida al compilar desde el secreto GROQ_API_KEY de GitHub (scripts/build.mjs).
/* global __GROQ_KEY__ */
export const BUILT_IN_GROQ_KEY = typeof __GROQ_KEY__ === "string" ? __GROQ_KEY__ : "";

export const PLATE_PROMPT = `Eres un nutricionista que analiza fotos de comida. Mira la imagen.
1) Si está borrosa, muy oscura, no hay comida o no se distinguen los alimentos, responde solo:
{"legible": false, "motivo": "<explicación breve en español>"}
2) Si se ve bien, identifica CADA alimento visible por separado (por ejemplo manzana, macarrones, patatas fritas, filete de pollo, salsa) y estima los gramos de la porción visible.
Para cada alimento da:
- "nombre": nombre en español
- "usda": nombre en inglés para buscarlo en USDA FoodData Central, con la forma de cocinado (por ejemplo "apple raw", "pasta cooked", "chicken breast grilled")
- "gramos": gramos estimados
- "kcal100", "prot100", "hc100", "grasa100": valores típicos por 100 g, como respaldo
- "confianza": "alta", "media" o "baja"
Responde SOLO con un objeto JSON:
{"legible": true, "plato": "<nombre corto del plato>", "items": [{"nombre": "Manzana", "usda": "apple raw", "gramos": 180, "kcal100": 52, "prot100": 0.3, "hc100": 14, "grasa100": 0.2, "confianza": "alta"}]}
No incluyas alimentos que no se vean.`;

export const LABEL_PROMPT = `Las imágenes son fotos del envase de un alimento. Lee la tabla de información nutricional tal y como está impresa.
- Copia los valores por 100 g (o 100 ml). Si da kJ y kcal, usa kcal.
- Si un valor no aparece o no se lee con seguridad, pon null. No inventes valores.
- Si la tabla no se ve o está borrosa, responde {"legible": false, "motivo": "<explicación breve en español>"}.
Responde SOLO con un objeto JSON:
{"legible": true, "nombre": "...", "marca": "...", "kcal": 0, "grasa": 0, "sat": 0, "hc": 0, "azuc": 0, "fibra": 0, "prot": 0, "sal": 0}`;

export function groqRequest(key, prompt, imageDataUrls) {
  if (!key || !key.trim()) throw new ApiError("auth", "El análisis de fotos no está disponible en esta versión. Añade el plato a mano o lee la etiqueta más tarde.");
  if (imageDataUrls.length > MAX_IMAGES) throw new ApiError("bad", "Se pueden enviar como máximo 3 fotos a la vez.");
  return {
    url: GROQ_URL,
    headers: { Authorization: `Bearer ${key.trim()}`, "Content-Type": "application/json" },
    body: {
      model: GROQ_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          ...imageDataUrls.map((url) => ({ type: "image_url", image_url: { url } })),
        ],
      }],
    },
  };
}

async function ask(key, prompt, images) {
  const req = groqRequest(key, prompt, images);
  const json = await fetchJson(req.url, { method: "POST", headers: req.headers, body: JSON.stringify(req.body) }, "el análisis de fotos");
  const content = json?.choices?.[0]?.message?.content;
  const parsed = parseGroqJson(content);
  if (!parsed) throw new ApiError("bad", "La IA ha respondido en un formato inesperado. Vuelve a intentarlo.");
  return parsed;
}

export async function analyzePlate(key, imageDataUrl) {
  return normalizePlate(await ask(key, PLATE_PROMPT, [imageDataUrl]));
}

export async function readLabel(key, imageDataUrls) {
  return normalizeLabel(await ask(key, LABEL_PROMPT, imageDataUrls));
}
