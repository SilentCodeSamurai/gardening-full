import type { SpatialLayoutNode, SpatialLayoutOperation } from "./spatial-layout-editor.types";

export type SpatialLayoutHistoryApi = {
	commit: (operations: readonly SpatialLayoutOperation<SpatialLayoutNode>[]) => void;
	undo: () => Promise<void>;
	redo: () => Promise<void>;
	canUndo: boolean;
	canRedo: boolean;
};

export type SpatialLayoutHistoryDiskEntryV2 = {
	operations: readonly SpatialLayoutOperation<SpatialLayoutNode>[];
};

export type SpatialLayoutHistoryDiskEntry = SpatialLayoutHistoryDiskEntryV2;

type HistoryFileV2 = {
	v: 2;
	past: { operations: readonly SpatialLayoutOperation<SpatialLayoutNode>[] }[];
};

function isDiskEntryV2(value: unknown): value is SpatialLayoutHistoryDiskEntryV2 {
	if (!value || typeof value !== "object") return false;
	const ops = (value as Record<string, unknown>).operations;
	if (!Array.isArray(ops)) return false;
	return ops.length >= 0; // validation is done by the hook/apply layer
}

export function loadHistoryPast(storageKey: string): SpatialLayoutHistoryDiskEntry[] {
	try {
		const raw = localStorage.getItem(storageKey);
		if (!raw) return [];
		const parsed: unknown = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object") return [];
		const o = parsed as Record<string, unknown>;
		if (o.v === 2) {
			const past = o.past;
			if (!Array.isArray(past)) return [];
			return past.filter(isDiskEntryV2);
		}
		return [];
	} catch {
		return [];
	}
}

export function saveHistoryPast(storageKey: string, past: SpatialLayoutHistoryDiskEntry[]): void {
	try {
		const payload: HistoryFileV2 = { v: 2, past: past as SpatialLayoutHistoryDiskEntryV2[] };
		localStorage.setItem(storageKey, JSON.stringify(payload));
	} catch {
		/* quota or private mode */
	}
}

export function trimPast(past: SpatialLayoutHistoryDiskEntry[], maxEntries: number): SpatialLayoutHistoryDiskEntry[] {
	if (past.length <= maxEntries) return past;
	return past.slice(past.length - maxEntries);
}
