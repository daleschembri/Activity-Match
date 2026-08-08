import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
rmSync(resolve(root, "node_modules", ".vite"), { recursive: true, force: true });
