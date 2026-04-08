import { createElement } from "react";
import type { ReactNode } from "react";
import type {
	SpatialLayoutEditorClassNames,
	SpatialLayoutEditorLabels,
	SpatialLayoutNode,
	SpatialLayoutNodeVisualState,
	SpatialLayoutRootVisualState,
	SpatialLayoutViewportState,
} from "./spatial-layout-editor.types";

/** Default world-space snap step (px) for `SpatialLayoutEditor`. */
export const DEFAULT_GRID_SIZE = 20;

/** Default minimum width/height when resizing nodes or the root (px). */
export const DEFAULT_NODE_MIN_SIZE = 40;

export const DEFAULT_INITIAL_VIEWPORT: SpatialLayoutViewportState = { x: 24, y: 24, scale: 1 };

/** Default English chrome copy for {@link SpatialLayoutEditor} (`labels` prop is shallow-merged over this). */
export const DEFAULT_LABELS: SpatialLayoutEditorLabels = {
	fallbackHeader: "Layout editor",
	autoLayoutMenu: "Auto layout",
	createMenu: "Create",
	resetView: "Reset view",
	undo: "Undo",
	redo: "Redo",
	toolbarAutoLayout: "Auto-layout",
	zoomOut: "Zoom out",
	zoomIn: "Zoom in",
	lockLayoutToggleUnlockHint: "Layout is locked — click to move and resize items",
	lockLayoutToggleLockHint: "Layout is editable — click to lock moving and resizing",
	canvasMenu: "Canvas",
	detach: "Detach from layout",
	remove: "Remove from layout",
	detachOrRemoveWithChildren: "With children",
	detachOrRemoveWithoutChildren: "Without children",
	duplicate: "Duplicate",
	createManyMenu: "Create many…",
	createManyQuantity: "Quantity",
	createManyLayoutMode: "Arrange as",
	createManyReapplyLayout: "Reapply layout",
	createManyCancel: "Cancel",
	createManyContinue: "Continue to details",
	confirmPlacement: "Create",
	cancelPlacement: "Cancel",
	autoLayoutNoFitAlert:
		"Layout cannot be applied because items do not fit this frame. Try another mode or resize/move items.",
	autoLayoutGroupLabels: {
		stack: "Stack",
		rows: "Rows",
		columns: "Columns",
	},
};

/** Root dashed frame from {@link SpatialLayoutRootVisualState} (shell / border highlight). */
export function defaultGetRootShellClassName(root: SpatialLayoutNode, state: SpatialLayoutRootVisualState): string {
	void root;
	if (state.contextActive) return "border-primary";
	if (state.dropTarget) return "border-amber-600 animate-pulse";
	return "border-primary/30";
}

/** Default node frame: `box-border` keeps the stroke inside the laid-out rect (grid-aligned outer edge). */
export function defaultGetNodeShellClassName(node: SpatialLayoutNode, state: SpatialLayoutNodeVisualState): string {
	void node;
	const borderColor = state.invalidDrag
		? "border-red-500"
		: state.collisionTarget
			? "border-red-800"
			: state.contextActive
				? "border-teal-500"
				: state.dropTarget
					? "border-amber-600 animate-pulse"
					: "border-primary/60";
	return `box-border absolute cursor-move overflow-visible bg-muted/50 text-xs border-2 border-solid transition-colors ${borderColor}`;
}

/** Extra border treatment for draft nodes (create / duplicate / create-many). */
export function defaultGetNodeDraftShellClassName(
	node: SpatialLayoutNode,
	state: SpatialLayoutNodeVisualState,
): string {
	void node;
	void state;
	return "!border-cyan-500 !border-dashed !bg-cyan-500/10";
}

/** Extra border treatment for create-many template draft node. */
export function defaultGetNodeDraftTemplateShellClassName(
	node: SpatialLayoutNode,
	state: SpatialLayoutNodeVisualState,
): string {
	void node;
	void state;
	return "!border-blue-500 !border-dashed !bg-blue-500/10";
}

/** Default Tailwind/class hooks for `SpatialLayoutEditor` (merge with `classNames` prop). */
export const DEFAULT_CLASS_NAMES: SpatialLayoutEditorClassNames = {
	viewport: "relative min-h-[420px] border rounded-md bg-muted/25 overflow-hidden",
	interactionGhost: "absolute pointer-events-none border-2 border-dashed border-slate-500/70 bg-slate-300/10",
	rootResizeHandle:
		"absolute right-0 bottom-0 z-20 h-4 w-4 cursor-se-resize border border-primary-foreground bg-primary",
	nodeResizeHandle:
		"absolute right-0 bottom-0 z-20 h-3 w-3 cursor-se-resize border border-primary-foreground bg-primary",
	nodeContent: "relative z-0 box-border h-full min-h-0 p-1 pr-4 pb-4",
	nodeHighlight: "ring-1 ring-amber-300/70 animate-pulse",
	nodeDraftShell: defaultGetNodeDraftShellClassName,
	nodeDraftTemplateShell: defaultGetNodeDraftTemplateShellClassName,
	rootShell: defaultGetRootShellClassName,
	nodeShell: defaultGetNodeShellClassName,
};

/** Label-only inner content when the host does not pass `renderNodeContent`. */
export function defaultRenderNodeContent(node: SpatialLayoutNode, state: SpatialLayoutNodeVisualState): ReactNode {
	void state;
	return createElement(
		"span",
		{
			className:
				"pointer-events-none absolute -top-5 left-1/2 max-w-[calc(100%-8px)] -translate-x-1/2 truncate rounded bg-background/80 px-1.5 py-0.5 text-[10px] leading-tight",
		},
		node.label,
	);
}
