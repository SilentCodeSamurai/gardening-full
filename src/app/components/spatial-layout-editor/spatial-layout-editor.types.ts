import type { HTMLAttributes, ReactNode } from "react";
import type { SpatialLayoutHistoryApi } from "./spatial-layout-editor.history";
import type { SpatialNodeEntityRef } from "@backend/core/domain/spatial/entities";

export type { SpatialLayoutHistoryApi };

export type SpatialPosition = {
	x: number;
	y: number;
};

export type SpatialSize = {
	width: number;
	height: number;
};

/** Local placement in parent frame coordinates. */
export type SpatialGeometry = SpatialPosition & SpatialSize;

/**
 * One node in the layout tree.
 *
 * - **`acceptsChildren`** — spatial role (frames vs leaves): drop targets, subtree drag, resize
 *   rules, persist batching. Adapter-owned.
 * - **`nodeType`** — domain identity for callbacks (`onApplyOperations`, `createNode`, etc.); use a
 *   string union or branded type per adapter. Independent of **`acceptsChildren`**.
 */
export type SpatialLayoutNode<TNodeType extends string = string> = {
	id: string;
	parentId: string | null;
	geometry: SpatialGeometry;
	label: string;
	acceptsChildren: boolean;
	nodeType: TNodeType;
};

/** Pan/zoom state for the layout canvas (screen space before `scale`). */
export type SpatialLayoutViewportState = {
	x: number;
	y: number;
	scale: number;
};

/** Visual/interaction flags for the root (dashed) frame. */
export type SpatialLayoutRootVisualState = {
	contextActive: boolean;
	dropTarget: boolean;
};

/** Visual/interaction flags for a node. */
export type SpatialLayoutNodeVisualState = {
	invalidDrag: boolean;
	collisionTarget: boolean;
	contextActive: boolean;
	dropTarget: boolean;
};

export type SpatialLayoutNodePatch = {
	parentId: string | null;
	geometry: SpatialGeometry;
};

export type SpatialLayoutPersistKind = "move-node" | "resize-node" | "resize-root" | "auto-layout";

/** Serializable subset of node fields used for operation history + persistence. */
export type SpatialLayoutNodeSnapshot = Readonly<{
	id: string;
	parentId: string | null;
	geometry: SpatialGeometry;
	nodeType: SpatialLayoutNode["nodeType"];
	acceptsChildren: boolean;
	label: string;
	spatialRef?: SpatialNodeEntityRef;
}>;

/**
 * Operation history entries.
 * - Editor treats this as intent: it does not mutate the durable node graph itself.
 * - Adapter is responsible for mapping operations to CRUD calls and updating nodes[] via the host cache.
 */
export type SpatialLayoutOperation<TNode extends SpatialLayoutNode = SpatialLayoutNode> = Readonly<
	| {
			type: "updateNode";
			id: string;
			before: SpatialLayoutNodeSnapshot;
			after: SpatialLayoutNodeSnapshot;
			/**
			 * How the host should interpret this update for UI/history (optional hint).
			 * Durable persistence is still determined by node identity and after snapshot.
			 */
			kind?: SpatialLayoutPersistKind;
	  }
	| {
			type: "deleteNode";
			id: string;
			before: SpatialLayoutNodeSnapshot;
	  }
	| {
			type: "restoreNode";
			id: string;
			after: SpatialLayoutNodeSnapshot;
	  }
	| {
			type: "createNode";
			/**
			 * Final id that exists after the create operation is applied.
			 * (For optimistic/placeholder flows, adapter/editor should resolve placeholders before committing to history.)
			 */
			id: string;
			after: SpatialLayoutNodeSnapshot;
	  }
	| {
			type: "reparentNode";
			id: string;
			before: SpatialLayoutNodeSnapshot;
			after: SpatialLayoutNodeSnapshot;
	  }
	| {
			type: "batch";
			ops: readonly SpatialLayoutOperation<TNode>[];
	  }
