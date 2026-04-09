import * as m from "@/paraglide/messages.js";

/**
 * Resolve a persisted catalog string. When `systemCatalog` is true (populate-managed shared catalog), values are
 * Paraglide keys; otherwise they are user-authored literals.
 */
export function translateCatalogField(stored: string | null, systemCatalog: boolean): string | null {
	if (stored == null) return null;
	if (!systemCatalog) return stored;
	const table = m as Record<string, unknown>;
	const fn = table[stored] ?? table[stored.replaceAll(".", "_")];
	return typeof fn === "function" ? (fn as () => string)() : stored;
}
