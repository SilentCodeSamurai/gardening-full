import * as m from "@/paraglide/messages.js";

/**
 * Resolve a persisted catalog string. When `isDefault` is true (seeded catalog), values are
 * Paraglide keys; otherwise they are user-authored literals.
 */
export function translateCatalogField(stored: string | null, isDefault: boolean): string | null {
	if (stored == null) return null;
	if (!isDefault) return stored;
	const fn = (m as Record<string, unknown>)[stored];
	return typeof fn === "function" ? (fn as () => string)() : stored;
}
