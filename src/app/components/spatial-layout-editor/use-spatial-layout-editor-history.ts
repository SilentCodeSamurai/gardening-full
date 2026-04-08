import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { SpatialLayoutHistoryApi, SpatialLayoutHistoryDiskEntryV2 } from "./spatial-layout-editor.history";
import { loadHistoryPast, saveHistoryPast, trimPast } from "./spatial-layout-editor.history";
import type {
	SpatialLayoutNode,
	SpatialLayoutOperation,
	SpatialLayoutNodeSnapshot,
} from "./spatial-layout-editor.types";

const defaultMaxEntries = 80;

type Options = {
	storageKey: string;
	applyOperations: (operations: readonly SpatialLayoutOperation<SpatialLayoutNode>[]) => Promise<void>;
	maxEntries?: number;
	/** When false, no localStorage I/O and commit/undo/redo are no-ops (toolbar stays hidden). */
	enabled?: boolean;
};

function nodeSnapshotEqual(a: SpatialLayoutNodeSnapshot, b: SpatialLayoutNodeSnapshot): boolean {
	return (
		a.id === b.id &&
		a.parentId === b.parentId &&
		a.acceptsChildren === b.acceptsChildren &&
		a.nodeType === b.nodeType &&
		a.label === b.label &&
		a.spatialRef?.entity === b.spatialRef?.entity &&
		a.spatialRef?.entityId === b.spatialRef?.entityId &&
		a.geometry.x === b.geometry.x &&
		a.geometry.y === b.geometry.y &&
		a.geometry.width === b.geometry.width &&
		a.geometry.height === b.geometry.height
	);
}

function flattenOperations(
	ops: readonly SpatialLayoutOperation<SpatialLayoutNode>[],
): SpatialLayoutOperation<SpatialLayoutNode>[] {
	const out: SpatialLayoutOperation<SpatialLayoutNode>[] = [];
	const walk = (op: SpatialLayoutOperation<SpatialLayoutNode>) => {
		if (op.type === "batch") {
			for (const inner of op.ops) walk(inner);
			return;
		}
		out.push(op);
	};
	for (const op of ops) walk(op);
	return out;
}

function invertOperation(op: SpatialLayoutOperation<SpatialLayoutNode>): SpatialLayoutOperation<SpatialLayoutNode> {
	switch (op.type) {
		case "updateNode":
		case "reparentNode":
			return { ...op, before: op.after, after: op.before };
		case "deleteNode":
			return { type: "restoreNode", id: op.id, after: op.before };
		case "restoreNode":
			return { type: "deleteNode", id: op.id, before: op.after };
		case "createNode":
			return { type: "deleteNode", id: op.id, before: op.after };
		case "batch":
			// batch should be flattened before inversion
			return op;
		default:
			return op;
	}
}

function invertOperations(
	ops: readonly SpatialLayoutOperation<SpatialLayoutNode>[],
): SpatialLayoutOperation<SpatialLayoutNode>[] {
	const flattened = flattenOperations(ops);
	return flattened
		.slice()
		.reverse()
		.map((op) => invertOperation(op));
}

export function useSpatialLayoutHistory({
	storageKey,
	applyOperations,
	maxEntries = defaultMaxEntries,
	enabled = true,
}: Options): SpatialLayoutHistoryApi {
	const [past, setPast] = useState<SpatialLayoutHistoryDiskEntryV2[]>(() =>
		enabled ? loadHistoryPast(storageKey) : [],
	);
	const [future, setFuture] = useState<SpatialLayoutHistoryDiskEntryV2[]>([]);
	const applyingRef = useRef(false);
	const applyRef = useRef(applyOperations);
	applyRef.current = applyOperations;

	/** Sync load before paint so the save effect never persists `[]` or another key's stack. */
	useLayoutEffect(() => {
		if (!enabled) {
			setPast([]);
			setFuture([]);
			return;
		}
		setPast(loadHistoryPast(storageKey));
		setFuture([]);
	}, [enabled, storageKey]);

	useEffect(() => {
		if (!enabled) return;
		saveHistoryPast(storageKey, past);
	}, [enabled, storageKey, past]);

	const commit = useCallback(
		(operations: readonly SpatialLayoutOperation<SpatialLayoutNode>[]) => {
			if (!enabled || applyingRef.current) return;
			const flattened = flattenOperations(operations);
			const filtered = flattened.filter((op) => {
				if (op.type === "updateNode" || op.type === "reparentNode") {
					return !nodeSnapshotEqual(op.before, op.after);
				}
				return true;
			});
			if (filtered.length === 0) return;
			const entry: SpatialLayoutHistoryDiskEntryV2 = { operations: filtered };
			setPast((p) => trimPast([...p, entry], maxEntries));
			setFuture([]);
		},
		[enabled, maxEntries],
	);

	const undo = useCallback(async () => {
		if (!enabled || applyingRef.current) return;
		let popped: SpatialLayoutHistoryDiskEntryV2 | undefined;
		setPast((p) => {
			if (p.length === 0) return p;
			popped = p[p.length - 1];
			return p.slice(0, -1);
		});
		if (!popped) return;
		const entry = popped;
		applyingRef.current = true;
		try {
			const inverseOps = invertOperations(entry.operations);
			await applyRef.current(inverseOps);
			setFuture((f) => [...f, entry]);
		} catch {
			setPast((p) => [...p, entry]);
		} finally {
			applyingRef.current = false;
		}
	}, [enabled]);

	const redo = useCallback(async () => {
		if (!enabled || applyingRef.current) return;
		let popped: SpatialLayoutHistoryDiskEntryV2 | undefined;
		setFuture((f) => {
			if (f.length === 0) return f;
			popped = f[f.length - 1];
			return f.slice(0, -1);
		});
		if (!popped) return;
		const entry = popped;
		applyingRef.current = true;
		try {
			await applyRef.current(entry.operations);
			setPast((p) => trimPast([...p, entry], maxEntries));
		} catch {
			setFuture((f) => [...f, entry]);
		} finally {
			applyingRef.current = false;
		}
	}, [enabled, maxEntries]);

	return {
		commit,
		undo,
		redo,
		canUndo: enabled && past.length > 0,
		canRedo: enabled && future.length > 0,
	};
}
