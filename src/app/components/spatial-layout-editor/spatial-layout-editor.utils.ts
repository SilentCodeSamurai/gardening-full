import {
	AlignHorizontalJustifyCenter,
	AlignHorizontalJustifyEnd,
	AlignHorizontalJustifyStart,
	AlignVerticalJustifyCenter,
	AlignVerticalJustifyEnd,
	AlignVerticalJustifyStart,
	Grid3X3,
	Maximize2,
	MoveHorizontal,
} from "lucide-react";

import type { SpatialLayoutViewportState } from "./spatial-layout-editor.types";

export type DraftRect = { x: number; y: number; width: number; height: number };

/**
 * `background-size` / `background-position` for a layer fixed to the viewport element so a
 * repeating grid matches **world** coordinates: one tile = `gridStep` × `gridStep` in layout
 * space, scaled with `viewport.scale`, and shifting with pan (`viewport.x` / `viewport.y`) so
 * lines stay aligned with snapped geometry.
 */
export function getViewportWorldGridBackgroundProps(
	viewport: SpatialLayoutViewportState,
	gridStep: number,
): {
	backgroundSize: string;
	backgroundPosition: string;
} {
	const period = gridStep * viewport.scale;
	if (!(period > 0) || !Number.isFinite(period)) {
		return { backgroundSize: `${gridStep}px ${gridStep}px`, backgroundPosition: "0px 0px" };
	}
	const posX = viewport.x - Math.floor(viewport.x / period) * period;
	const posY = viewport.y - Math.floor(viewport.y / period) * period;
	return {
		backgroundSize: `${period}px ${period}px`,
		backgroundPosition: `${posX}px ${posY}px`,
	};
}

/** Auto-layout menu: stable module-level config (icon components are stable). */
export const AUTO_LAYOUT_OPTIONS = [
	{
		id: "stack-left",
		label: "Stack (left)",
		hint: "Prefer one vertical stack aligned to the left; wraps to next column when needed.",
		icon: AlignHorizontalJustifyStart,
		group: "stack",
	},
	{
		id: "stack-middle",
		label: "Stack (middle)",
		hint: "Prefer one vertical stack around center; wraps to neighboring columns when needed.",
		icon: AlignHorizontalJustifyCenter,
		group: "stack",
	},
	{
		id: "stack-right",
		label: "Stack (right)",
		hint: "Prefer one vertical stack aligned to the right; wraps to previous columns when needed.",
		icon: AlignHorizontalJustifyEnd,
		group: "stack",
	},
	{
		id: "stack-top",
		label: "Stack (top)",
		hint: "Prefer one horizontal stack aligned to the top; wraps to next rows when needed.",
		icon: AlignVerticalJustifyStart,
		group: "stack",
	},
	{
		id: "stack-bottom",
		label: "Stack (bottom)",
		hint: "Prefer one horizontal stack aligned to the bottom; wraps to previous rows when needed.",
		icon: AlignVerticalJustifyEnd,
		group: "stack",
	},
	{
		id: "row-top",
		label: "Row (top)",
		hint: "Horizontal flow anchored to the top edge.",
		icon: AlignVerticalJustifyStart,
		group: "rows",
	},
	{
		id: "row-middle",
		label: "Row (middle)",
		hint: "Horizontal flow anchored around vertical center.",
		icon: AlignVerticalJustifyCenter,
		group: "rows",
	},
	{
		id: "row-bottom",
		label: "Row (bottom)",
		hint: "Horizontal flow anchored to the bottom edge.",
		icon: AlignVerticalJustifyEnd,
		group: "rows",
	},
	{
		id: "column-left",
		label: "Column (left)",
		hint: "Vertical flow anchored to the left edge.",
		icon: AlignHorizontalJustifyStart,
		group: "columns",
	},
	{
		id: "column-center",
		label: "Column (center)",
		hint: "Vertical flow anchored around horizontal center.",
		icon: AlignHorizontalJustifyCenter,
		group: "columns",
	},
	{
		id: "column-right",
		label: "Column (right)",
		hint: "Vertical flow anchored to the right edge.",
		icon: AlignHorizontalJustifyEnd,
		group: "columns",
	},
	{
		id: "grid-balanced",
		label: "Balanced grid",
		hint: "Spread children in a grid for even spacing.",
		icon: Grid3X3,
		group: "common",
	},
	{
		id: "space-between",
		label: "Space between",
		hint: "Distribute free horizontal space between items in each row.",
		icon: MoveHorizontal,
		group: "common",
	},
	{
		id: "space-around",
		label: "Space around",
		hint: "Distribute free space around each item in each row.",
		icon: Maximize2,
		group: "common",
	},
] as const;

export type AutoLayoutMode = (typeof AUTO_LAYOUT_OPTIONS)[number]["id"];

export function snap(value: number, gridStep: number): number {
	return Math.round(value / gridStep) * gridStep;
}

export function intersectsRect(a: DraftRect, b: DraftRect): boolean {
	return !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
}

