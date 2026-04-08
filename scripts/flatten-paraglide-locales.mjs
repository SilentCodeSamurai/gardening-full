/**
 * One-off: nested i18next-style locales → flat dot keys + inlang message-format placeholders ({var}).
 * Run: node scripts/flatten-paraglide-locales.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const LOCALES = ["en", "de", "ru"];
const SCHEMA = "https://inlang.com/schema/inlang-message-format";

function flatten(obj, prefix = "", out = {}) {
	for (const [k, v] of Object.entries(obj)) {
		if (k === "$schema") continue;
		const key = prefix ? `${prefix}.${k}` : k;
		if (v !== null && typeof v === "object" && !Array.isArray(v)) {
			flatten(v, key, out);
		} else {
			let s = v === null || v === undefined ? "" : String(v);
			s = s.replaceAll("{{", "{").replaceAll("}}", "}");
			out[key] = s;
		}
	}
	return out;
}

for (const loc of LOCALES) {
	const p = path.join(root, "locales", `${loc}.json`);
	const raw = JSON.parse(fs.readFileSync(p, "utf8"));
	const flat = flatten(raw);
	const output = { $schema: SCHEMA, ...flat };
	fs.writeFileSync(p, `${JSON.stringify(output, null, 2)}\n`);
}

console.log("Flattened:", LOCALES.map((l) => `locales/${l}.json`).join(", "));
