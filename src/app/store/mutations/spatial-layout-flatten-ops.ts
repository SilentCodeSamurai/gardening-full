import type { SpatialLayoutNode, SpatialLayoutOperation } from "@/components/spatial-layout-editor";

/** Flatten `batch` ops for analysis (URL sync, focus checks, etc.). */
export function flattenSpatialLayoutOperations(
	ops: readonly SpatialLayoutOperation<SpatialLayoutNode>[],
): SpatialLayoutOperation<SpatialLayoutNode>[] {
	const out: SpatialLayoutOperation<SpatialLayoutNode>[] = [];
	const walk = (op: SpatialLayoutOperation<SpatialLayoutNode>) => {
		if (op.type === "batch") {
			for (const inner of op.ops) walk(inner as SpatialLayoutOperation<SpatialLayoutNode>);
			return;
		}
		out.push(op);
	};
	for (const op of ops) walk(op);
	return out;
}
