import type { SpatialNodeEntity, SpatialNodeEntityRef } from "@backend/core/domain/spatial/entities";

export type SpatialPlacementStatus = {
	node: SpatialNodeEntity | null;
	/** True when the bound node has a spatial parent or spatial children (in the layout graph). */
	isPlaced: boolean;
};

/**
 * `true` when the bound spatial node has a parent frame in the graph.
 * Layout editor “add existing” requires this to be false so the user removes the node
 * from its current parent on that parent’s layout first, then re-adds elsewhere.
 */
export function spatialNodeHasParent(node: SpatialNodeEntity | null): boolean {
	return node !== null && node.parentId !== null;
}

export type LocationSpatialRootKind = "none" | "root" | "nested";

/**
 * - **none** — no spatial row for this location yet (entity exists; open layout or add-existing creates the frame).
 * - **root** — bound frame with `parentId === null`.
 * - **nested** — bound frame under another location frame.
 */
export function getLocationSpatialRootKind(
	items: readonly SpatialNodeEntity[],
	locationEntityId: string,
): LocationSpatialRootKind {
	const node =
		items.find((n) => n.ref.entity === "location" && String(n.ref.entityId) === String(locationEntityId)) ?? null;
	if (!node) return "none";
	if (node.parentId === null) return "root";
	return "nested";
}

/**
 * True only when the location has a bound spatial frame with no parent.
 */
export function isLocationSpatialRoot(items: readonly SpatialNodeEntity[], locationEntityId: string): boolean {
	return getLocationSpatialRootKind(items, locationEntityId) === "root";
}

/**
 * True when the location's bound spatial node has at least one direct child in the graph
 * (nested location frame or plant leaf).
 */
export function locationSpatialFrameHasChildren(
	items: readonly SpatialNodeEntity[],
	locationEntityId: string,
): boolean {
	const node =
		items.find((n) => n.ref.entity === "location" && String(n.ref.entityId) === String(locationEntityId)) ?? null;
	if (!node) return false;
	const id = String(node.id);
	return items.some((item) => item.parentId != null && String(item.parentId) === id);
}

export function getSpatialPlacementStatusByRef(
	items: readonly SpatialNodeEntity[],
	ref: SpatialNodeEntityRef,
): SpatialPlacementStatus {
	const node =
		items.find((item) => item.ref.entity === ref.entity && String(item.ref.entityId) === String(ref.entityId)) ??
		null;
	if (!node) return { node: null, isPlaced: false };
	const hasChildren = items.some((item) => String(item.parentId) === String(node.id));
	return {
		node,
		isPlaced: node.parentId !== null || hasChildren,
	};
}

export function isSpatialRefPlaced(items: readonly SpatialNodeEntity[], ref: SpatialNodeEntityRef): boolean {
	return getSpatialPlacementStatusByRef(items, ref).isPlaced;
}

export function collectPlacedEntityIds(
	items: readonly SpatialNodeEntity[],
	entity: SpatialNodeEntityRef["entity"],
): Set<string> {
	const parentIds = new Set(items.filter((item) => item.parentId !== null).map((item) => String(item.parentId)));
	const placed = new Set<string>();
	for (const item of items) {
		if (item.ref.entity !== entity) continue;
		if (item.parentId !== null || parentIds.has(String(item.id))) {
			placed.add(String(item.ref.entityId));
		}
	}
	return placed;
}

export function resolveRootLocationEntityId(
	items: readonly SpatialNodeEntity[],
	locationEntityId: string,
): string | null {
	const byId = new Map(items.map((item) => [String(item.id), item]));
	let current =
		items.find(
			(item) => item.ref.entity === "location" && String(item.ref.entityId) === String(locationEntityId),
		) ?? null;
	if (!current) return null;

	const visited = new Set<string>();
	while (current.parentId !== null) {
		const key = String(current.id);
		if (visited.has(key)) break;
		visited.add(key);
		const parent = byId.get(String(current.parentId));
		if (!parent) break;
		current = parent;
	}
	return current.ref.entity === "location" ? String(current.ref.entityId) : null;
}
