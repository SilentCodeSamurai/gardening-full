function valuesEqual(a: unknown, b: unknown): boolean {
	if (a === b) return true;
	if (typeof a === "object" && a !== null && typeof b === "object" && b !== null) {
		return JSON.stringify(a) === JSON.stringify(b);
	}
	return String(a) === String(b);
}

/**
 * Match `clause` keys against `row` (partial AND). Undefined clause values are ignored.
 *
 * Uses `object` (not `Record<string, unknown>`) so domain entities with branded ids work as rows;
 * clauses may omit audit fields while rows still carry `createdAt` / `updatedAt`.
 */
export function rowMatchesEntityClause(row: object, clause: object): boolean {
	const r = row as Record<string, unknown>;
	const c = clause as Record<string, unknown>;
	for (const key of Object.keys(c)) {
		const cv = c[key];
		if (cv === undefined) continue;
		if (!valuesEqual(r[key], cv)) return false;
	}
	return true;
}

export function findRowsMatchingAnyClause<TRow extends object>(
	rows: Iterable<TRow>,
	clauses: readonly object[],
): TRow[] {
	if (clauses.length === 0) return [];
	const out: TRow[] = [];
	for (const row of rows) {
		if (clauses.some((c) => rowMatchesEntityClause(row, c))) out.push(row);
	}
	return out;
}

export function findFirstRowMatchingAnyClause<TRow extends object>(
	rows: Iterable<TRow>,
	clauses: readonly object[],
): TRow | undefined {
	for (const row of rows) {
		if (clauses.some((c) => rowMatchesEntityClause(row, c))) return row;
	}
	return undefined;
}
