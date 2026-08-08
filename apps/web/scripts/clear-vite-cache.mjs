import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const repoRoot = resolve(appRoot, "../..");
const cacheDirs = [
  resolve(appRoot, "node_modules", ".vite"),
  resolve(repoRoot, "node_modules", ".vite"),
];

let cleared = 0;
for (const dir of cacheDirs) {
  if (!existsSync(dir)) continue;
  rmSync(dir, { recursive: true, force: true });
  cleared += 1;
  console.log(`Cleared Vite cache: ${dir}`);
}

if (cleared === 0) {
  console.log("No Vite cache found (already clean).");
} else {
  console.log("Restart the dev server, then hard-refresh the browser (Ctrl+Shift+R).");
}