type FrameLink = {
	id: string;
	parentId: string | null;
	geometry: { x: number; y: number };
};

/** World-space top-left for a frame node (`acceptsChildren`), from `nodesById` and `rootId`. */
export function computeFramePosition(
	frameId: string,
	nodesById: ReadonlyMap<string, FrameLink>,
	rootId: string,
): { x: number; y: number } {
	const visited = new Set<string>();
	let current = nodesById.get(frameId);
	if (!current) return { x: 0, y: 0 };
	if (String(current.id) === String(rootId)) return { x: 0, y: 0 };
	let x = current.geometry.x;
	let y = current.geometry.y;
	while (current?.parentId) {
		const parentKey = String(current.parentId);
		if (parentKey === String(rootId)) break;
		if (visited.has(parentKey)) break;
		visited.add(parentKey);
		const parent = nodesById.get(parentKey);
		if (!parent) break;
		x += parent.geometry.x;
		y += parent.geometry.y;
		current = parent;
	}
	return { x, y };
}

export function computeFrameDepth(frameId: string, nodesById: ReadonlyMap<string, FrameLink>, rootId: string): number {
	let depth = 0;
	const visited = new Set<string>();
	let current = nodesById.get(frameId);
	while (current?.parentId) {
		const parentKey = String(current.parentId);
		if (parentKey === String(rootId)) return depth + 1;
		if (visited.has(parentKey)) break;
		visited.add(parentKey);
		const parent = nodesById.get(parentKey);
		if (!parent) break;
		depth += 1;
		current = parent;
	}
	return depth;
}

type SubtreeFrame = { id: string; parentId: string | null };

/** All frame ids in the subtree rooted at `rootFrameId` (inclusive), using only frame parent links. */
export function computeSubtreeFrameIds(rootFrameId: string, frameChildren: readonly SubtreeFrame[]): Set<string> {
	const ids = new Set<string>([rootFrameId]);
	let changed = true;
	while (changed) {
		changed = false;
		for (const c of frameChildren) {
			if (!c.parentId) continue;
			const parentKey = String(c.parentId);
			const idKey = String(c.id);
			if (ids.has(parentKey) && !ids.has(idKey)) {
				ids.add(idKey);
				changed = true;
			}
		}
	}
	return ids;
}

type SubtreeLocal = { id: string; parentId: string | null };

/** Local nodes whose parent frame is in `subtreeFrameIds`. */
export function computeSubtreeLocalIds(subtreeFrameIds: Set<string>, localNodes: readonly SubtreeLocal[]): Set<string> {
	const ids = new Set<string>();
	for (const local of localNodes) {
		if (local.parentId && subtreeFrameIds.has(String(local.parentId))) {
			ids.add(String(local.id));
		}
	}
	return ids;
}

export function subtreeEntityIgnoreKeys(
	rootFrameId: string,
	frameChildren: readonly SubtreeFrame[],
	localNodes: readonly SubtreeLocal[],
): string[] {
	const subtreeFrameIds = computeSubtreeFrameIds(rootFrameId, frameChildren);
	const subtreeLocalIds = computeSubtreeLocalIds(subtreeFrameIds, localNodes);
	return [...Array.from(subtreeFrameIds, (id) => `node:${id}`), ...Array.from(subtreeLocalIds, (id) => `node:${id}`)];
}

type ParentRef = { parentId: string | null };

export function computeTargetAncestorIgnoreKeys(
	targetId: string | null,
	nodesById: ReadonlyMap<string, ParentRef>,
): string[] {
	if (!targetId) return [];
	const keys = new Set<string>();
	let currentId: string | null = targetId;
	const visited = new Set<string>();
	while (currentId) {
		if (visited.has(currentId)) break;
		visited.add(currentId);
		keys.add(`node:${currentId}`);
		const walk = nodesById.get(currentId);
		if (!walk?.parentId) break;
		currentId = String(walk.parentId);
	}
	return Array.from(keys);
}

export function computeAncestorFrameIgnoreKeys(frameId: string, nodesById: ReadonlyMap<string, ParentRef>): string[] {
	const ignore = new Set<string>();
	let currentParentId = nodesById.get(frameId)?.parentId ? String(nodesById.get(frameId)?.parentId) : null;
	const visited = new Set<string>();
	while (currentParentId) {
		if (visited.has(currentParentId)) break;
		visited.add(currentParentId);
		ignore.add(`node:${currentParentId}`);
		const parent = nodesById.get(currentParentId);
		if (!parent?.parentId) break;
		currentParentId = String(parent.parentId);
	}
	return Array.from(ignore);
}

