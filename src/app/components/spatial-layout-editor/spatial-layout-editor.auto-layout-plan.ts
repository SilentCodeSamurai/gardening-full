import type { SpatialGeometry } from "./spatial-layout-editor.types";
import type { AutoLayoutMode } from "./spatial-layout-editor.utils";
import { intersectsRect, snap } from "./spatial-layout-editor.utils";

type Dims = { width: number; height: number };

type AnchorY = "top" | "middle" | "bottom";
type AnchorX = "left" | "center" | "right";

function resolveAnchorOffset(
	total: number,
	container: number,
	anchor: "top" | "middle" | "bottom" | "left" | "center" | "right",
): number {
	if (anchor === "middle" || anchor === "center") return Math.max(0, Math.floor((container - total) / 2));
	if (anchor === "bottom" || anchor === "right") return Math.max(0, container - total);
	return 0;
}

function layoutHorizontalFlow(
	dims: readonly Dims[],
	parentWidth: number,
	parentHeight: number,
	gap: number,
	anchorY: AnchorY,
): SpatialGeometry[] {
	const rows: {
		items: { index: number; width: number; height: number }[];
		width: number;
		height: number;
	}[] = [{ items: [], width: 0, height: 0 }];
	for (let index = 0; index < dims.length; index++) {
		const d = dims[index];
		const current = rows[rows.length - 1];
		const nextWidth = current.items.length === 0 ? d.width : current.width + gap + d.width;
		if (current.items.length > 0 && nextWidth > parentWidth) {
			rows.push({
				items: [{ index, width: d.width, height: d.height }],
				width: d.width,
				height: d.height,
			});
			continue;
		}
		current.items.push({ index, width: d.width, height: d.height });
		current.width = nextWidth;
		current.height = Math.max(current.height, d.height);
	}

	const totalHeight = rows.reduce((sum, row) => sum + row.height, 0) + Math.max(0, rows.length - 1) * gap;
	const startY = resolveAnchorOffset(totalHeight, parentHeight, anchorY);
	const out = Array.from({ length: dims.length }, () => ({ x: 0, y: 0, width: 0, height: 0 }));
	let cursorY = startY;
	for (const row of rows) {
		let cursorX = 0;
		for (const item of row.items) {
			out[item.index] = {
				x: cursorX,
				y: cursorY + Math.floor((row.height - item.height) / 2),
				width: item.width,
				height: item.height,
			};
			cursorX += item.width + gap;
		}
		cursorY += row.height + gap;
	}
	return out;
}

function layoutVerticalFlow(
	dims: readonly Dims[],
	parentWidth: number,
	parentHeight: number,
	gap: number,
	anchorX: AnchorX,
): SpatialGeometry[] {
	const cols: {
		items: { index: number; width: number; height: number }[];
		width: number;
		height: number;
	}[] = [{ items: [], width: 0, height: 0 }];
	for (let index = 0; index < dims.length; index++) {
		const d = dims[index];
		const current = cols[cols.length - 1];
		const nextHeight = current.items.length === 0 ? d.height : current.height + gap + d.height;
		if (current.items.length > 0 && nextHeight > parentHeight) {
			cols.push({
				items: [{ index, width: d.width, height: d.height }],
				width: d.width,
				height: d.height,
			});
			continue;
		}
		current.items.push({ index, width: d.width, height: d.height });
		current.height = nextHeight;
		current.width = Math.max(current.width, d.width);
	}

	const totalWidth = cols.reduce((sum, col) => sum + col.width, 0) + Math.max(0, cols.length - 1) * gap;
	const startX = resolveAnchorOffset(totalWidth, parentWidth, anchorX);
	const out = Array.from({ length: dims.length }, () => ({ x: 0, y: 0, width: 0, height: 0 }));
	let cursorX = startX;
	for (const col of cols) {
		let cursorY = 0;
		for (const item of col.items) {
			out[item.index] = {
				x: cursorX + Math.floor((col.width - item.width) / 2),
				y: cursorY,
				width: item.width,
				height: item.height,
			};
			cursorY += item.height + gap;
		}
		cursorX += col.width + gap;
	}
	return out;
}