>;

export type SpatialLayoutCreateOption<
	TNode extends SpatialLayoutNode = SpatialLayoutNode,
	TOptionId extends string = string,
> = {
	id: TOptionId;
	label: string;
	createNode: (parent: TNode) => TNode;
};

export type SpatialLayoutPlacementCandidate<TNode extends SpatialLayoutNode = SpatialLayoutNode> = {
	node: TNode;
	/**
	 * Optional drafts rendered with {@link node} (e.g. existing spatial subtree). Same `parentId` /
	 * local geometry as durable nodes; not persisted until host confirms. Host should list
	 * descendants in parent-before-child order.
	 */
	companionDraftNodes?: readonly TNode[];
	onChange: (next: TNode) => void;
	onConfirm: (node: TNode) => Promise<void> | void;
	onCancel: () => void;
};

/** Matches {@link AUTO_LAYOUT_OPTIONS} ids in `spatial-layout-editor.utils`. */
export type SpatialAutoLayoutMode =
	| "stack-left"
	| "stack-middle"
	| "stack-right"
	| "stack-top"
	| "stack-bottom"
	| "row-top"
	| "row-middle"
	| "row-bottom"
	| "column-left"
	| "column-center"
	| "column-right"
	| "grid-balanced"
	| "space-between"
	| "space-around";

/** Copy for chrome, menus, and tooltips (callers typically pass translated strings). */
export type SpatialLayoutEditorLabels = Readonly<{
	headerLabel?: string;
	/** When `headerLabel` is omitted. */
	fallbackHeader?: string;
	autoLayoutMenu?: string;
	createMenu?: string;
	resetView?: string;
	undo?: string;
	redo?: string;
	toolbarAutoLayout?: string;
	zoomOut?: string;
	zoomIn?: string;
	/** Toolbar toggle: shown when layout is locked (view-only). */
	lockLayoutToggleUnlockHint?: string;
	/** Toolbar toggle: shown when layout is unlocked (editable). */
	lockLayoutToggleLockHint?: string;
	canvasMenu?: string;
	/** Lift bound nodes to unplaced roots (spatial rows kept); subtree stays for location frames. */
	detach?: string;
	/** Delete spatial nodes (entities stay; bindings cleared). Undo restores nodes. */
	remove?: string;
	detachOrRemoveWithChildren?: string;
	detachOrRemoveWithoutChildren?: string;
	duplicate?: string;
	createManyMenu?: string;
	createManyQuantity?: string;
	createManyLayoutMode?: string;
	createManyReapplyLayout?: string;
	createManyCancel?: string;
	createManyContinue?: string;
	confirmPlacement?: string;
	duplicateConfirmPlacement?: string;
	cancelPlacement?: string;
	duplicateNoSpaceAlert?: string;
	autoLayoutNoFitAlert?: string;
	autoLayoutGroupLabels?: Readonly<{
		stack?: string;
		rows?: string;
		columns?: string;
	}>;
	autoLayoutModes?: Readonly<
		Partial<Readonly<Record<SpatialAutoLayoutMode, Readonly<{ label?: string; hint?: string }>>>>
	>;
}>;

