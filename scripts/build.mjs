// Empaqueta la app web en www/ para Capacitor.
// La clave de Groq se inyecta desde la variable de entorno GROQ_API_KEY (secreto de GitHub);
// nunca se escribe en el código fuente.
import { build } from "esbuild";
import { mkdir, copyFile, rm } from "node:fs/promises";

const out = "www";
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

await build({
  entryPoints: { app: "src/main.js" },
  bundle: true,
  format: "esm",
  splitting: true,
  outdir: out,
  minify: true,
  sourcemap: false,
  target: ["chrome100"],
  loader: { ".woff2": "file", ".woff": "file", ".wasm": "file" },
  assetNames: "assets/[name]-[hash]",
  chunkNames: "chunks/[name]-[hash]",
  define: {
    __GROQ_KEY__: JSON.stringify(process.env.GROQ_API_KEY || ""),
    __APP_VERSION__: JSON.stringify(`1.0.${process.env.BOCADO_VERSION_CODE || "0"}`),
  },
  external: ["fs", "path", "crypto"],
  logLevel: "warning",
});

await copyFile("src/index.html", `${out}/index.html`);
await copyFile("node_modules/sql.js/dist/sql-wasm.wasm", `${out}/sql-wasm.wasm`);
console.log(`Listo: ${out}/ ${process.env.GROQ_API_KEY ? "(con clave de Groq incluida)" : "(sin clave de Groq)"}`);