function layoutSingleHorizontalStack(
	dims: readonly Dims[],
	parentWidth: number,
	parentHeight: number,
	gap: number,
	anchorY: AnchorY,
): SpatialGeometry[] | null {
	const totalWidth = dims.reduce((sum, d) => sum + d.width, 0) + Math.max(0, dims.length - 1) * gap;
	const maxHeight = dims.reduce((m, d) => Math.max(m, d.height), 0);
	if (totalWidth > parentWidth || maxHeight > parentHeight) return null;
	const startY = resolveAnchorOffset(maxHeight, parentHeight, anchorY);
	const out: SpatialGeometry[] = [];
	let x = 0;
	for (const d of dims) {
		out.push({
			x,
			y: startY + Math.floor((maxHeight - d.height) / 2),
			width: d.width,
			height: d.height,
		});
		x += d.width + gap;
	}
	return out;
}

function layoutSingleVerticalStack(
	dims: readonly Dims[],
	parentWidth: number,
	parentHeight: number,
	gap: number,
	anchorX: AnchorX,
): SpatialGeometry[] | null {
	const totalHeight = dims.reduce((sum, d) => sum + d.height, 0) + Math.max(0, dims.length - 1) * gap;
	const maxWidth = dims.reduce((m, d) => Math.max(m, d.width), 0);
	if (totalHeight > parentHeight || maxWidth > parentWidth) return null;
	const startX = resolveAnchorOffset(maxWidth, parentWidth, anchorX);
	const out: SpatialGeometry[] = [];
	let y = 0;
	for (const d of dims) {
		out.push({
			x: startX + Math.floor((maxWidth - d.width) / 2),
			y,
			width: d.width,
			height: d.height,
		});
		y += d.height + gap;
	}
	return out;
}

function layoutHorizontalDistributed(
	dims: readonly Dims[],
	parentWidth: number,
	parentHeight: number,
	minGap: number,
	mode: "space-between" | "space-around",
): SpatialGeometry[] {
	const rows: {
		items: { index: number; width: number; height: number }[];
		width: number;
		height: number;
	}[] = [{ items: [], width: 0, height: 0 }];
	for (let index = 0; index < dims.length; index++) {
		const d = dims[index];
		const current = rows[rows.length - 1];
		const nextWidth = current.items.length === 0 ? d.width : current.width + minGap + d.width;
		if (current.items.length > 0 && nextWidth > parentWidth) {
			rows.push({
				items: [{ index, width: d.width, height: d.height }],
				width: d.width,
				height: d.height,
			});
			continue;
		}
		current.items.push({ index, width: d.width, height: d.height });
		current.width = nextWidth;
		current.height = Math.max(current.height, d.height);
	}
	const out = Array.from({ length: dims.length }, () => ({ x: 0, y: 0, width: 0, height: 0 }));
	const totalRowsHeight = rows.reduce((sum, row) => sum + row.height, 0);
	const freeY = Math.max(0, parentHeight - totalRowsHeight);
	const rowCount = rows.length;
	const betweenY = mode === "space-between" ? (rowCount > 1 ? freeY / (rowCount - 1) : 0) : freeY / rowCount;
	const edgeY = mode === "space-between" ? 0 : betweenY / 2;
	let y = edgeY;
	for (const row of rows) {
		const n = row.items.length;
		const sumW = row.items.reduce((sum, item) => sum + item.width, 0);
		const free = Math.max(0, parentWidth - sumW);
		const between = mode === "space-between" ? (n > 1 ? free / (n - 1) : 0) : free / n;
		const edge = mode === "space-between" ? 0 : between / 2;
		let x = edge;
		for (const item of row.items) {
			out[item.index] = {
				x,
				y: y + Math.floor((row.height - item.height) / 2),
				width: item.width,
				height: item.height,
			};
			x += item.width + between;
		}
		y += row.height + betweenY;
	}
	return out;
}

