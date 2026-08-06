import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const version = new Date().toISOString();
const target = resolve(process.cwd(), "public", "app-version.json");

await writeFile(target, `${JSON.stringify({ version })}\n`, "utf8");
console.log(`Versão de produção preparada: ${version}`);
