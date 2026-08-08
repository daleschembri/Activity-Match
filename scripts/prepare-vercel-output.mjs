import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const source = join("apps", "web", "dist");
const target = "dist";

if (!existsSync(source)) {
  console.error(`Build output not found at ${source}`);
  process.exit(1);
}

if (existsSync(target)) {
  rmSync(target, { recursive: true, force: true });
}

cpSync(source, target, { recursive: true });
console.log(`Copied ${source} -> ${target}`);
