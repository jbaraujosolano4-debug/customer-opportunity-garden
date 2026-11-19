import fs from "node:fs";
import path from "node:path";

export const DEFAULT_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzjeLCMITqDeLTsJC5WIlA5R66w5F62u00LdhRjOOij2E1cEHvZnAjONCJZUo3fS8ll/exec";

export function getScriptUrl(): string {
  // 1. Leer directamente del archivo .env en disco (garantiza el valor más reciente sin depender de caché de proceso)
  try {
    const p = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(p)) {
      const txt = fs.readFileSync(p, "utf-8");
      for (const line of txt.split("\n")) {
        const match = line.trim().match(/^(?:APPS_SCRIPT_URL|VITE_APPS_SCRIPT_URL)=(.*)$/);
        if (match && match[1]) {
          const val = match[1].trim().replace(/^['"]|['"]$/g, "");
          if (val) return val;
        }
      }
    }
  } catch (e) {
    // Si corre en un entorno sin fs, continúa
  }

  // 2. Fallbacks a import.meta.env y process.env
  const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
  return (
    metaEnv?.["APPS_SCRIPT_URL"]?.trim() ||
    metaEnv?.["VITE_APPS_SCRIPT_URL"]?.trim() ||
    process.env["APPS_SCRIPT_URL"]?.trim() ||
    process.env["VITE_APPS_SCRIPT_URL"]?.trim() ||
    DEFAULT_APPS_SCRIPT_URL
  );
}