export function computeLocalNodeAncestorIgnoreKeys(
	localNodeId: string,
	localNodesById: ReadonlyMap<string, { parentId: string | null }>,
	nodesById: ReadonlyMap<string, ParentRef>,
): string[] {
	const local = localNodesById.get(localNodeId);
	if (!local) return [];
	const ignore = new Set<string>();
	let walkFrameId = local.parentId ? String(local.parentId) : null;
	const visited = new Set<string>();
	while (walkFrameId) {
		if (visited.has(walkFrameId)) break;
		visited.add(walkFrameId);
		ignore.add(`node:${walkFrameId}`);
		const ancestor = nodesById.get(walkFrameId);
		if (!ancestor?.parentId) break;
		walkFrameId = String(ancestor.parentId);
	}
	return Array.from(ignore);
}

export function clampSubtreeDeltaToRootBounds(
	subtreeBounds: { minX: number; minY: number; maxX: number; maxY: number },
	dx: number,
	dy: number,
	rootWidth: number,
	rootHeight: number,
): { dx: number; dy: number } {
	const minDx = -subtreeBounds.minX;
	const maxDx = rootWidth - subtreeBounds.maxX;
	const minDy = -subtreeBounds.minY;
	const maxDy = rootHeight - subtreeBounds.maxY;
	return {
		dx: Math.min(maxDx, Math.max(minDx, dx)),
		dy: Math.min(maxDy, Math.max(minDy, dy)),
	};
}

export type PreparedMoveSubtreeSnapshot = {
	subtreeFrameIds: readonly string[];
	subtreeLocalIds: readonly string[];
	subtreeFrameStartRects: Readonly<Record<string, DraftRect>>;
	subtreeLocalStartRects: Readonly<Record<string, DraftRect>>;
	staticRects: readonly { key: string; rect: DraftRect }[];
};

function toIgnoreSet(ignoreKeys?: ReadonlySet<string> | readonly string[] | undefined): Set<string> {
	if (!ignoreKeys) return new Set();
	return ignoreKeys instanceof Set ? ignoreKeys : new Set(ignoreKeys);
}

export function hasPreparedMoveOverlap(
	prepared: PreparedMoveSubtreeSnapshot,
	dx: number,
	dy: number,
	ignoreKeys?: ReadonlySet<string> | readonly string[],
): boolean {
	const ignored = toIgnoreSet(ignoreKeys);
	for (const staticEntry of prepared.staticRects) {
		if (ignored.has(staticEntry.key)) continue;
		for (const id of prepared.subtreeFrameIds) {
			const base = prepared.subtreeFrameStartRects[id];
			if (!base) continue;
			if (intersectsRect({ ...base, x: base.x + dx, y: base.y + dy }, staticEntry.rect)) return true;
		}
		for (const id of prepared.subtreeLocalIds) {
			const base = prepared.subtreeLocalStartRects[id];
			if (!base) continue;
			if (intersectsRect({ ...base, x: base.x + dx, y: base.y + dy }, staticEntry.rect)) return true;
		}
	}
	return false;
}

export function getPreparedMoveOverlapKeys(
	prepared: PreparedMoveSubtreeSnapshot,
	dx: number,
	dy: number,
	ignoreKeys?: ReadonlySet<string> | readonly string[],
): string[] {
	const ignored = toIgnoreSet(ignoreKeys);
	const overlapKeys = new Set<string>();
	for (const staticEntry of prepared.staticRects) {
		if (ignored.has(staticEntry.key)) continue;
		for (const id of prepared.subtreeFrameIds) {
			const base = prepared.subtreeFrameStartRects[id];
			if (!base) continue;
			if (intersectsRect({ ...base, x: base.x + dx, y: base.y + dy }, staticEntry.rect)) {
				overlapKeys.add(staticEntry.key);
				break;
			}
		}
		for (const id of prepared.subtreeLocalIds) {
			const base = prepared.subtreeLocalStartRects[id];
			if (!base) continue;
			if (intersectsRect({ ...base, x: base.x + dx, y: base.y + dy }, staticEntry.rect)) {
				overlapKeys.add(staticEntry.key);
				break;
			}
		}
	}
	return Array.from(overlapKeys);
}

type DropTargetFrame = {
	id: string;
	geometry: { width: number; height: number };
};

export function findDropTarget<T extends DropTargetFrame>(
	rect: DraftRect,
	frameCandidates: readonly T[],
	getAbsPosition: (frameId: string) => { x: number; y: number },
	excludeFrameId?: string,
): T | null {
	const candidates = frameCandidates.filter((c) => {
		if (excludeFrameId && String(c.id) === excludeFrameId) return false;
		const abs = getAbsPosition(String(c.id));
		return (
			rect.width <= c.geometry.width &&
			rect.height <= c.geometry.height &&
			rect.x >= abs.x &&
			rect.y >= abs.y &&
			rect.x + rect.width <= abs.x + c.geometry.width &&
			rect.y + rect.height <= abs.y + c.geometry.height
		);
	});
	if (candidates.length === 0) return null;
	const sorted = [...candidates].sort(
		(a, b) => a.geometry.width * a.geometry.height - b.geometry.width * b.geometry.height,
	);
	return sorted[0] ?? null;
}
