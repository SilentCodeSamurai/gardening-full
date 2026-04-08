/** Escape a string for use inside a RegExp source. */
export function escapeRegexToken(label: string): string {
	return label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Strip a trailing ` #123` suffix used for duplicate numbering. */
export function duplicateNumberingStem(label: string): string {
	const stem = label.replace(/\s+#\d+$/, "").trimEnd();
	return stem.length > 0 ? stem : label;
}

/** Highest used index for names `stem` or `stem #n` among sibling labels. Bare `stem` counts as 0. */
export function maxUsedOrdinalForStem(stem: string, siblingLabels: readonly string[]): number {
	let max = 0;
	const escaped = escapeRegexToken(stem);
	const bare = new RegExp(`^${escaped}$`);
	const numbered = new RegExp(`^${escaped} #(\\d+)$`);
	for (const l of siblingLabels) {
		if (bare.test(l)) max = Math.max(max, 0);
		const m = l.match(numbered);
		if (m) max = Math.max(max, Number.parseInt(m[1], 10));
	}
	return max;
}

/** Next name when duplicating `sourceLabel` among `siblingLabels` (same parent). */
export function nextDuplicateLabel(sourceLabel: string, siblingLabels: readonly string[]): string {
	const stem = duplicateNumberingStem(sourceLabel);
	return `${stem} #${maxUsedOrdinalForStem(stem, siblingLabels) + 1}`;
}

/** Consecutive labels `stem #(start)`… for creating many new siblings; avoids clashes with existing. */
export function allocateNumberedLabelsForNewSiblings(
	stem: string,
	existingSiblingLabels: readonly string[],
	count: number,
): string[] {
	const start = maxUsedOrdinalForStem(stem, existingSiblingLabels) + 1;
	return Array.from({ length: count }, (_, i) => `${stem} #${start + i}`);
}