/** CSS classes and shell resolvers for the canvas chrome. */
export type SpatialLayoutEditorClassNames<TNode extends SpatialLayoutNode = SpatialLayoutNode> = Readonly<{
	/** Outer editor wrapper (`cn("space-y-3", …)`). */
	root?: HTMLAttributes<HTMLDivElement>["className"];
	/**
	 * Extra canvas `className` segments; merged with the editor default viewport classes via `cn` (e.g. `min-h-full`).
	 */
	viewport?: string;
	interactionGhost?: string;
	rootResizeHandle?: string;
	nodeResizeHandle?: string;
	nodeContent?: string;
	/** Applied to a node shell while initial highlight is active. */
	nodeHighlight?: string;
	/** Extra shell class for draft nodes (create, duplicate, create-many). */
	nodeDraftShell?: (node: TNode, state: SpatialLayoutNodeVisualState) => string;
	/** Extra shell class for the create-many template draft node. */
	nodeDraftTemplateShell?: (node: TNode, state: SpatialLayoutNodeVisualState) => string;
	/**
	 * Root frame: positioning/interaction, fill, and stateful border (`border-2` draws inside `width`/`height` when using `box-border`).
	 */
	rootShell?: (root: TNode, state: SpatialLayoutRootVisualState) => string;
	/**
	 * Node frame: positioning/interaction, fill, and stateful border (`border-2` draws inside `width`/`height` when using `box-border`).
	 */
	nodeShell?: (node: TNode, state: SpatialLayoutNodeVisualState) => string;
}>;

/** Built-in localStorage undo/redo when combined with {@link SpatialLayoutEditorProps.onApplyOperations}. */
export type SpatialLayoutEditorHistoryBuiltinEnabled = Readonly<{
	enabled: true;
	storageKey: string;
	maxEntries?: number;
}>;

export type SpatialLayoutEditorHistoryBuiltinDisabled = Readonly<{
	enabled: false;
	storageKey?: undefined;
}>;

export type SpatialLayoutEditorHistoryOptions =
	| SpatialLayoutEditorHistoryBuiltinEnabled
	| SpatialLayoutEditorHistoryBuiltinDisabled;

/** Host context-menu fragments; {@link SpatialLayoutEditorProps.renderNodeContextActions}. */
export type SpatialLayoutNodeContextActionSlices = Readonly<{
	/** Add-existing and similar; hidden while the layout lock is on. */
	layout?: ReactNode;
	/** Shown even when the layout is locked. */
	other?: ReactNode;
}>;

export type SpatialLayoutEditorProps<TNode extends SpatialLayoutNode = SpatialLayoutNode> = Readonly<{
	root: TNode;
	nodes: readonly TNode[];
	labels?: SpatialLayoutEditorLabels;
	classNames?: SpatialLayoutEditorClassNames<TNode>;
	/** Omit or `{ enabled: false }` for no built-in stack. Ignored when {@link layoutHistory} is set. */
	history?: SpatialLayoutEditorHistoryOptions;
	mapNodePatch?: (current: TNode, patch: SpatialLayoutNodePatch) => TNode;
	/**
	 * Operation-based apply contract for history + persistence.
	 */
	onApplyOperations: (input: { operations: readonly SpatialLayoutOperation<TNode>[] }) => Promise<unknown>;
	layoutHistory?: SpatialLayoutHistoryApi;
	layoutDataRevision?: number;
	getCreateOptions?: (parent: TNode) => SpatialLayoutCreateOption<TNode>[];
	onCreatePlacementConfirm?: (input: { optionId: string; node: TNode; parent: TNode }) => Promise<void> | void;
	placementCandidate?: SpatialLayoutPlacementCandidate<TNode> | null;
	onDuplicateNodePlacementConfirm?: (args: { sourceNode: TNode; duplicateNode: TNode }) => void | Promise<void>;
	onCreateManyPlacementConfirm?: (input: {
		optionId: string;
		nodes: readonly TNode[];
		parent: TNode;
	}) => void | Promise<void>;
	/** Node id to briefly highlight when editor opens (e.g. deep-link context). */
	highlightNodeId?: string | null;
	/** Duration for one-time `highlightNodeId` emphasis. */
	highlightDurationMs?: number;
	onErrorMessage?: (message: string) => void;
	renderNodeContent?: (node: TNode, state: SpatialLayoutNodeVisualState) => ReactNode;
	renderNodeContextActions?: (node: TNode) => SpatialLayoutNodeContextActionSlices | null | undefined;
	gridStep?: number;
	nodeMinSize?: number;
	initialViewport?: Readonly<Partial<SpatialLayoutViewportState>>;
}>;
