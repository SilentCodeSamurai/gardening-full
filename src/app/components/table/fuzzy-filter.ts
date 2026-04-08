import { rankItem } from "@tanstack/match-sorter-utils";
import type { FilterFn } from "@tanstack/react-table";

/**
 * Global/column fuzzy filter using match-sorter.
 * `FilterFn<any>` is required so this single helper can be used as `globalFilterFn` across tables
 * without TypeScript rejecting contravariant `FilterFn<T>` assignments.
 */
export const fuzzyFilter = ((row, columnId, value, addMeta) => {
	const itemRank = rankItem(String(row.getValue(columnId) ?? ""), String(value ?? ""));
	addMeta({ itemRank });
	return itemRank.passed;
}) as FilterFn<any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- shared TanStack FilterFn for all row types