function computeGeomsForOrder(
	parentGeometry: { width: number; height: number },
	childGeometries: readonly Dims[],
	mode: AutoLayoutMode,
	gridStep: number,
	minSize: number,
): SpatialGeometry[] {
	const snapToGrid = (v: number) => snap(v, gridStep);
	const totalItems = childGeometries.length;
	if (totalItems === 0) return [];

	const directChildren = childGeometries.map((d) => ({
		geometry: {
			x: 0,
			y: 0,
			width: Math.max(minSize, d.width),
			height: Math.max(minSize, d.height),
		},
	}));

	const targetInnerW = Math.max(minSize, parentGeometry.width);
	const targetHeight = Math.max(minSize, parentGeometry.height);
	const snapPositionWithinParent = (value: number, size: number, parentSize: number): number => {
		const snapped = snapToGrid(value);
		const maxPos = Math.max(0, parentSize - size);
		return Math.max(0, Math.min(maxPos, snapped));
	};
	const dims: Dims[] = directChildren.map((c) => ({
		width: Math.max(minSize, c.geometry.width),
		height: Math.max(minSize, c.geometry.height),
	}));

	const modeRowAnchor: Record<Extract<AutoLayoutMode, "row-top" | "row-middle" | "row-bottom">, AnchorY> = {
		"row-top": "top",
		"row-middle": "middle",
		"row-bottom": "bottom",
	};
	if (mode === "row-top" || mode === "row-middle" || mode === "row-bottom") {
		const geoms = layoutHorizontalFlow(dims, targetInnerW, targetHeight, gridStep, modeRowAnchor[mode]);
		return geoms.map((g) => ({
			x: snapPositionWithinParent(g.x, g.width, targetInnerW),
			y: snapPositionWithinParent(g.y, g.height, targetHeight),
			width: g.width,
			height: g.height,
		}));
	}

	const modeColumnAnchor: Record<
		Extract<AutoLayoutMode, "column-left" | "column-center" | "column-right">,
		AnchorX
	> = {
		"column-left": "left",
		"column-center": "center",
		"column-right": "right",
	};
	if (mode === "column-left" || mode === "column-center" || mode === "column-right") {
		const geoms = layoutVerticalFlow(dims, targetInnerW, targetHeight, gridStep, modeColumnAnchor[mode]);
		return geoms.map((g) => ({
			x: snapPositionWithinParent(g.x, g.width, targetInnerW),
			y: snapPositionWithinParent(g.y, g.height, targetHeight),
			width: g.width,
			height: g.height,
		}));
	}

	const stackHorizontalAnchors: Record<Extract<AutoLayoutMode, "stack-top" | "stack-bottom">, AnchorY> = {
		"stack-top": "top",
		"stack-bottom": "bottom",
	};
	if (mode === "stack-top" || mode === "stack-bottom") {
		const single = layoutSingleHorizontalStack(
			dims,
			targetInnerW,
			targetHeight,
			gridStep,
			stackHorizontalAnchors[mode],
		);
		const geoms =
			single ?? layoutHorizontalFlow(dims, targetInnerW, targetHeight, gridStep, stackHorizontalAnchors[mode]);
		return geoms.map((g) => ({
			x: snapPositionWithinParent(g.x, g.width, targetInnerW),
			y: snapPositionWithinParent(g.y, g.height, targetHeight),
			width: g.width,
			height: g.height,
		}));
	}

	const stackVerticalAnchors: Record<
		Extract<AutoLayoutMode, "stack-left" | "stack-middle" | "stack-right">,
		AnchorX
	> = {
		"stack-left": "left",
		"stack-middle": "center",
		"stack-right": "right",
	};
	if (mode === "stack-left" || mode === "stack-middle" || mode === "stack-right") {
		const single = layoutSingleVerticalStack(
			dims,
			targetInnerW,
			targetHeight,
			gridStep,
			stackVerticalAnchors[mode],
		);
		const geoms =
			single ?? layoutVerticalFlow(dims, targetInnerW, targetHeight, gridStep, stackVerticalAnchors[mode]);
		return geoms.map((g) => ({
			x: snapPositionWithinParent(g.x, g.width, targetInnerW),
			y: snapPositionWithinParent(g.y, g.height, targetHeight),
			width: g.width,
			height: g.height,
		}));
	}

	if (mode === "space-between" || mode === "space-around") {
		const geoms = layoutHorizontalDistributed(dims, targetInnerW, targetHeight, gridStep, mode);
		return geoms.map((g) => ({
			x: snapPositionWithinParent(g.x, g.width, targetInnerW),
			y: snapPositionWithinParent(g.y, g.height, targetHeight),
			width: g.width,
			height: g.height,
		}));
	}

	const preferredGridCols = Math.max(1, Math.ceil(Math.sqrt(totalItems)));
	const maxChildW = Math.max(...directChildren.map((c) => c.geometry.width));
	const maxChildH = Math.max(...directChildren.map((c) => c.geometry.height));
	const cellW = maxChildW;
	const cellH = maxChildH;
	const maxGridColsByWidth = Math.max(1, Math.floor((targetInnerW + gridStep) / (cellW + gridStep)));
	let gridCols = 1;
	let bestGridScore = Number.POSITIVE_INFINITY;
	for (let cols = 1; cols <= Math.min(totalItems, maxGridColsByWidth); cols++) {
		const rows = Math.ceil(totalItems / cols);
		const requiredW = cols * cellW + Math.max(0, cols - 1) * gridStep;
		const requiredH = rows * cellH + Math.max(0, rows - 1) * gridStep;
		const fits = requiredW <= targetInnerW && requiredH <= targetHeight;
		const score =
			(fits ? 0 : 1_000_000) +
			Math.abs(cols - preferredGridCols) * 1000 +
			Math.max(0, requiredW - targetInnerW) +
			Math.max(0, requiredH - targetHeight);
		if (score < bestGridScore) {
			bestGridScore = score;
			gridCols = cols;
		}
	}
	const gridRows = Math.max(1, Math.ceil(totalItems / gridCols));

	let cursorX = 0;
	let cursorY = 0;
	let rowHeight = 0;

	const geoms = directChildren.map((child, index) => {
		const childWidth = Math.max(minSize, child.geometry.width);
		const childHeight = Math.max(minSize, child.geometry.height);
		let x = 0;
		let y = 0;
		if (mode === "grid-balanced") {
			const col = index % gridCols;
			const row = Math.min(gridRows - 1, Math.floor(index / gridCols));
			x = col * (cellW + gridStep);
			y = row * (cellH + gridStep);
		} else {
			const nextRight = cursorX + childWidth;
			if (cursorX > 0 && nextRight > targetInnerW) {
				cursorX = 0;
				cursorY += rowHeight + gridStep;
				rowHeight = 0;
			}
			x = cursorX;
			y = cursorY;
			cursorX += childWidth + gridStep;
			rowHeight = Math.max(rowHeight, childHeight);
		}
		return {
			x: snapPositionWithinParent(x, childWidth, targetInnerW),
			y: snapPositionWithinParent(y, childHeight, targetHeight),
			width: childWidth,
			height: childHeight,
		};
	});

	return geoms;
}

