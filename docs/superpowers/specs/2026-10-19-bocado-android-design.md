# Bocado para Android — diseño

Fecha: 2026-10-19. Aprobado por el usuario en el chat ("Adelante").

## Intención

Una app Android personal para controlar las calorías del día frente a un límite calculado a partir
de los datos de cada persona, pensada para adelgazar con un déficit calórico. El usuario quiere poder
pasar la APK a amigos: cada uno tiene su propio perfil, sus preguntas y sus datos en su propio móvil.

## Objetivos

1. Primera vez: preguntas sobre objetivo, sexo, edad, peso, altura, nivel de actividad y ritmo.
2. Límite diario calculado y explicado:
   - Gasto en reposo con Mifflin-St Jeor (Frankenfield et al. 2005, J Am Diet Assoc 105(5):775-789):
     - hombres: 10 × kg + 6,25 × cm − 5 × edad + 5
     - mujeres: 10 × kg + 6,25 × cm − 5 × edad − 161
   - Gasto total = reposo × factor de actividad: 1,2 / 1,375 / 1,55 / 1,725 / 1,9.
   - Adelgazar: gasto total − déficit (suave 500, medio 750, rápido 1.000 kcal; Harvard Health
     500-1.000, NHS ~600).
   - Suelo de seguridad: nunca por debajo de 1.200 kcal (mujeres) o 1.500 kcal (hombres) cuando el
     objetivo es adelgazar (Harvard Health).
   - Mantener: gasto total sin déficit.
3. Pantalla Hoy: consumido frente a límite; cuatro comidas (Desayuno, Comida, Merienda, Cena) con
   subtotales; platos ilimitados por comida, editables y borrables.
4. Al pulsar una comida: primero "Escanear código de barras" (Open Food Facts), debajo "Foto del
   plato" (Groq para identificar + USDA FoodData Central para los valores).
5. Al pasar del límite: aviso "Hoy te has pasado de tu límite diario" en rojo; el plato se guarda.
6. Notificación diaria a las 00:00: "Ya puedes ver tu día de calorías", con límite y calorías comidas
   del día que termina; al tocarla abre ese día.
7. Historial por días; perfil editable que recalcula el límite.
8. Base de datos local en el móvil (SQLite).

## No objetivos

- Sincronización en la nube, cuentas, varios usuarios en un mismo móvil.
- Publicación en Google Play (la APK es de depuración, para instalar a mano).
- Objetivo "ganar peso": no hay fuente verificada para su superávit; queda fuera.

## Antiobjetivos

- Un objetivo por debajo del suelo de seguridad.
- Bloquear el registro de lo comido (el usuario eligió avisar, no bloquear).
- Inventar valores: si USDA no encuentra un alimento, el valor estimado por la IA se marca como
  "estimado".

## Restricciones

- Claves: la de Groq va dentro de la APK (decisión del usuario, con riesgos explicados), inyectada en
  la compilación desde un secreto de GitHub, nunca en el código. USDA usa `DEMO_KEY` por defecto
  (30 peticiones/hora, 50/día por IP); cada usuario puede pegar su clave en Ajustes. Groq también se
  puede sustituir en Ajustes.
- Groq: modelo `qwen/qwen3.8-27b`, `POST https://api.groq.com/openai/v1/chat/completions`, hasta 3
  imágenes, imagen en base64 como data URL, `response_format: {type: "json_object"}`.
- USDA: `https://api.nal.usda.gov/fdc/v1/foods/search` con `api_key`.
- Open Food Facts: `GET https://world.openfoodfacts.org/api/v2/product/{código}?fields=...`,
  User-Agent propio `Bocado/1.0 (contacto)`; 15 lecturas de producto por minuto.
- Compilación en GitHub Actions; en este entorno no se puede compilar Android.

## Decisiones del constructor

- Capacitor 8.5.2 envolviendo una app web sin framework, empaquetada con esbuild.
- Plugins: @capacitor-community/sqlite, @capacitor/local-notifications, @capacitor/camera,
  @capacitor-mlkit/barcode-scanning. `CapacitorHttp` activado para evitar CORS.
- Diseño: taste-skill, estilo `pastel-consumer` (seed 1901746869), Manrope empaquetada.
  - Cara: cada comida con su tono pálido y tinta oscura del mismo tono.
  - Elemento propio: la barra del día dividida en las cuatro comidas, con el exceso en rojo.
  - Pregunta de la pantalla Hoy: "¿Cuántas calorías me quedan hoy?".
- Tests con `node:test` sobre la lógica pura; un repositorio en memoria comparte interfaz con SQLite.

## Cambios tras la revisión independiente (2026-10-19)

- Notificaciones inexactas por defecto; la alarma exacta de las 00:00 se activa desde Perfil con
  una explicación (Android 14+ la deniega por defecto y abría los ajustes al programar).
- "Mantener": el límite no se sube al suelo (comer más de lo que se gasta haría engordar), pero si
  el gasto estimado queda por debajo del suelo se muestra un aviso para consultar a un profesional.
- Todos los platos se pueden editar (nombre, comida, gramos y, si no hay valores por 100 g, calorías).
- Si USDA rechaza la clave o se agota DEMO_KEY, se deja de consultar y se avisa en el resultado.
