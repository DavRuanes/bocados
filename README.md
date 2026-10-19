# Bocado

App Android para controlar las calorías de cada día frente a un límite calculado con tus datos.

- Al abrirla por primera vez te pregunta objetivo, sexo, edad, altura, peso, actividad y ritmo, y calcula tu límite (Mifflin-St Jeor × actividad − déficit, sin bajar de 1.200 kcal en mujeres ni 1.500 en hombres).
- Cada día: Desayuno, Comida, Merienda y Cena. En cada una puedes escanear un código de barras (Open Food Facts), hacer una foto del plato (Groq + USDA FoodData Central) o añadir a mano.
- Si te pasas del límite te avisa. A las 00:00 recibes una notificación con el límite y lo que comiste.
- Todo se guarda en una base de datos SQLite dentro del móvil. Cada persona que instala la APK tiene sus propios datos.

## Descargar la APK

Cada vez que se sube un cambio a `main`, GitHub compila la APK y la publica en **Releases**. Desde el móvil, abre la última versión, descarga el `.apk` e instálalo. Android te pedirá permitir la instalación desde ese origen.

Las APK van firmadas siempre con la misma clave (`android/app/bocado-debug.keystore`), así que cada versión nueva se instala encima de la anterior sin perder datos. Mantén este repositorio privado: quien tenga esa clave puede firmar una APK que se instale encima de la tuya.

## Clave de Groq

El análisis de fotos usa Groq. La clave se mete en la APK al compilar desde el secreto `GROQ_API_KEY` del repositorio (Settings → Secrets and variables → Actions → New repository secret). No está en el código.

Riesgos de incluirla: cualquiera con la APK podría extraerla, y todos los que la usen comparten su límite diario. Si pasa algo, bórrala en console.groq.com, crea otra, actualiza el secreto y vuelve a compilar.

USDA usa por defecto `DEMO_KEY` (30 consultas por hora y 50 al día). Cada persona puede poner su propia clave gratuita en Perfil.

## Desarrollo

```bash
npm ci
npm test          # tests de la lógica y la base de datos
npm run build     # genera www/
npx cap sync android
```

Vista previa en el navegador: sirve `www/` y abre `#demo`, `#demo-comida`, `#demo-producto`, `#demo-historial`, `#demo-perfil`, `#demo-pasado` o `#demo-bienvenida` para ver pantallas con datos de ejemplo. En el navegador los datos no se guardan.

Diseño: estilo `pastel-consumer` de taste-skill. Proceso: Superpowers (especificación y plan en `docs/superpowers/`).

Datos: USDA FoodData Central (dominio público, CC0) y Open Food Facts (ODbL).