/**
 * Computes snapped local geometries for new children inside a parent frame (no persistence).
 * Mirrors {@link SpatialLayoutEditor} auto-layout packing for existing children.
 */
/** True if every child fits in the parent's inner box and no two children overlap (local coords). */
export function localChildGeometriesValidInParent(
	parentWidth: number,
	parentHeight: number,
	geoms: readonly SpatialGeometry[],
): boolean {
	for (const g of geoms) {
		if (g.x < 0 || g.y < 0) return false;
		if (g.x + g.width > parentWidth || g.y + g.height > parentHeight) return false;
	}
	for (let i = 0; i < geoms.length; i++) {
		for (let j = i + 1; j < geoms.length; j++) {
			const a = geoms[i];
			const b = geoms[j];
			if (
				intersectsRect(
					{ x: a.x, y: a.y, width: a.width, height: a.height },
					{ x: b.x, y: b.y, width: b.width, height: b.height },
				)
			) {
				return false;
			}
		}
	}
	return true;
}

export function planGeometriesInParentFrame(
	parentGeometry: { width: number; height: number },
	childGeometries: readonly Dims[],
	mode: AutoLayoutMode,
	gridStep: number,
	minSize: number,
): SpatialGeometry[] {
	return computeGeomsForOrder(parentGeometry, childGeometries, mode, gridStep, minSize);
}
