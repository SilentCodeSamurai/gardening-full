import {
	ChevronDown,
	Grid2x2Check,
	Grid2x2X,
	Lock,
	LockOpen,
	Minus,
	Plus,
	Redo2,
	RefreshCcw,
	RotateCcw,
	Undo2,
} from "lucide-react";
import {
	type ReactNode,
	type PointerEvent as ReactPointerEvent,
	startTransition,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Card } from "@/components/ui/card";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
	localChildGeometriesValidInParent,
	planGeometriesInParentFrame,
} from "./spatial-layout-editor.auto-layout-plan";
import {
	DEFAULT_CLASS_NAMES,
	DEFAULT_GRID_SIZE,
	DEFAULT_INITIAL_VIEWPORT,
	DEFAULT_LABELS,
	DEFAULT_NODE_MIN_SIZE,
	defaultRenderNodeContent,
	defaultRenderNodeLabel,
} from "./spatial-layout-editor.defaults";
import type { SpatialLayoutHistoryApi } from "./spatial-layout-editor.history";
import {
	allocateNumberedLabelsForNewSiblings,
	duplicateNumberingStem,
	nextDuplicateLabel,
} from "./spatial-layout-editor.naming";
import type {
	SpatialAutoLayoutMode,
	SpatialGeometry,
	SpatialLayoutEditorClassNames,
	SpatialLayoutEditorHistoryOptions,
	SpatialLayoutEditorProps,
	SpatialLayoutNode,
	SpatialLayoutNodePatch,
	SpatialLayoutNodeSnapshot,
	SpatialLayoutNodeVisualState,
	SpatialLayoutOperation,
	SpatialLayoutRootVisualState,
} from "./spatial-layout-editor.types";
import {
	AUTO_LAYOUT_OPTIONS,
	type AutoLayoutMode,
	computeAncestorFrameIgnoreKeys,
	computeFrameDepth,
	computeFramePosition,
	computeLocalNodeAncestorIgnoreKeys,
	computeSubtreeFrameIds,
	computeSubtreeLocalIds,
	computeTargetAncestorIgnoreKeys,
	type DraftRect,
	findDropTarget,
	getPreparedMoveOverlapKeys,
	getViewportWorldGridBackgroundProps,
	hasPreparedMoveOverlap,
	intersectsRect,
	snap,
	subtreeEntityIgnoreKeys,
} from "./spatial-layout-editor.utils";
import { useSpatialLayoutHistory } from "./use-spatial-layout-editor-history";

function isProvisionalSpatialId(id: string): boolean {
	return id.startsWith("pending-");
}

function mergeAutoLayoutDisplay(
	option: (typeof AUTO_LAYOUT_OPTIONS)[number],
	overrides:
		| Readonly<Partial<Readonly<Record<SpatialAutoLayoutMode, Readonly<{ label?: string; hint?: string }>>>>>
		| undefined,
) {
	const o = overrides?.[option.id as SpatialAutoLayoutMode];
	return {
		label: o?.label ?? option.label,
		hint: o?.hint ?? option.hint,
	};
}

type Interaction =
	| {
			kind: "pan";
			startClientX: number;
			startClientY: number;
			startViewportX: number;
			startViewportY: number;
	  }
	| {
			kind: "move-node";
			acceptsChildren: true;
			id: string;
			startClientX: number;
			startClientY: number;
			startX: number;
			startY: number;
			width: number;
			height: number;
			parentId: string | null;
			subtreeFrameIds: string[];
			subtreeLocalIds: string[];
			subtreeFrameStartRects: Record<string, DraftRect>;
			subtreeLocalStartRects: Record<string, DraftRect>;
			staticRects: { key: string; rect: DraftRect }[];
			subtreeBounds: { minX: number; minY: number; maxX: number; maxY: number };
	  }
	| {
			kind: "move-node";
			acceptsChildren: false;
			id: string;
			startClientX: number;
			startClientY: number;
			startX: number;
			startY: number;
			width: number;
			height: number;
			parentId: string | null;
	  }
	| {
			kind: "resize-node";
			acceptsChildren: boolean;
			id: string;
			startClientX: number;
			startClientY: number;
			startWidth: number;
			startHeight: number;
			x: number;
			y: number;
			parentId: string | null;
	  }
	| {
			kind: "resize-root";
			startClientX: number;
			startClientY: number;
			startWidth: number;
			startHeight: number;
	  };

const defaultHistoryDisabled: SpatialLayoutEditorHistoryOptions = { enabled: false };

type SpatialLayoutEditorResolvedClassNames<TNode extends SpatialLayoutNode> = SpatialLayoutEditorClassNames<TNode> & {
	rootShell: NonNullable<SpatialLayoutEditorClassNames<TNode>["rootShell"]>;
	nodeShell: NonNullable<SpatialLayoutEditorClassNames<TNode>["nodeShell"]>;
	nodeDraftShell: NonNullable<SpatialLayoutEditorClassNames<TNode>["nodeDraftShell"]>;
	nodeDraftTemplateShell: NonNullable<SpatialLayoutEditorClassNames<TNode>["nodeDraftTemplateShell"]>;
};

export function SpatialLayoutEditor<TNode extends SpatialLayoutNode = SpatialLayoutNode>(
	props: SpatialLayoutEditorProps<TNode>,
) {
	const {
		root,
		nodes,
		labels: labelsIn = {},
		classNames: classNamesIn = {},
		history: historyIn,
		onApplyOperations,
		layoutHistory,
		layoutDataRevision = 0,
		getCreateOptions,
		onCreatePlacementConfirm,
		onDuplicateNodePlacementConfirm,
		onCreateManyPlacementConfirm,
		highlightNodeId = null,
		highlightDurationMs = 2400,
		onErrorMessage,
		placementCandidate,
		renderNodeContent = defaultRenderNodeContent,
		renderNodeLabel = defaultRenderNodeLabel,
		renderNodeContextActions,
		mapNodePatch,
		gridStep = DEFAULT_GRID_SIZE,
		nodeMinSize: minSize = DEFAULT_NODE_MIN_SIZE,
		initialViewport: initialViewportPartial,
	} = props;

	// History options from props (builtin stack vs external `layoutHistory`).
	const history: SpatialLayoutEditorHistoryOptions = historyIn ?? defaultHistoryDisabled;
	const layoutHistoryStorageKey = history.enabled ? history.storageKey : "";
	const layoutHistoryMaxEntries = history.enabled ? history.maxEntries : undefined;

	// Merged presentation props (`labels` / `classNames`) for stable references when parents memoize partials.
	const lb = useMemo(() => ({ ...DEFAULT_LABELS, ...labelsIn }), [labelsIn]);
	const duplicateConfirmLabelResolved = lb.duplicateConfirmPlacement ?? lb.confirmPlacement;
	const detachOrRemoveSubLabels = {
		withChildren: lb.detachOrRemoveWithChildren ?? "With children",
		withoutChildren: lb.detachOrRemoveWithoutChildren ?? "Without children",
	};
	const detachMenuLabel = lb.detach ?? DEFAULT_LABELS.detach;
	const removeMenuLabel = lb.remove ?? DEFAULT_LABELS.remove;
	const autoLayoutGroupLabels = {
		stack: lb.autoLayoutGroupLabels?.stack ?? "Stack",
		rows: lb.autoLayoutGroupLabels?.rows ?? "Rows",
		columns: lb.autoLayoutGroupLabels?.columns ?? "Columns",
	};

	const cc = useMemo(
		() =>
			({
				...DEFAULT_CLASS_NAMES,
				...classNamesIn,
				viewport: cn(DEFAULT_CLASS_NAMES.viewport, classNamesIn.viewport),
			}) as SpatialLayoutEditorResolvedClassNames<TNode>,
		[classNamesIn],
	);

	const buildHostContextMenuSlices = useCallback(
		(node: TNode, includeLayout: boolean): ReactNode => {
			const slices = renderNodeContextActions?.(node);
			if (!slices) return null;
			const layout = includeLayout ? slices.layout : null;
			const other = slices.other ?? null;
			if (!layout && !other) return null;
			return (
				<>
					{layout}
					{layout && other ? <ContextMenuSeparator /> : null}
					{other}
				</>
			);
		},
		[renderNodeContextActions],
	);

	// Refs: viewport element, duplicate-draft id sequence, resolved layout-history API (see `.current` writes below).
	const viewportRef = useRef<HTMLDivElement | null>(null);
	const duplicateDraftSeqRef = useRef(0);
	const createManyDraftSeqRef = useRef(0);
	const layoutHistoryResolvedRef = useRef<SpatialLayoutHistoryApi | undefined>(undefined);

	// Pointer-driven interaction and pan/zoom viewport.
	const [interaction, setInteraction] = useState<Interaction | null>(null);
	const [layoutInteractionLocked, setLayoutInteractionLocked] = useState(true);
	const [gridDisplayVisible, setGridDisplayVisible] = useState(true);
	const [viewport, setViewport] = useState(() => ({
		...DEFAULT_INITIAL_VIEWPORT,
		...initialViewportPartial,
	}));

	// Local geometry during drag/resize (uncommitted until persist).
	const [drafts, setDrafts] = useState<Record<string, DraftRect>>({});
	const [rootDraft, setRootDraft] = useState<{ width: number; height: number } | null>(null);

	// Drop targets, invalid placement, and overlap feedback while moving nodes.
	const [dropTargetFrameId, setDropTargetFrameId] = useState<string | null>(null);
	const [invalidDragObject, setInvalidDragObject] = useState<string | null>(null);
	const [collisionTargetKeys, setCollisionTargetKeys] = useState<string[]>([]);
	const [activeHighlightNodeId, setActiveHighlightNodeId] = useState<string | null>(null);

	// Which node owns the open context menu (at most one).
	const [activeContextTarget, setActiveContextTarget] = useState<string | null>(null);

	// Placement flows: staged create, duplicate, and create-many (form + draft nodes).
	const [createPlacement, setCreatePlacement] = useState<{
		optionId: string;
		parentId: string;
		node: TNode;
	} | null>(null);
	const [duplicatePlacement, setDuplicatePlacement] = useState<{
		source: TNode;
		node: TNode;
	} | null>(null);
	const [createManyForm, setCreateManyForm] = useState<{
		quantity: number;
		layoutMode: AutoLayoutMode;
		optionId: string;
	}>({ quantity: 3, layoutMode: "row-top", optionId: "" });
	const [createManyPlacement, setCreateManyPlacement] = useState<{
		parentId: string;
		optionId: string;
		nodes: TNode[];
	} | null>(null);

	// Stitched placement (create / duplicate / external candidate) plus node list used for hit-testing and persist.
	const activePlacement = useMemo(() => {
		if (createPlacement) {
			return {
				kind: "create" as const,
				node: createPlacement.node,
				optionId: createPlacement.optionId,
				parentId: createPlacement.parentId,
			};
		}
		if (duplicatePlacement) {
			return {
				kind: "duplicate" as const,
				node: duplicatePlacement.node,
				source: duplicatePlacement.source,
			};
		}
		if (placementCandidate) return { kind: "external" as const, node: placementCandidate.node };
		return null;
	}, [createPlacement, duplicatePlacement, placementCandidate]);

	const placementCompanionDraftNodes =
		placementCandidate?.companionDraftNodes !== undefined && placementCandidate.companionDraftNodes.length > 0
			? placementCandidate.companionDraftNodes
			: null;

	const placementCompanionIds = useMemo(
		() => new Set((placementCompanionDraftNodes ?? []).map((n) => String(n.id))),
		[placementCompanionDraftNodes],
	);

	// Committed nodes plus any staged placement drafts (single or create-many) for geometry and hit-testing.
	const effectiveNodes = useMemo(() => {
		const append: TNode[] = [];
		if (activePlacement) {
			append.push(activePlacement.node);
			if (activePlacement.kind === "external" && placementCompanionDraftNodes) {
				append.push(...placementCompanionDraftNodes);
			}
		}
		if (createManyPlacement) append.push(...createManyPlacement.nodes);
		return append.length > 0 ? [...nodes, ...append] : nodes;
	}, [activePlacement, createManyPlacement, nodes, placementCompanionDraftNodes]);

	// Staged placement: id of the draft node (if any) and whether destructive UI should defer to layouts.
	const placementNodeId = activePlacement ? String(activePlacement.node.id) : null;
	const placementBlocked = activePlacement !== null || createManyPlacement !== null;
	/** Locked toolbar + no active placement: node move/resize disabled (placement flows stay draggable). */
	const geometryEditFrozen = layoutInteractionLocked && !placementBlocked;

	// Lookups and derived lists over `effectiveNodes` (frames vs leaves, id maps, drag sets, grid background).
	const createManyIds = useMemo(
		() => (createManyPlacement ? new Set(createManyPlacement.nodes.map((n) => String(n.id))) : new Set<string>()),
		[createManyPlacement],
	);
	const createManyTemplateNodeId = useMemo(
		() => (createManyPlacement?.nodes[0] ? String(createManyPlacement.nodes[0].id) : null),
		[createManyPlacement],
	);
	const primaryTourNodeId = useMemo(
		() => (effectiveNodes.length > 0 ? String(effectiveNodes[0]?.id ?? "") : null),
		[effectiveNodes],
	);
	const frameNodes = useMemo(() => effectiveNodes.filter((n) => n.acceptsChildren), [effectiveNodes]);
	const localNodes = useMemo(() => effectiveNodes.filter((n) => !n.acceptsChildren), [effectiveNodes]);
	const nodeById = useMemo(
		() => new Map([root, ...effectiveNodes].map((node) => [String(node.id), node] as const)),
		[effectiveNodes, root],
	);
	const localNodesById = useMemo(() => new Map(localNodes.map((p) => [String(p.id), p] as const)), [localNodes]);
	const collisionTargetKeySet = useMemo(() => new Set(collisionTargetKeys), [collisionTargetKeys]);

	useEffect(() => {
		if (!highlightNodeId) {
			setActiveHighlightNodeId(null);
			return;
		}
		setActiveHighlightNodeId(String(highlightNodeId));
		const timeout = window.setTimeout(
			() => {
				setActiveHighlightNodeId((current) => (current === String(highlightNodeId) ? null : current));
			},
			Math.max(200, highlightDurationMs),
		);
		return () => window.clearTimeout(timeout);
	}, [highlightDurationMs, highlightNodeId]);

	const viewportWorldGridBackground = useMemo(
		() => getViewportWorldGridBackgroundProps(viewport, gridStep),
		[gridStep, viewport],
	);

	// Stable geometry/node helpers (used by persist handlers and layout math).
	const applyNodePatch = useCallback(
		(current: TNode, patch: SpatialLayoutNodePatch): TNode => {
			if (mapNodePatch) return mapNodePatch(current, patch);
			return {
				...current,
				parentId: patch.parentId,
				geometry: patch.geometry,
			};
		},
		[mapNodePatch],
	);

	const toGeometry = useCallback(
		(input: { x: number; y: number; width: number; height: number }): SpatialGeometry => ({
			x: input.x,
			y: input.y,
			width: input.width,
			height: input.height,
		}),
		[],
	);

	const snapToGrid = useCallback((value: number) => snap(value, gridStep), [gridStep]);

	const toNodeSnapshot = useCallback((node: TNode): SpatialLayoutNodeSnapshot => {
		const maybeRef = (node as unknown as { ref?: { entity: "location" | "plant"; entityId: string } }).ref;
		return {
			id: String(node.id),
			parentId: node.parentId !== null ? String(node.parentId) : null,
			geometry: {
				x: node.geometry.x,
				y: node.geometry.y,
				width: node.geometry.width,
				height: node.geometry.height,
			},
			acceptsChildren: node.acceptsChildren,
			nodeType: node.nodeType,
			label: node.label,
			spatialRef: maybeRef ? { entity: maybeRef.entity, entityId: maybeRef.entityId } : undefined,
		};
	}, []);

	const nodeSnapshotsEqual = useCallback(
		(a: SpatialLayoutNodeSnapshot, b: SpatialLayoutNodeSnapshot): boolean =>
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
			a.geometry.height === b.geometry.height,
		[],
	);

	// Refs mirroring latest graph + callbacks for async history apply (`applyHistoryOperations`) and late reads in callbacks.
	const nodeByIdRef = useRef(nodeById);
	nodeByIdRef.current = nodeById;
	const rootRef = useRef(root);
	rootRef.current = root;
	const applyNodePatchRef = useRef(applyNodePatch);
	applyNodePatchRef.current = applyNodePatch;
	const onApplyOperationsRef = useRef(onApplyOperations);
	onApplyOperationsRef.current = onApplyOperations;

	// Built-in localStorage undo/redo: revision bumps after apply so callers can coerce UI; optional external `layoutHistory` overrides.
	const [internalLayoutDataRevision, setInternalLayoutDataRevision] = useState(0);
	const useBuiltinHistory = Boolean(history.enabled && layoutHistoryStorageKey && !layoutHistory);

	// Latest builtin-history flag for `applyHistoryOperations` (callback keeps `[]` deps).
	const useBuiltinHistoryRef = useRef(useBuiltinHistory);
	useBuiltinHistoryRef.current = useBuiltinHistory;

	// Undo/redo: apply operation batches through host adapter, optionally bump builtin revision.
	const applyHistoryOperations = useCallback(
		async (operations: readonly SpatialLayoutOperation<SpatialLayoutNode>[]) => {
			await (onApplyOperationsRef.current?.({
				operations: operations as SpatialLayoutOperation<TNode>[],
			}) ?? Promise.resolve());
			if (useBuiltinHistoryRef.current) {
				setInternalLayoutDataRevision((n) => n + 1);
			}
		},
		[],
	);

	// Builtin stack: `useSpatialLayoutHistory` persists entries; disabled when host passes `layoutHistory` or turns history off.
	const internalLayoutHistory = useSpatialLayoutHistory({
		storageKey: layoutHistoryStorageKey ?? "",
		applyOperations: applyHistoryOperations,
		maxEntries: layoutHistoryMaxEntries,
		enabled: useBuiltinHistory,
	});

	// Prefer external `layoutHistory`; otherwise use builtin when enabled.
	const layoutHistoryResolved = layoutHistory ?? (useBuiltinHistory ? internalLayoutHistory : undefined);
	layoutHistoryResolvedRef.current = layoutHistoryResolved;

	// Effective data revision: builtin path tracks apply generation; external path uses host `layoutDataRevision`.
	const layoutDataRevisionEffective = useBuiltinHistory ? internalLayoutDataRevision : layoutDataRevision;

	// Hosted placement candidate: wrap `onConfirm` so geometry commits can record a history entry when configured.
	const resolvedPlacementCandidate = useMemo(() => {
		if (!placementCandidate) return null;
		const history = layoutHistoryResolved;
		if (!history) return placementCandidate;
		return {
			...placementCandidate,
			onConfirm: async (node: TNode) => {
				const id = String(node.id);
				const beforeNode = nodeById.get(id);
				const beforeSnap = beforeNode ? toNodeSnapshot(beforeNode) : null;
				await placementCandidate.onConfirm(node);
				if (!beforeSnap) return;
				const afterSnap = toNodeSnapshot(node);
				if (!nodeSnapshotsEqual(beforeSnap, afterSnap)) {
					history.commit([
						{
							type: "updateNode",
							id,
							before: beforeSnap,
							after: afterSnap,
						},
					]);
				}
			},
		};
	}, [placementCandidate, layoutHistoryResolved, nodeById, toNodeSnapshot, nodeSnapshotsEqual]);

	// When testing placement overlap, skip ancestor frames of the placement parent (descendants still collide).
	const isPlacementParentFrameOrAncestor = useCallback(
		(obstacleFrameId: string, placementParentFrameId: string): boolean => {
			let cur: string | null = placementParentFrameId;
			while (cur !== null) {
				if (cur === obstacleFrameId) return true;
				const n = nodeById.get(cur);
				if (!n) break;
				cur = n.parentId != null ? String(n.parentId) : null;
			}
			return false;
		},
		[nodeById],
	);

	const reflowCreateManyNodes = useCallback(
		(parent: TNode, nodesToLayout: readonly TNode[], layoutMode: AutoLayoutMode): TNode[] => {
			if (nodesToLayout.length === 0) return [];
			const parentId = String(parent.id);
			const dims = nodesToLayout.map((n) => ({
				width: Math.max(minSize, n.geometry.width),
				height: Math.max(minSize, n.geometry.height),
			}));
			const geoms = planGeometriesInParentFrame(parent.geometry, dims, layoutMode, gridStep, minSize);
			return nodesToLayout.map((n, i) =>
				applyNodePatch(n, {
					parentId,
					geometry: {
						...(geoms[i] ?? n.geometry),
						width: dims[i]?.width ?? n.geometry.width,
						height: dims[i]?.height ?? n.geometry.height,
					},
				}),
			);
		},
		[applyNodePatch, gridStep, minSize],
	);

	// Create-many drafts: first node is the template; quantity/layout changes reflow while preserving ids/sizes.
	const buildManyDraftNodes = useCallback(
		(
			parent: TNode,
			form: { quantity: number; layoutMode: AutoLayoutMode; optionId: string },
			previousPlacement?: { optionId: string; nodes: TNode[] } | null,
		): TNode[] => {
			const { quantity, layoutMode, optionId } = form;
			const options = getCreateOptions?.(parent) ?? [];
			const option = options.find((o) => o.id === optionId) ?? options[0];
			if (!option || quantity < 1 || quantity > 99) return [];
			const parentId = String(parent.id);

			const optionChanged = previousPlacement != null && previousPlacement.optionId !== String(option.id);
			let nextNodes: TNode[] = optionChanged
				? []
				: (previousPlacement?.nodes ?? []).map((n) => applyNodePatch(n, { parentId, geometry: n.geometry }));
			nextNodes = nextNodes.slice(0, quantity);

			if (nextNodes.length === 0) {
				const existingDraftIds = new Set((previousPlacement?.nodes ?? []).map((n) => String(n.id)));
				const siblingLabels = effectiveNodes
					.filter((n) => {
						if ((n.parentId ? String(n.parentId) : String(root.id)) !== parentId) return false;
						return !existingDraftIds.has(String(n.id));
					})
					.map((n) => n.label);
				const stem = duplicateNumberingStem(option.label);
				const firstLabel = allocateNumberedLabelsForNewSiblings(stem, siblingLabels, 1)[0] ?? `${stem} #1`;
				const base = option.createNode(parent);
				nextNodes.push({
					...base,
					id: `pending-many-${option.id}-${++createManyDraftSeqRef.current}`,
					parentId,
					label: firstLabel,
					geometry: {
						...base.geometry,
						width: Math.max(minSize, base.geometry.width),
						height: Math.max(minSize, base.geometry.height),
					},
				});
			}

			const template = nextNodes[0];
			const templateWidth = Math.max(minSize, template.geometry.width);
			const templateHeight = Math.max(minSize, template.geometry.height);
			nextNodes[0] = applyNodePatch(template, {
				parentId,
				geometry: {
					...template.geometry,
					width: templateWidth,
					height: templateHeight,
				},
			});

			if (nextNodes.length < quantity) {
				const existingDraftIds = new Set((previousPlacement?.nodes ?? []).map((n) => String(n.id)));
				const siblingLabels = effectiveNodes
					.filter((n) => {
						if ((n.parentId ? String(n.parentId) : String(root.id)) !== parentId) return false;
						return !existingDraftIds.has(String(n.id));
					})
					.map((n) => n.label);
				const usedLabels = [...siblingLabels, ...nextNodes.map((n) => n.label)];
				const stem = duplicateNumberingStem(option.label);
				const needed = quantity - nextNodes.length;
				const appendedLabels = allocateNumberedLabelsForNewSiblings(stem, usedLabels, needed);
				for (let i = 0; i < needed; i++) {
					const base = option.createNode(parent);
					nextNodes.push({
						...base,
						id: `pending-many-${option.id}-${++createManyDraftSeqRef.current}`,
						parentId,
						label: appendedLabels[i] ?? `${stem} #${nextNodes.length + 1}`,
						geometry: {
							...base.geometry,
							width: templateWidth,
							height: templateHeight,
						},
					});
				}
			}

			return reflowCreateManyNodes(parent, nextNodes.slice(0, quantity), layoutMode);
		},
		[applyNodePatch, effectiveNodes, getCreateOptions, minSize, reflowCreateManyNodes, root],
	);

	// Persist geometry: apply operation(s) through host adapter, merge into staged placements, then record undo when history is wired.
	function handlePersistNode(
		input: {
			id: string;
			parentId: string | null;
			geometry: {
				x: number;
				y: number;
				width: number;
				height: number;
			};
		},
		meta: { kind: "move-node" | "resize-node" | "resize-root" | "auto-layout" },
		options?: { recordHistory?: boolean; draftIdsToClear?: string[] },
	): Promise<unknown> {
		const existingNode = nodeById.get(input.id);
		if (!existingNode) return Promise.resolve();
		const newNode = applyNodePatch(existingNode, {
			parentId: input.parentId,
			geometry: toGeometry(input.geometry),
		});
		if (placementNodeId && input.id === placementNodeId) {
			if (activePlacement?.kind === "create") {
				setCreatePlacement((prev) => (prev ? { ...prev, node: newNode } : prev));
			} else if (activePlacement?.kind === "duplicate") {
				setDuplicatePlacement((prev) => (prev ? { ...prev, node: newNode } : prev));
			} else {
				placementCandidate?.onChange(newNode);
			}
			return Promise.resolve();
		}
		if (createManyPlacement && createManyIds.has(String(input.id))) {
			setCreateManyPlacement((prev) => {
				if (!prev) return prev;
				const targetId = String(input.id);
				const nextNodes = prev.nodes.map((n) => (String(n.id) === targetId ? newNode : n));
				if (nextNodes.length === 0) return prev;
				if (String(nextNodes[0]?.id) !== targetId) {
					return { ...prev, nodes: nextNodes };
				}
				const templateBefore = prev.nodes[0];
				const templateAfter = nextNodes[0];
				if (!templateBefore || !templateAfter) return { ...prev, nodes: nextNodes };
				const templateSizeChanged =
					templateBefore.geometry.width !== templateAfter.geometry.width ||
					templateBefore.geometry.height !== templateAfter.geometry.height;
				if (!templateSizeChanged) return { ...prev, nodes: nextNodes };
				const synced = nextNodes.map((n, index) =>
					index === 0
						? n
						: applyNodePatch(n, {
								parentId: n.parentId,
								geometry: {
									...n.geometry,
									width: templateAfter.geometry.width,
									height: templateAfter.geometry.height,
								},
							}),
				);
				const parent = nodeById.get(prev.parentId);
				if (!parent) return { ...prev, nodes: synced };
				return {
					...prev,
					nodes: reflowCreateManyNodes(parent, synced, createManyForm.layoutMode),
				};
			});
			const toClear = options?.draftIdsToClear ?? [];
			if (toClear.length > 0) {
				const drop = new Set(toClear);
				setDrafts((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => !drop.has(key))));
			}
			return Promise.resolve();
		}
		const recordHistory = Boolean(layoutHistoryResolvedRef.current) && options?.recordHistory !== false;
		const toClear = options?.draftIdsToClear ?? [String(input.id)];
		const before = toNodeSnapshot(existingNode);
		const after = toNodeSnapshot(newNode);
		const op = {
			type: "updateNode",
			id: String(input.id),
			before,
			after,
			kind: meta.kind,
		} satisfies SpatialLayoutOperation<TNode>;

		const persistPromise = onApplyOperations({ operations: [op] });
		return Promise.resolve(persistPromise).then(() => {
			if (toClear.length > 0) {
				const drop = new Set(toClear);
				setDrafts((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => !drop.has(key))));
			}
			const history = layoutHistoryResolvedRef.current;
			if (!recordHistory || !history) return;
			if (!nodeSnapshotsEqual(before, after)) history.commit([op]);
		});
	}

	function handleDeleteNodeWithChildren(id: string, mode: "detach" | "remove"): Promise<unknown> {
		if (placementNodeId && id === placementNodeId) {
			if (activePlacement?.kind === "create") setCreatePlacement(null);
			else if (activePlacement?.kind === "duplicate") setDuplicatePlacement(null);
			else placementCandidate?.onCancel();
			return Promise.resolve();
		}
		const existingNode = nodeById.get(id);
		if (!existingNode) return Promise.resolve();

		const rootSnap = toNodeSnapshot(existingNode as TNode);
		const preserveSubtreeAsUnplacedLocation =
			mode === "detach" && existingNode.acceptsChildren && rootSnap.spatialRef?.entity === "location";

		if (preserveSubtreeAsUnplacedLocation) {
			const world = getNodeCanvasRect(existingNode as TNode);
			const before = rootSnap;
			const after = {
				...before,
				parentId: null,
				geometry: {
					x: snapToGrid(world.x),
					y: snapToGrid(world.y),
					width: world.width,
					height: world.height,
				},
			};
			const op = {
				type: "reparentNode",
				id: String(id),
				before,
				after,
			} satisfies SpatialLayoutOperation<TNode>;
			const persistPromise = onApplyOperations({ operations: [op] });
			return Promise.resolve(persistPromise).then(() => {
				clearDraftById(String(id));
				const history = layoutHistoryResolvedRef.current;
				if (!history) return;
				history.commit([{ type: "batch", ops: [op] }]);
			});
		}

		const byParentId = new Map<string, TNode[]>();
		for (const n of effectiveNodes) {
			const key = n.parentId ? String(n.parentId) : String(root.id);
			const list = byParentId.get(key);
			if (list) list.push(n);
			else byParentId.set(key, [n]);
		}

		const postOrder: TNode[] = [];
		const walk = (node: TNode) => {
			const children = byParentId.get(String(node.id)) ?? [];
			for (const child of children) walk(child as TNode);
			postOrder.push(node);
		};
		walk(existingNode as TNode);

		const ops = postOrder.map(
			(node) =>
				({
					type: "deleteNode",
					id: String(node.id),
					before: toNodeSnapshot(node),
				}) satisfies SpatialLayoutOperation<TNode>,
		);

		if (ops.length === 0) return Promise.resolve();
		const persistPromise = onApplyOperations({ operations: ops });
		return Promise.resolve(persistPromise).then(() => {
			for (const op of ops) clearDraftById(String(op.id));
			const history = layoutHistoryResolvedRef.current;
			if (!history) return;
			history.commit([{ type: "batch", ops }]);
		});
	}

	function handleDeleteNodeWithoutChildren(id: string, mode: "detach" | "remove"): Promise<unknown> {
		const node = nodeById.get(id);
		if (!node) return Promise.resolve();
		const targetParentId = node.parentId ? String(node.parentId) : null;
		const directChildren = effectiveNodes.filter((n) => String(n.parentId) === String(node.id));
		const targetParentPos = targetParentId ? getWorldPositionForFrame(String(targetParentId)) : { x: 0, y: 0 };
		const nodeWorld = getNodeCanvasRect(node);

		const childOps = directChildren.map((child) => {
			const before = toNodeSnapshot(child);
			const childWorld = getNodeCanvasRect(child);
			const nextGeometry = {
				x: snapToGrid(childWorld.x - targetParentPos.x),
				y: snapToGrid(childWorld.y - targetParentPos.y),
				width: child.geometry.width,
				height: child.geometry.height,
			};
			const after = toNodeSnapshot(
				applyNodePatch(child, {
					parentId: targetParentId,
					geometry: nextGeometry,
				}),
			);
			return {
				type: "reparentNode",
				id: String(child.id),
				before,
				after,
			} satisfies SpatialLayoutOperation<TNode>;
		});

		const snap = toNodeSnapshot(node);
		const detachBoundToRoot =
			mode === "detach" && (snap.spatialRef?.entity === "location" || snap.spatialRef?.entity === "plant");

		const finalOp = detachBoundToRoot
			? ({
					type: "reparentNode",
					id: String(node.id),
					before: snap,
					after: {
						...snap,
						parentId: null,
						geometry: {
							x: snapToGrid(nodeWorld.x),
							y: snapToGrid(nodeWorld.y),
							width: nodeWorld.width,
							height: nodeWorld.height,
						},
					},
				} satisfies SpatialLayoutOperation<TNode>)
			: ({
					type: "deleteNode",
					id: String(node.id),
					before: toNodeSnapshot(
						applyNodePatch(node, {
							parentId: node.parentId,
							geometry: node.acceptsChildren
								? node.geometry
								: {
										x: snapToGrid(nodeWorld.x - targetParentPos.x),
										y: snapToGrid(nodeWorld.y - targetParentPos.y),
										width: node.geometry.width,
										height: node.geometry.height,
									},
						}),
					),
				} satisfies SpatialLayoutOperation<TNode>);

		const ops = [...childOps, finalOp];
		const persistPromise = onApplyOperations({ operations: ops });
		return Promise.resolve(persistPromise).then(() => {
			clearDraftById(String(id));
			const history = layoutHistoryResolvedRef.current;
			if (!history) return;
			history.commit([{ type: "batch", ops }]);
		});
	}

	// Effects: subscriptions and syncing external/data revisions into local UI state.
	// Clear transient drafts when authoritative layout data changes (host revision or builtin-apply bump).
	useEffect(() => {
		if (layoutDataRevisionEffective === 0) return;
		startTransition(() => {
			setDrafts({});
			setRootDraft(null);
		});
	}, [layoutDataRevisionEffective]);

	// Wheel zoom/scroll on the viewport (non-passive so we can `preventDefault`).
	useEffect(() => {
		const viewportEl = viewportRef.current;
		if (!viewportEl) return;
		const onWheel = (event: WheelEvent) => {
			event.preventDefault();
			const rect = viewportEl.getBoundingClientRect();
			setViewport((prev) => {
				const worldBeforeX = (event.clientX - rect.left - prev.x) / prev.scale;
				const worldBeforeY = (event.clientY - rect.top - prev.y) / prev.scale;
				const nextScale = Math.min(3, Math.max(0.4, prev.scale * (event.deltaY > 0 ? 0.9 : 1.1)));
				const nextX = event.clientX - rect.left - worldBeforeX * nextScale;
				const nextY = event.clientY - rect.top - worldBeforeY * nextScale;
				return { x: nextX, y: nextY, scale: nextScale };
			});
		};
		viewportEl.addEventListener("wheel", onWheel, { passive: false });
		return () => viewportEl.removeEventListener("wheel", onWheel);
	}, []);

	// Global undo/redo shortcuts when a history API is available.
	useEffect(() => {
		if (!layoutHistoryResolved) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (geometryEditFrozen) return;
			const target = event.target;
			if (
				target instanceof HTMLInputElement ||
				target instanceof HTMLTextAreaElement ||
				target instanceof HTMLSelectElement
			) {
				return;
			}
			const mod = event.ctrlKey || event.metaKey;
			const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
			if (mod && key === "z") {
				event.preventDefault();
				if (event.shiftKey) void layoutHistoryResolved.redo();
				else void layoutHistoryResolved.undo();
			} else if (mod && key === "y") {
				event.preventDefault();
				void layoutHistoryResolved.redo();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [layoutHistoryResolved, geometryEditFrozen]);

	// Drop optimistic root resize overlay once committed geometry matches the server/root prop.
	useEffect(() => {
		if (!rootDraft) return;
		if (root.geometry.width !== rootDraft.width || root.geometry.height !== rootDraft.height) return;
		const timeoutId = window.setTimeout(() => setRootDraft(null), 0);
		return () => window.clearTimeout(timeoutId);
	}, [root, rootDraft]);

	// Re-pack create-many draft rectangles when quantity/layout/option/parent change (not on every node edit).
	// biome-ignore lint/correctness/useExhaustiveDependencies(createManyPlacement): narrow deps only; full placement retriggers while drafts update.
	// biome-ignore lint/correctness/useExhaustiveDependencies(createManyForm): narrow deps only; full form retriggers while drafts update.
	// biome-ignore lint/correctness/useExhaustiveDependencies(nodeById.get): read via closure; nodeById changes with every layout edit.
	// biome-ignore lint/correctness/useExhaustiveDependencies(buildManyDraftNodes): stable enough for this trigger pattern; listing it is redundant noise.
	// biome-ignore lint/correctness/useExhaustiveDependencies(createManyPlacement?.parentId): intentional parentId key vs whole placement object.
	// biome-ignore lint/correctness/useExhaustiveDependencies(createManyForm.optionId): intentional optionId key vs whole form object.
	useEffect(() => {
		if (!createManyPlacement) return;
		const parent = nodeById.get(createManyPlacement.parentId);
		if (!parent) return;
		const built = buildManyDraftNodes(parent, createManyForm, createManyPlacement);
		if (built.length === 0) return;
		startTransition(() => {
			setCreateManyPlacement((prev) => {
				if (!prev) return prev;
				if (prev.parentId !== String(parent.id)) return prev;
				return { ...prev, optionId: createManyForm.optionId, nodes: built };
			});
		});
	}, [createManyForm.quantity, createManyForm.layoutMode, createManyForm.optionId, createManyPlacement?.parentId]);

	// Root identifiers (string vs raw id) for context targets and tree utilities.
	const rootId = String(root.id);
	const rootFrameId = root.id;

	// Context-menu addressing and per-node/root visual flags (borders, drop highlight, menu active).
	const toContextTarget = useCallback((id: string): string => `node:${id}`, []);

	// Direct child counts per frame (drives auto-layout submenu visibility).
	const childCountByParentId = useMemo(() => {
		const m = new Map<string, number>();
		for (const n of effectiveNodes) {
			if (n.parentId != null) {
				const key = String(n.parentId);
				m.set(key, (m.get(key) ?? 0) + 1);
			}
		}
		return m;
	}, [effectiveNodes]);

	// Ensure only one context menu branch is "active" for styling.
	const setContextMenuOpenState = useCallback((target: string, open: boolean): void => {
		setActiveContextTarget((prev) => {
			if (open) return target;
			return prev === target ? null : prev;
		});
	}, []);

	// Root dashed shell vs node frame (`nodeShell` includes stateful border on one element).
	const rootVisualState = useMemo(
		(): SpatialLayoutRootVisualState => ({
			contextActive: activeContextTarget === toContextTarget(rootId),
			dropTarget: dropTargetFrameId === rootId,
		}),
		[activeContextTarget, dropTargetFrameId, rootId, toContextTarget],
	);

	const getNodeVisualState = useCallback(
		(node: TNode): SpatialLayoutNodeVisualState => ({
			invalidDrag: invalidDragObject === `node:${node.id}`,
			collisionTarget: collisionTargetKeySet.has(`node:${node.id}`),
			contextActive: activeContextTarget === `node:${node.id}`,
			dropTarget: node.acceptsChildren && dropTargetFrameId === String(node.id),
		}),
		[activeContextTarget, collisionTargetKeySet, dropTargetFrameId, invalidDragObject],
	);

	// World / canvas rectangles: committed layout plus optional draft overlay per node.
	function getWorldPositionForFrame(frameId: string): { x: number; y: number } {
		return computeFramePosition(frameId, nodeById, root.id);
	}

	function getFrameDepthFor(frameId: string): number {
		return computeFrameDepth(frameId, nodeById, root.id);
	}

	function getFrameNodeRect(node: TNode): DraftRect {
		const draft = activeDrafts[String(node.id)];
		if (draft) return draft;
		const pos = getWorldPositionForFrame(String(node.id));
		return {
			x: pos.x,
			y: pos.y,
			width: node.geometry.width,
			height: node.geometry.height,
		};
	}

	function getLocalNodeRect(node: TNode): DraftRect {
		const draft = activeDrafts[String(node.id)];
		if (draft) return draft;
		const parentPos = node.parentId ? getWorldPositionForFrame(String(node.parentId)) : { x: 0, y: 0 };
		return {
			x: parentPos.x + node.geometry.x,
			y: parentPos.y + node.geometry.y,
			width: node.geometry.width,
			height: node.geometry.height,
		};
	}

	function getNodeCanvasRect(node: TNode): DraftRect {
		return node.acceptsChildren ? getFrameNodeRect(node) : getLocalNodeRect(node);
	}

	function getCommittedNodeCanvasRect(node: TNode): DraftRect {
		if (node.acceptsChildren) {
			const pos = computeFramePosition(String(node.id), nodeById, root.id);
			return {
				x: pos.x,
				y: pos.y,
				width: node.geometry.width,
				height: node.geometry.height,
			};
		}
		const parentPos = node.parentId
			? computeFramePosition(String(node.parentId), nodeById, root.id)
			: { x: 0, y: 0 };
		return {
			x: parentPos.x + node.geometry.x,
			y: parentPos.y + node.geometry.y,
			width: node.geometry.width,
			height: node.geometry.height,
		};
	}

	// Draft entries that still differ from committed geometry (drops stale keys automatically).
	const activeDrafts = (() => {
		const next: Record<string, DraftRect> = {};
		for (const [id, draft] of Object.entries(drafts)) {
			const node = nodeById.get(id);
			if (!node) {
				next[id] = draft;
				continue;
			}
			const committed = getCommittedNodeCanvasRect(node);
			const matches =
				committed.x === draft.x &&
				committed.y === draft.y &&
				committed.width === draft.width &&
				committed.height === draft.height;
			if (!matches) next[id] = draft;
		}
		return next;
	})();

	// Parent bounds from children, containment checks, and small draft-map helpers.
	function getMinimumFrameSizeForDirectChildren(parentFrameId: string): {
		minWidth: number;
		minHeight: number;
	} {
		const parent = nodeById.get(parentFrameId);
		if (!parent) return { minWidth: minSize, minHeight: minSize };
		const parentRect = getFrameNodeRect(parent as TNode);
		let minWidth = minSize;
		let minHeight = minSize;

		for (const child of effectiveNodes) {
			if (String(child.parentId) !== parentFrameId) continue;
			const childRect = getNodeCanvasRect(child);
			const localX = childRect.x - parentRect.x;
			const localY = childRect.y - parentRect.y;
			minWidth = Math.max(minWidth, snapToGrid(localX + childRect.width));
			minHeight = Math.max(minHeight, snapToGrid(localY + childRect.height));
		}

		return { minWidth, minHeight };
	}

	function isWithinParentFrame(rect: DraftRect, parentFrameId: string | null | undefined, selfId?: string): boolean {
		if (!parentFrameId) return isWithinRootBounds(rect);
		if (parentFrameId === String(root.id)) return isWithinRootBounds(rect);
		const parentFrame = nodeById.get(parentFrameId);
		if (!parentFrame) return isWithinRootBounds(rect);
		const parentRect = getFrameNodeRect(parentFrame as TNode);
		if (selfId && parentFrameId === selfId) return true;
		return (
			rect.x >= parentRect.x &&
			rect.y >= parentRect.y &&
			rect.x + rect.width <= parentRect.x + parentRect.width &&
			rect.y + rect.height <= parentRect.y + parentRect.height
		);
	}

	function clearSubtreeDraftsByIds(frameIds: string[], localIds: string[]): void {
		const drop = new Set([...frameIds, ...localIds]);
		setDrafts((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => !drop.has(key))));
	}

	function clearDraftById(id: string): void {
		setDrafts((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => key !== id)));
	}

	function restoreDraftRectById(id: string, rect: DraftRect): void {
		setDrafts((prev) => ({ ...prev, [id]: rect }));
	}

	function getOverlapKeysWithOthers(
		candidate: DraftRect,
		selfKey: string,
		options?: { ignoreKeys?: string[] },
	): string[] {
		const ignored = new Set(options?.ignoreKeys ?? []);
		const nodeRects = nodes.map((n) => ({
			key: `node:${String(n.id)}`,
			rect: getNodeCanvasRect(n),
		}));
		const overlaps: string[] = [];
		for (const item of nodeRects) {
			if (item.key === selfKey) continue;
			if (ignored.has(item.key)) continue;
			if (intersectsRect(candidate, item.rect)) overlaps.push(item.key);
		}
		return overlaps;
	}

	// Viewport pan (middle button or touch/pen on empty canvas).
	function startPan(event: ReactPointerEvent<HTMLDivElement>): void {
		event.preventDefault();
		setInteraction({
			kind: "pan",
			startClientX: event.clientX,
			startClientY: event.clientY,
			startViewportX: viewport.x,
			startViewportY: viewport.y,
		});
	}

	function isLeftMouseButton(event: ReactPointerEvent<HTMLDivElement>): boolean {
		return event.pointerType === "mouse" && event.button === 0;
	}

	function isMiddleMouseButton(event: ReactPointerEvent<HTMLDivElement>): boolean {
		return event.pointerType === "mouse" && event.button === 1;
	}

	function isPrimaryManipulationPointer(event: ReactPointerEvent<HTMLDivElement>): boolean {
		return event.pointerType !== "mouse" || isLeftMouseButton(event);
	}

	function handleViewportPointerDownCapture(event: ReactPointerEvent<HTMLDivElement>): void {
		if (!isMiddleMouseButton(event)) return;
		event.stopPropagation();
		startPan(event);
	}

	function handleViewportPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
		if (interaction) return;
		if (isMiddleMouseButton(event)) {
			startPan(event);
			return;
		}
		if (isLeftMouseButton(event)) {
			const target = event.target;
			if (target instanceof Element) {
				const onNodeShell = target.closest('[data-layout-node-shell="true"]') !== null;
				const onRootResizeHandle = target.closest("#layout-editor-root-resize-handle") !== null;
				const onRootSurface = target.closest("#layout-editor-root-surface") !== null;
				const onViewportBackground = target === event.currentTarget;
				if (!onNodeShell && !onRootResizeHandle && (onRootSurface || onViewportBackground)) {
					startPan(event);
					return;
				}
			}
		}
		// Touch/pen users can pan from empty canvas area.
		if (event.pointerType !== "mouse" && event.target === event.currentTarget) {
			startPan(event);
		}
	}

	// Begin move / resize: subtree capture for frames vs single-node moves, plus root resize.
	function startMoveGeometry(
		event: ReactPointerEvent<HTMLDivElement>,
		params: {
			acceptsChildren: boolean;
			id: string;
			x: number;
			y: number;
			width: number;
			height: number;
			parentId: string | null;
		},
	): void {
		if (!isPrimaryManipulationPointer(event)) return;
		event.stopPropagation();
		if (geometryEditFrozen) return;
		if (activePlacement?.kind === "external" && placementCompanionIds.has(params.id)) {
			return;
		}
		if (params.acceptsChildren) {
			const subtreeIdSet = computeSubtreeFrameIds(params.id, frameNodes);
			const subtreeFrameIds = Array.from(subtreeIdSet);
			const subtreeLocalIds = Array.from(computeSubtreeLocalIds(subtreeIdSet, localNodes));
			const subtreeFrameStartRects: Record<string, DraftRect> = {};
			const subtreeLocalStartRects: Record<string, DraftRect> = {};
			let minX = Number.POSITIVE_INFINITY;
			let minY = Number.POSITIVE_INFINITY;
			let maxX = Number.NEGATIVE_INFINITY;
			let maxY = Number.NEGATIVE_INFINITY;

			for (const id of subtreeFrameIds) {
				const subtreeFrame = nodeById.get(id);
				if (!subtreeFrame) continue;
				const rect = getFrameNodeRect(subtreeFrame as TNode);
				subtreeFrameStartRects[id] = rect;
				minX = Math.min(minX, rect.x);
				minY = Math.min(minY, rect.y);
				maxX = Math.max(maxX, rect.x + rect.width);
				maxY = Math.max(maxY, rect.y + rect.height);
			}
			for (const id of subtreeLocalIds) {
				const subtreeLocal = localNodesById.get(id);
				if (!subtreeLocal) continue;
				const rect = getLocalNodeRect(subtreeLocal as TNode);
				subtreeLocalStartRects[id] = rect;
				minX = Math.min(minX, rect.x);
				minY = Math.min(minY, rect.y);
				maxX = Math.max(maxX, rect.x + rect.width);
				maxY = Math.max(maxY, rect.y + rect.height);
			}

			const movingKeys = new Set([
				...subtreeFrameIds.map((id) => `node:${id}`),
				...subtreeLocalIds.map((id) => `node:${id}`),
			]);
			const staticRects = nodes
				.map((item) => ({
					key: `node:${String(item.id)}`,
					rect: getNodeCanvasRect(item),
				}))
				.filter((item) => !movingKeys.has(item.key));

			setInteraction({
				kind: "move-node",
				acceptsChildren: true,
				id: params.id,
				startClientX: event.clientX,
				startClientY: event.clientY,
				startX: params.x,
				startY: params.y,
				width: params.width,
				height: params.height,
				parentId: params.parentId,
				subtreeFrameIds,
				subtreeLocalIds,
				subtreeFrameStartRects,
				subtreeLocalStartRects,
				staticRects,
				subtreeBounds: {
					minX: Number.isFinite(minX) ? minX : params.x,
					minY: Number.isFinite(minY) ? minY : params.y,
					maxX: Number.isFinite(maxX) ? maxX : params.x + params.width,
					maxY: Number.isFinite(maxY) ? maxY : params.y + params.height,
				},
			});
			return;
		}
		setInteraction({
			kind: "move-node",
			acceptsChildren: false,
			id: params.id,
			startClientX: event.clientX,
			startClientY: event.clientY,
			startX: params.x,
			startY: params.y,
			width: params.width,
			height: params.height,
			parentId: params.parentId,
		});
	}

	function startResizeGeometry(
		event: ReactPointerEvent<HTMLDivElement>,
		params: {
			acceptsChildren: boolean;
			id: string;
			x: number;
			y: number;
			width: number;
			height: number;
			parentId: string | null;
		},
	): void {
		if (!isPrimaryManipulationPointer(event)) return;
		event.stopPropagation();
		if (geometryEditFrozen) return;
		if (activePlacement?.kind === "external" && placementCompanionIds.has(params.id)) {
			return;
		}
		setInteraction({
			kind: "resize-node",
			acceptsChildren: params.acceptsChildren,
			id: params.id,
			startClientX: event.clientX,
			startClientY: event.clientY,
			startWidth: params.width,
			startHeight: params.height,
			x: params.x,
			y: params.y,
			parentId: params.parentId,
		});
	}

	function startResizeRoot(event: ReactPointerEvent<HTMLDivElement>): void {
		if (!isPrimaryManipulationPointer(event)) return;
		event.stopPropagation();
		if (geometryEditFrozen) return;
		setInteraction({
			kind: "resize-root",
			startClientX: event.clientX,
			startClientY: event.clientY,
			startWidth: rootDraft?.width ?? root.geometry.width,
			startHeight: rootDraft?.height ?? root.geometry.height,
		});
	}

	// Root bounds and overlap scans over `effectiveNodes` (placement-parent ignores, etc.).
	function isWithinRootBounds(rect: DraftRect): boolean {
		const rootWidth = rootDraft?.width ?? root.geometry.width;
		const rootHeight = rootDraft?.height ?? root.geometry.height;
		return rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= rootWidth && rect.y + rect.height <= rootHeight;
	}

	function hasOverlapWithOthers(
		candidate: DraftRect,
		selfKey: string,
		options?: { ignoreKeys?: string[]; placementParentFrameId?: string },
	): boolean {
		const ignored = new Set(options?.ignoreKeys ?? []);
		const pp = options?.placementParentFrameId;
		for (const n of effectiveNodes) {
			const key = `node:${String(n.id)}`;
			if (key === selfKey) continue;
			if (ignored.has(key)) continue;
			if (pp && n.acceptsChildren && isPlacementParentFrameOrAncestor(String(n.id), pp)) continue;
			if (intersectsRect(candidate, getNodeCanvasRect(n))) return true;
		}
		return false;
	}

	// Whether staged single placement (create/duplicate/external) fits root + parent + non-overlap rules.
	const isCreatePlacementValid = useMemo(() => {
		if (!activePlacement) return false;
		const draft = activePlacement.node;
		const draftId = String(draft.id);
		const draftParentId = draft.parentId ? String(draft.parentId) : String(root.id);
		const draftParentPos =
			draftParentId === String(root.id) ? { x: 0, y: 0 } : computeFramePosition(draftParentId, nodeById, root.id);
		const draftRect = {
			x: draftParentPos.x + draft.geometry.x,
			y: draftParentPos.y + draft.geometry.y,
			width: draft.geometry.width,
			height: draft.geometry.height,
		};
		const rootWidth = rootDraft?.width ?? root.geometry.width;
		const rootHeight = rootDraft?.height ?? root.geometry.height;
		if (
			draftRect.x < 0 ||
			draftRect.y < 0 ||
			draftRect.x + draftRect.width > rootWidth ||
			draftRect.y + draftRect.height > rootHeight
		)
			return false;
		const parentFrame = draftParentId === String(root.id) ? root : nodeById.get(draftParentId);
		if (!parentFrame) return false;
		const parentPos =
			draftParentId === String(root.id) ? { x: 0, y: 0 } : computeFramePosition(draftParentId, nodeById, root.id);
		const parentRect = {
			x: parentPos.x,
			y: parentPos.y,
			width: parentFrame.geometry.width,
			height: parentFrame.geometry.height,
		};
		if (
			draftRect.x < parentRect.x ||
			draftRect.y < parentRect.y ||
			draftRect.x + draftRect.width > parentRect.x + parentRect.width ||
			draftRect.y + draftRect.height > parentRect.y + parentRect.height
		)
			return false;
		for (const node of effectiveNodes) {
			const nodeId = String(node.id);
			if (nodeId === draftId) continue;
			if (placementCompanionIds.has(nodeId)) continue;
			if (node.acceptsChildren && isPlacementParentFrameOrAncestor(nodeId, draftParentId)) continue;
			const nodeParentPos = node.parentId
				? computeFramePosition(String(node.parentId), nodeById, root.id)
				: { x: 0, y: 0 };
			const nodeRect = node.acceptsChildren
				? {
						...computeFramePosition(nodeId, nodeById, root.id),
						width: node.geometry.width,
						height: node.geometry.height,
					}
				: {
						x: nodeParentPos.x + node.geometry.x,
						y: nodeParentPos.y + node.geometry.y,
						width: node.geometry.width,
						height: node.geometry.height,
					};
			if (intersectsRect(draftRect, nodeRect)) return false;
		}
		return true;
	}, [
		activePlacement,
		effectiveNodes,
		nodeById,
		placementCompanionIds,
		root,
		rootDraft,
		isPlacementParentFrameOrAncestor,
	]);

	// Shared rules for committing a draft: inside root + parent frame, no illegal overlaps (optional excludes).
	function isDraftNodeValidForCommit(draft: TNode, excludeIds: ReadonlySet<string>): boolean {
		const draftParentId = draft.parentId ? String(draft.parentId) : String(root.id);
		const draftParentPos =
			draftParentId === String(root.id) ? { x: 0, y: 0 } : computeFramePosition(draftParentId, nodeById, root.id);
		const draftRect = {
			x: draftParentPos.x + draft.geometry.x,
			y: draftParentPos.y + draft.geometry.y,
			width: draft.geometry.width,
			height: draft.geometry.height,
		};
		const rootWidth = rootDraft?.width ?? root.geometry.width;
		const rootHeight = rootDraft?.height ?? root.geometry.height;
		if (
			draftRect.x < 0 ||
			draftRect.y < 0 ||
			draftRect.x + draftRect.width > rootWidth ||
			draftRect.y + draftRect.height > rootHeight
		)
			return false;
		const parentFrame = draftParentId === String(root.id) ? root : nodeById.get(draftParentId);
		if (!parentFrame) return false;
		const parentPos =
			draftParentId === String(root.id) ? { x: 0, y: 0 } : computeFramePosition(draftParentId, nodeById, root.id);
		const parentRect = {
			x: parentPos.x,
			y: parentPos.y,
			width: parentFrame.geometry.width,
			height: parentFrame.geometry.height,
		};
		if (
			draftRect.x < parentRect.x ||
			draftRect.y < parentRect.y ||
			draftRect.x + draftRect.width > parentRect.x + parentRect.width ||
			draftRect.y + draftRect.height > parentRect.y + parentRect.height
		)
			return false;
		for (const node of effectiveNodes) {
			const nodeId = String(node.id);
			if (excludeIds.has(nodeId)) continue;
			if (node.acceptsChildren && isPlacementParentFrameOrAncestor(nodeId, draftParentId)) continue;
			const nodeParentPos = node.parentId
				? computeFramePosition(String(node.parentId), nodeById, root.id)
				: { x: 0, y: 0 };
			const nodeRect = node.acceptsChildren
				? {
						...computeFramePosition(nodeId, nodeById, root.id),
						width: node.geometry.width,
						height: node.geometry.height,
					}
				: {
						x: nodeParentPos.x + node.geometry.x,
						y: nodeParentPos.y + node.geometry.y,
						width: node.geometry.width,
						height: node.geometry.height,
					};
			if (intersectsRect(draftRect, nodeRect)) return false;
		}
		return true;
	}

	// Whether create-many draft geometries still pack inside the parent frame.
	const isCreateManyPackValid = useMemo(() => {
		if (!createManyPlacement || createManyPlacement.nodes.length === 0) return false;
		const parent = nodeById.get(createManyPlacement.parentId);
		if (!parent) return false;
		return localChildGeometriesValidInParent(
			parent.geometry.width,
			parent.geometry.height,
			createManyPlacement.nodes.map((n) => n.geometry),
		);
	}, [createManyPlacement, nodeById]);

	// Create-many confirm: packing fits parent and every draft passes the same commit rules as single placement.
	const isCreateManyPlacementValid =
		createManyPlacement !== null &&
		isCreateManyPackValid &&
		createManyPlacement.nodes.length > 0 &&
		createManyPlacement.nodes.every((draft) => isDraftNodeValidForCommit(draft, new Set([String(draft.id)])));

	// Pick a non-overlapping grid slot inside the parent for new placement defaults.
	function getInitialPlacementNode(candidate: TNode, parent: TNode): TNode {
		const parentRect = getFrameNodeRect(parent);
		const width = candidate.geometry.width;
		const height = candidate.geometry.height;
		const maxX = Math.max(0, parentRect.width - width);
		const maxY = Math.max(0, parentRect.height - height);
		for (let y = 0; y <= maxY; y += gridStep) {
			for (let x = 0; x <= maxX; x += gridStep) {
				const worldRect = {
					x: parentRect.x + x,
					y: parentRect.y + y,
					width,
					height,
				};
				const overlaps = hasOverlapWithOthers(worldRect, `node:${String(candidate.id)}`, {
					placementParentFrameId: String(parent.id),
				});
				if (!overlaps) {
					return applyNodePatch(candidate, {
						parentId: candidate.parentId,
						geometry: { x, y, width, height },
					});
				}
			}
		}
		return candidate;
	}

	// During drag: resolve frame-under-cursor, ancestor ignore keys, and drive drop/collision highlights.
	function setSingleDraft(id: string, rect: DraftRect): void {
		setDrafts((prev) => ({
			...prev,
			[id]: rect,
		}));
	}

	function resolveDropTargetForRect(
		rect: DraftRect,
		options?: { excludeFrameId?: string },
	): {
		targetId: string | null;
		targetIgnoreKeys: string[];
	} {
		const target = findDropTarget(rect, frameNodes, getWorldPositionForFrame, options?.excludeFrameId);
		const targetId = target ? String(target.id) : null;
		return {
			targetId,
			targetIgnoreKeys: computeTargetAncestorIgnoreKeys(targetId, nodeById),
		};
	}

	function applyDragFeedback(args: {
		interactionId: string;
		overlapKeys: string[];
		outOfBounds: boolean;
		targetId: string | null;
		allowRootFallback: boolean;
	}): void {
		const hasOverlap = args.overlapKeys.length > 0;
		setCollisionTargetKeys(args.overlapKeys);
		setInvalidDragObject(hasOverlap || args.outOfBounds ? `node:${args.interactionId}` : null);
		setDropTargetFrameId(args.targetId ?? (args.allowRootFallback && !args.outOfBounds ? String(root.id) : null));
	}

	// Pointer move: update draft rectangles and hit-test feedback for pan / move / resize / root resize.
	function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
		if (!interaction) return;
		if (interaction.kind === "pan") {
			const dx = event.clientX - interaction.startClientX;
			const dy = event.clientY - interaction.startClientY;
			setViewport((prev) => ({
				...prev,
				x: interaction.startViewportX + dx,
				y: interaction.startViewportY + dy,
			}));
			setCollisionTargetKeys([]);
			return;
		}

		const dxWorld = (event.clientX - interaction.startClientX) / viewport.scale;
		const dyWorld = (event.clientY - interaction.startClientY) / viewport.scale;

		if (interaction.kind === "move-node" && interaction.acceptsChildren) {
			const dx = snapToGrid(interaction.startX + dxWorld) - interaction.startX;
			const dy = snapToGrid(interaction.startY + dyWorld) - interaction.startY;
			const nextRect = {
				x: interaction.startX + dx,
				y: interaction.startY + dy,
				width: interaction.width,
				height: interaction.height,
			};
			setDrafts((prev) => {
				const next = { ...prev };
				for (const id of interaction.subtreeFrameIds) {
					const base = interaction.subtreeFrameStartRects[id];
					if (!base) continue;
					next[id] = { ...base, x: base.x + dx, y: base.y + dy };
				}
				for (const id of interaction.subtreeLocalIds) {
					const base = interaction.subtreeLocalStartRects[id];
					if (!base) continue;
					next[id] = { ...base, x: base.x + dx, y: base.y + dy };
				}
				return next;
			});
			const { targetId, targetIgnoreKeys } = resolveDropTargetForRect(nextRect, {
				excludeFrameId: interaction.id,
			});
			const prepared = {
				subtreeFrameIds: interaction.subtreeFrameIds,
				subtreeLocalIds: interaction.subtreeLocalIds,
				subtreeFrameStartRects: interaction.subtreeFrameStartRects,
				subtreeLocalStartRects: interaction.subtreeLocalStartRects,
				staticRects: interaction.staticRects,
			};
			const overlapKeys = getPreparedMoveOverlapKeys(prepared, dx, dy, targetIgnoreKeys);
			const outOfBounds = !isWithinRootBounds(nextRect);
			const hasOverlap = hasPreparedMoveOverlap(prepared, dx, dy, targetIgnoreKeys);
			applyDragFeedback({
				interactionId: interaction.id,
				overlapKeys: hasOverlap ? overlapKeys : overlapKeys,
				outOfBounds,
				targetId,
				allowRootFallback: true,
			});
		} else if (interaction.kind === "move-node" && !interaction.acceptsChildren) {
			const rawRect = {
				x: snapToGrid(interaction.startX + dxWorld),
				y: snapToGrid(interaction.startY + dyWorld),
				width: interaction.width,
				height: interaction.height,
			};
			const nextRect = rawRect;
			setSingleDraft(interaction.id, nextRect);
			const { targetId, targetIgnoreKeys } = resolveDropTargetForRect(nextRect);
			const overlapKeys = getOverlapKeysWithOthers(nextRect, `node:${interaction.id}`, {
				ignoreKeys: targetIgnoreKeys,
			});
			applyDragFeedback({
				interactionId: interaction.id,
				overlapKeys,
				outOfBounds: !isWithinRootBounds(rawRect),
				targetId,
				allowRootFallback: true,
			});
		} else if (interaction.kind === "resize-node" && interaction.acceptsChildren) {
			const minChildSize = getMinimumFrameSizeForDirectChildren(interaction.id);
			const nextRect = {
				x: interaction.x,
				y: interaction.y,
				width: Math.max(minChildSize.minWidth, snapToGrid(interaction.startWidth + dxWorld)),
				height: Math.max(minChildSize.minHeight, snapToGrid(interaction.startHeight + dyWorld)),
			};
			const overlapKeys = getOverlapKeysWithOthers(nextRect, `node:${interaction.id}`, {
				ignoreKeys: [
					...subtreeEntityIgnoreKeys(interaction.id, frameNodes, localNodes),
					...computeAncestorFrameIgnoreKeys(interaction.id, nodeById),
				],
			});
			const overlap = overlapKeys.length > 0;
			setCollisionTargetKeys(overlapKeys);
			const withinParent = isWithinParentFrame(nextRect, interaction.parentId, interaction.id);
			setInvalidDragObject(
				overlap || !isWithinRootBounds(nextRect) || !withinParent ? `node:${interaction.id}` : null,
			);
			setSingleDraft(interaction.id, nextRect);
		} else if (interaction.kind === "resize-node" && !interaction.acceptsChildren) {
			const nextRect = {
				x: interaction.x,
				y: interaction.y,
				width: Math.max(minSize, snapToGrid(interaction.startWidth + dxWorld)),
				height: Math.max(minSize, snapToGrid(interaction.startHeight + dyWorld)),
			};
			const overlapKeys = getOverlapKeysWithOthers(nextRect, `node:${interaction.id}`, {
				ignoreKeys: computeLocalNodeAncestorIgnoreKeys(interaction.id, localNodesById, nodeById),
			});
			const overlap = overlapKeys.length > 0;
			setCollisionTargetKeys(overlapKeys);
			const withinParent = isWithinParentFrame(nextRect, interaction.parentId);
			setInvalidDragObject(
				overlap || !isWithinRootBounds(nextRect) || !withinParent ? `node:${interaction.id}` : null,
			);
			setSingleDraft(interaction.id, nextRect);
		} else if (interaction.kind === "resize-root") {
			setRootDraft({
				width: Math.max(minSize, snapToGrid(interaction.startWidth + dxWorld)),
				height: Math.max(minSize, snapToGrid(interaction.startHeight + dyWorld)),
			});
		}
	}

	// End of gesture: reset drag chrome; `finishInteraction` / `rejectAndEndForNode` persist or restore drafts.
	function resetInteractionIndicators(): void {
		setDropTargetFrameId(null);
		setInvalidDragObject(null);
		setCollisionTargetKeys([]);
	}

	function endInteraction(): void {
		setInteraction(null);
		resetInteractionIndicators();
	}

	useEffect(() => {
		if (!layoutInteractionLocked || placementBlocked) return;
		setInteraction(null);
		setDropTargetFrameId(null);
		setInvalidDragObject(null);
		setCollisionTargetKeys([]);
	}, [layoutInteractionLocked, placementBlocked]);

	function rejectAndEndForNode(interactionId: string, fallbackRect?: DraftRect): void {
		if (fallbackRect) {
			restoreDraftRectById(interactionId, fallbackRect);
		} else {
			clearDraftById(interactionId);
		}
		endInteraction();
	}

	function persistDraftNode(
		args: {
			interactionId: string;
			draft: DraftRect;
			finalParentId: string;
			/** Subtree drag persists draft rects for these ids; clear them all on successful commit. */
			additionalDraftIds?: string[];
		},
		meta: { kind: "move-node" | "resize-node" | "resize-root" | "auto-layout" },
		onReject: () => void,
	): void {
		const finalParentPos =
			args.finalParentId === root.id ? { x: 0, y: 0 } : getWorldPositionForFrame(String(args.finalParentId));
		const draftIdsToClear = [...new Set([args.interactionId, ...(args.additionalDraftIds ?? [])])];
		void handlePersistNode(
			{
				id: args.interactionId,
				parentId: args.finalParentId,
				geometry: {
					x: snapToGrid(args.draft.x - finalParentPos.x),
					y: snapToGrid(args.draft.y - finalParentPos.y),
					width: args.draft.width,
					height: args.draft.height,
				},
			},
			meta,
			{ draftIdsToClear },
		).catch(onReject);
	}

	function finishInteraction(): void {
		if (!interaction) return;
		switch (interaction.kind) {
			case "move-node": {
				const draft = activeDrafts[interaction.id];
				if (!draft) break;
				if (interaction.acceptsChildren) {
					const target = findDropTarget(draft, frameNodes, getWorldPositionForFrame, interaction.id);
					const targetIgnoreKeys = computeTargetAncestorIgnoreKeys(
						target ? String(target.id) : null,
						nodeById,
					);
					const prepared = {
						subtreeFrameIds: interaction.subtreeFrameIds,
						subtreeLocalIds: interaction.subtreeLocalIds,
						subtreeFrameStartRects: interaction.subtreeFrameStartRects,
						subtreeLocalStartRects: interaction.subtreeLocalStartRects,
						staticRects: interaction.staticRects,
					};
					const hasOverlap = hasPreparedMoveOverlap(
						prepared,
						draft.x - interaction.startX,
						draft.y - interaction.startY,
						targetIgnoreKeys,
					);
					if (!isWithinRootBounds(draft) || hasOverlap) {
						clearSubtreeDraftsByIds(interaction.subtreeFrameIds, interaction.subtreeLocalIds);
						endInteraction();
						return;
					}
					persistDraftNode(
						{
							interactionId: interaction.id,
							draft,
							finalParentId: String(target?.id ?? rootFrameId),
							additionalDraftIds: [...interaction.subtreeFrameIds, ...interaction.subtreeLocalIds],
						},
						{ kind: "move-node" },
						() => clearSubtreeDraftsByIds(interaction.subtreeFrameIds, interaction.subtreeLocalIds),
					);
					break;
				}
				const target = findDropTarget(draft, frameNodes, getWorldPositionForFrame);
				const targetIgnoreKeys = computeTargetAncestorIgnoreKeys(target ? String(target.id) : null, nodeById);
				const dropParentId = String(target?.id ?? rootFrameId);
				const hasOverlap = hasOverlapWithOthers(draft, `node:${interaction.id}`, {
					ignoreKeys: targetIgnoreKeys,
					placementParentFrameId: dropParentId,
				});
				if (!isWithinRootBounds(draft) || hasOverlap) {
					rejectAndEndForNode(interaction.id, {
						x: interaction.startX,
						y: interaction.startY,
						width: interaction.width,
						height: interaction.height,
					});
					return;
				}
				persistDraftNode(
					{
						interactionId: interaction.id,
						draft,
						finalParentId: dropParentId,
					},
					{ kind: "move-node" },
					() => clearDraftById(interaction.id),
				);
				break;
			}
			case "resize-node": {
				const draft = activeDrafts[interaction.id];
				if (!draft) break;
				const isCreateManyDraft = createManyIds.has(String(interaction.id));
				if (interaction.acceptsChildren) {
					const hasOverlap = hasOverlapWithOthers(draft, `node:${interaction.id}`, {
						ignoreKeys: [
							...subtreeEntityIgnoreKeys(interaction.id, frameNodes, localNodes),
							...computeAncestorFrameIgnoreKeys(interaction.id, nodeById),
						],
					});
					const childSizeConstraint = getMinimumFrameSizeForDirectChildren(interaction.id);
					const tooSmallForChildren =
						draft.width < childSizeConstraint.minWidth || draft.height < childSizeConstraint.minHeight;
					const withinParent = isWithinParentFrame(draft, interaction.parentId, interaction.id);
					if (
						!isCreateManyDraft &&
						(!isWithinRootBounds(draft) || hasOverlap || tooSmallForChildren || !withinParent)
					) {
						rejectAndEndForNode(interaction.id);
						return;
					}
				} else {
					const leafParentId = String(interaction.parentId ?? rootFrameId);
					const hasOverlap = hasOverlapWithOthers(draft, `node:${interaction.id}`, {
						ignoreKeys: computeLocalNodeAncestorIgnoreKeys(interaction.id, localNodesById, nodeById),
						placementParentFrameId: leafParentId,
					});
					const withinParent = isWithinParentFrame(draft, interaction.parentId);
					if (!isCreateManyDraft && (!isWithinRootBounds(draft) || hasOverlap || !withinParent)) {
						rejectAndEndForNode(interaction.id, {
							x: interaction.x,
							y: interaction.y,
							width: interaction.startWidth,
							height: interaction.startHeight,
						});
						return;
					}
				}
				persistDraftNode(
					{
						interactionId: interaction.id,
						draft,
						finalParentId: String(interaction.parentId ?? rootFrameId),
					},
					{ kind: "resize-node" },
					() => clearDraftById(interaction.id),
				);
				break;
			}
			case "resize-root": {
				if (rootDraft) {
					void handlePersistNode(
						{
							id: root.id,
							parentId: root.parentId,
							geometry: {
								x: root.geometry.x,
								y: root.geometry.y,
								width: rootDraft.width,
								height: rootDraft.height,
							},
						},
						{ kind: "resize-root" },
					).catch(() => {
						setRootDraft(null);
					});
				}
				break;
			}
			default:
				break;
		}
		endInteraction();
	}

	// Create-many staging: toolbar form, packed drafts, adapter confirm.
	function beginCreateMany(parent: TNode, initialOptionId?: string): void {
		const options = getCreateOptions?.(parent) ?? [];
		const oid = initialOptionId ?? options[0]?.id ?? "";
		const form = { quantity: 3, layoutMode: "row-top" as AutoLayoutMode, optionId: oid };
		setCreateManyForm(form);
		setCreateManyPlacement({
			parentId: String(parent.id),
			optionId: oid,
			nodes: [],
		});
	}

	function cancelCreateMany(): void {
		setCreateManyPlacement(null);
	}

	function reapplyCreateManyLayout(): void {
		if (!createManyPlacement) return;
		const parent = nodeById.get(createManyPlacement.parentId);
		if (!parent) return;
		const built = buildManyDraftNodes(parent, createManyForm, createManyPlacement);
		if (built.length === 0) return;
		startTransition(() => {
			setCreateManyPlacement((prev) => {
				if (!prev) return prev;
				if (prev.parentId !== String(parent.id)) return prev;
				return { ...prev, optionId: createManyForm.optionId, nodes: built };
			});
		});
	}

	function confirmCreateManyPlacement(): void {
		if (!createManyPlacement || !onCreateManyPlacementConfirm) return;
		const parent = nodeById.get(createManyPlacement.parentId);
		if (!parent) return;
		const result = onCreateManyPlacementConfirm({
			optionId: createManyPlacement.optionId,
			nodes: createManyPlacement.nodes,
			parent,
		});
		void Promise.resolve(result).finally(() => {
			setCreateManyPlacement(null);
		});
	}

	// Find a gap in the parent for a duplicate draft; used before opening duplicate placement.
	function findFreeDuplicateGeometryInParent(
		parent: TNode,
		size: { width: number; height: number },
		draftId: string,
		placementParentFrameId: string,
	): SpatialGeometry | null {
		const parentRect = getFrameNodeRect(parent);
		const { width, height } = size;
		const maxX = Math.max(0, parentRect.width - width);
		const maxY = Math.max(0, parentRect.height - height);
		for (let y = 0; y <= maxY; y += gridStep) {
			for (let x = 0; x <= maxX; x += gridStep) {
				const worldRect = {
					x: parentRect.x + x,
					y: parentRect.y + y,
					width,
					height,
				};
				const overlaps = hasOverlapWithOthers(worldRect, `node:${draftId}`, {
					placementParentFrameId: placementParentFrameId,
				});
				if (!overlaps) {
					return { x, y, width, height };
				}
			}
		}
		return null;
	}

	// Context action: seed `duplicatePlacement` with a pending copy + label.
	function handleDuplicateClick(source: TNode): void {
		if (!onDuplicateNodePlacementConfirm || placementBlocked) return;
		const parentKey = source.parentId ? String(source.parentId) : String(root.id);
		const parent = parentKey === String(root.id) ? root : nodeById.get(parentKey);
		if (!parent) return;
		const siblingLabels = effectiveNodes
			.filter((n) => (n.parentId ? String(n.parentId) : String(root.id)) === parentKey)
			.map((n) => n.label);
		const label = nextDuplicateLabel(source.label, siblingLabels);
		const draftId = `pending-dup-${++duplicateDraftSeqRef.current}`;
		const geometry = findFreeDuplicateGeometryInParent(
			parent,
			{ width: source.geometry.width, height: source.geometry.height },
			draftId,
			parentKey,
		);
		if (!geometry) {
			onErrorMessage?.(
				lb.duplicateNoSpaceAlert?.trim() ||
					"No free area in this frame for a duplicate. Resize the frame or move items, then try again.",
			);
			return;
		}
		const duplicate: TNode = {
			...source,
			id: draftId,
			label,
			parentId: source.parentId,
			geometry,
		};
		setDuplicatePlacement({ source, node: duplicate });
	}

	async function runAutoLayout(targetId: string, mode: AutoLayoutMode): Promise<void> {
		const subtreeFrameIds = Array.from(computeSubtreeFrameIds(targetId, frameNodes));
		const subtreeLocalIds = Array.from(computeSubtreeLocalIds(new Set(subtreeFrameIds), localNodes));
		clearSubtreeDraftsByIds(subtreeFrameIds, subtreeLocalIds);
		const target = nodeById.get(targetId);
		if (!target) return;

		const directChildren = effectiveNodes
			.filter((n) => String(n.parentId) === String(target.id))
			.sort((a, b) => a.id.localeCompare(b.id));
		const totalItems = directChildren.length;
		if (totalItems === 0) return;

		const buildLayoutPlan = (inputChildren: typeof directChildren) => {
			const geoms = planGeometriesInParentFrame(
				target.geometry,
				inputChildren.map((child) => ({
					width: Math.max(minSize, child.geometry.width),
					height: Math.max(minSize, child.geometry.height),
				})),
				mode,
				gridStep,
				minSize,
			);
			return inputChildren.map((child, index) => {
				const geom = geoms[index] ?? {
					x: child.geometry.x,
					y: child.geometry.y,
					width: Math.max(minSize, child.geometry.width),
					height: Math.max(minSize, child.geometry.height),
				};
				return {
					child,
					geom,
					changed:
						child.geometry.x !== geom.x ||
						child.geometry.y !== geom.y ||
						child.geometry.width !== geom.width ||
						child.geometry.height !== geom.height,
				};
			});
		};

		const layoutPlan = buildLayoutPlan(directChildren);
		const localGeometries = layoutPlan.map((item) => item.geom);
		if (!localChildGeometriesValidInParent(target.geometry.width, target.geometry.height, localGeometries)) {
			onErrorMessage?.(
				lb.autoLayoutNoFitAlert?.trim() || "Layout cannot be applied because items do not fit this frame.",
			);
			return;
		}
		if (!layoutPlan.some((item) => item.changed)) return;

		const ops: SpatialLayoutOperation<TNode>[] = [];
		const changes: { node: TNode; kind: "auto-layout" }[] = [];
		for (const { child, geom } of layoutPlan) {
			const patched = applyNodePatch(child, {
				parentId: target.id,
				geometry: geom,
			});
			const beforeSnap = toNodeSnapshot(child);
			const afterSnap = toNodeSnapshot(patched);
			if (!nodeSnapshotsEqual(beforeSnap, afterSnap)) {
				ops.push({
					type: "updateNode",
					id: String(child.id),
					before: beforeSnap,
					after: afterSnap,
					kind: "auto-layout",
				});
				changes.push({ node: patched, kind: "auto-layout" });
			}
		}
		if (changes.length === 0) return;
		try {
			await onApplyOperations({ operations: ops as SpatialLayoutOperation<TNode>[] });
			const drop = new Set(layoutPlan.map((p) => String(p.child.id)));
			setDrafts((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => !drop.has(key))));
			if (layoutHistoryResolved && ops.length > 0) {
				layoutHistoryResolved.commit(ops);
			}
		} catch {
			/* adapter failed; do not commit history or draft clears */
		}
	}

	// Context menu sub-trees: auto-layout modes, single create, create-many.
	function renderAutoLayoutMenu(targetId: string, hasChildren: boolean) {
		if (!hasChildren) return null;
		const commonOptions = AUTO_LAYOUT_OPTIONS.filter((option) => option.group === "common");
		const stackOptions = AUTO_LAYOUT_OPTIONS.filter((option) => option.group === "stack");
		const rowOptions = AUTO_LAYOUT_OPTIONS.filter((option) => option.group === "rows");
		const columnOptions = AUTO_LAYOUT_OPTIONS.filter((option) => option.group === "columns");
		const renderOptions = (options: readonly (typeof AUTO_LAYOUT_OPTIONS)[number][]) =>
			options.map((option) => {
				const Icon = option.icon;
				const { label, hint } = mergeAutoLayoutDisplay(option, lb.autoLayoutModes);
				return (
					<ContextMenuItem
						key={option.id}
						title={hint}
						onClick={() => {
							void runAutoLayout(targetId, option.id);
						}}
					>
						<Icon className="size-3.5" />
						<span>{label}</span>
					</ContextMenuItem>
				);
			});
		return (
			<ContextMenuSub>
				<ContextMenuSubTrigger>{lb.autoLayoutMenu}</ContextMenuSubTrigger>
				<ContextMenuSubContent>
					{renderOptions(commonOptions)}
					{stackOptions.length > 0 ? (
						<ContextMenuSub>
							<ContextMenuSubTrigger>{autoLayoutGroupLabels.stack}</ContextMenuSubTrigger>
							<ContextMenuSubContent>{renderOptions(stackOptions)}</ContextMenuSubContent>
						</ContextMenuSub>
					) : null}
					{rowOptions.length > 0 ? (
						<ContextMenuSub>
							<ContextMenuSubTrigger>{autoLayoutGroupLabels.rows}</ContextMenuSubTrigger>
							<ContextMenuSubContent>{renderOptions(rowOptions)}</ContextMenuSubContent>
						</ContextMenuSub>
					) : null}
					{columnOptions.length > 0 ? (
						<ContextMenuSub>
							<ContextMenuSubTrigger>{autoLayoutGroupLabels.columns}</ContextMenuSubTrigger>
							<ContextMenuSubContent>{renderOptions(columnOptions)}</ContextMenuSubContent>
						</ContextMenuSub>
					) : null}
				</ContextMenuSubContent>
			</ContextMenuSub>
		);
	}

	function renderCreateMenu(parent: TNode) {
		if (!parent.acceptsChildren) return null;
		const options = getCreateOptions?.(parent) ?? [];
		if (options.length === 0) return null;
		return (
			<ContextMenuSub>
				<ContextMenuSubTrigger disabled={placementBlocked}>
					{lb.createMenu}
				</ContextMenuSubTrigger>
				<ContextMenuSubContent>
					{options.map((option) => (
						<ContextMenuItem
							key={option.id}
							disabled={placementBlocked}
							id={option.id === "location" ? "layout-editor-create-location" : undefined}
							onClick={() => {
								const node = getInitialPlacementNode(option.createNode(parent), parent);
								setCreatePlacement({
									optionId: option.id,
									parentId: String(parent.id),
									node,
								});
							}}
						>
							{option.label}
						</ContextMenuItem>
					))}
				</ContextMenuSubContent>
			</ContextMenuSub>
		);
	}

	function renderCreateManyMenu(parent: TNode) {
		if (!onCreateManyPlacementConfirm || !parent.acceptsChildren) return null;
		const options = getCreateOptions?.(parent) ?? [];
		if (options.length === 0) return null;
		return (
			<ContextMenuSub>
				<ContextMenuSubTrigger disabled={placementBlocked}>{lb.createManyMenu}</ContextMenuSubTrigger>
				<ContextMenuSubContent>
					{options.map((option) => (
						<ContextMenuItem
							key={option.id}
							disabled={placementBlocked}
							id={option.id === "location" ? "layout-editor-create-many-location" : undefined}
							onClick={() => beginCreateMany(parent, option.id)}
						>
							{option.label}
						</ContextMenuItem>
					))}
				</ContextMenuSubContent>
			</ContextMenuSub>
		);
	}

	function renderCreateManyPlacementForm(parentId: string, positionClassName = "top-[calc(100%+8px)]") {
		if (createManyPlacement?.parentId !== parentId) return null;
		const selectedLayoutOption =
			AUTO_LAYOUT_OPTIONS.find((opt) => opt.id === createManyForm.layoutMode) ?? AUTO_LAYOUT_OPTIONS[0];
		const SelectedLayoutIcon = selectedLayoutOption.icon;
		const selectedLayoutLabel = mergeAutoLayoutDisplay(selectedLayoutOption, lb.autoLayoutModes).label;
		const commonOptions = AUTO_LAYOUT_OPTIONS.filter((option) => option.group === "common");
		const stackOptions = AUTO_LAYOUT_OPTIONS.filter((option) => option.group === "stack");
		const rowOptions = AUTO_LAYOUT_OPTIONS.filter((option) => option.group === "rows");
		const columnOptions = AUTO_LAYOUT_OPTIONS.filter((option) => option.group === "columns");
		const selectLayoutMode = (mode: AutoLayoutMode) => setCreateManyForm((f) => ({ ...f, layoutMode: mode }));
		const renderLayoutOptions = (options: readonly (typeof AUTO_LAYOUT_OPTIONS)[number][]) =>
			options.map((opt) => {
				const { label } = mergeAutoLayoutDisplay(opt, lb.autoLayoutModes);
				const Icon = opt.icon;
				const selected = createManyForm.layoutMode === opt.id;
				return (
					<DropdownMenuItem
						key={opt.id}
						className={selected ? "bg-accent/50" : undefined}
						onClick={() => selectLayoutMode(opt.id)}
					>
						<Icon className="size-3.5" />
						<span>{label}</span>
					</DropdownMenuItem>
				);
			});
		return (
			<div className={cn("absolute left-0 w-full px-1", positionClassName)}>
				<Card
					className="mx-auto max-w-[min(100%,28rem)] bg-background/95 shadow-sm"
					onPointerDown={(event) => event.stopPropagation()}
				>
					<div className="flex flex-col gap-2">
						<div className="grid gap-2">
							<div className="grid gap-1">
								<Label className="text-xs">{lb.createManyQuantity}</Label>
								<Input
									id="layout-editor-create-many-quantity"
									type="number"
									min={1}
									max={99}
									className="h-8"
									value={createManyForm.quantity}
									onPointerDown={(event) => event.stopPropagation()}
									onChange={(e) => {
										const v = Number.parseInt(e.target.value, 10);
										setCreateManyForm((f) => ({
											...f,
											quantity: Number.isFinite(v) ? Math.min(99, Math.max(1, v)) : 1,
										}));
									}}
								/>
							</div>
							<div className="grid gap-1">
								<Label className="text-xs">{lb.createManyLayoutMode}</Label>
								<div className="flex items-center gap-2">
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												type="button"
												variant="outline"
												className="h-8 min-w-0 flex-1 justify-start gap-2 text-xs"
												onPointerDown={(event) => event.stopPropagation()}
											>
												<SelectedLayoutIcon className="size-3.5 shrink-0" />
												<span className="truncate">{selectedLayoutLabel}</span>
												<ChevronDown className="ml-auto size-3.5 shrink-0" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent className="w-72">
											{renderLayoutOptions(commonOptions)}
											<DropdownMenuSeparator />
											<DropdownMenuSub>
												<DropdownMenuSubTrigger>
													{autoLayoutGroupLabels.stack}
												</DropdownMenuSubTrigger>
												<DropdownMenuSubContent>
													{renderLayoutOptions(stackOptions)}
												</DropdownMenuSubContent>
											</DropdownMenuSub>
											<DropdownMenuSub>
												<DropdownMenuSubTrigger>
													{autoLayoutGroupLabels.rows}
												</DropdownMenuSubTrigger>
												<DropdownMenuSubContent>
													{renderLayoutOptions(rowOptions)}
												</DropdownMenuSubContent>
											</DropdownMenuSub>
											<DropdownMenuSub>
												<DropdownMenuSubTrigger>
													{autoLayoutGroupLabels.columns}
												</DropdownMenuSubTrigger>
												<DropdownMenuSubContent>
													{renderLayoutOptions(columnOptions)}
												</DropdownMenuSubContent>
											</DropdownMenuSub>
										</DropdownMenuContent>
									</DropdownMenu>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												type="button"
												size="icon-sm"
												variant="outline"
												aria-label={lb.createManyReapplyLayout}
												onPointerDown={(event) => event.stopPropagation()}
												onClick={(event) => {
													event.stopPropagation();
													reapplyCreateManyLayout();
												}}
											>
												<RefreshCcw className="size-3.5" />
											</Button>
										</TooltipTrigger>
										<TooltipContent>{lb.createManyReapplyLayout}</TooltipContent>
									</Tooltip>
								</div>
							</div>
						</div>
						<div className="flex flex-wrap justify-center gap-2">
							<Button
								id="layout-editor-create-many-continue"
								size="sm"
								variant="secondary"
								className="h-7 px-2"
								onPointerDown={(event) => event.stopPropagation()}
								onClick={(event) => {
									event.stopPropagation();
									cancelCreateMany();
								}}
							>
								{lb.createManyCancel}
							</Button>
							<Button
								size="sm"
								className="h-7 px-2"
								disabled={!isCreateManyPlacementValid || !onCreateManyPlacementConfirm}
								onPointerDown={(event) => event.stopPropagation()}
								onClick={(event) => {
									event.stopPropagation();
									confirmCreateManyPlacement();
								}}
							>
								{lb.createManyContinue}
							</Button>
						</div>
					</div>
				</Card>
			</div>
		);
	}

	// Semi-transparent originals while dragging/resizing (subtree vs single node).
	function renderInteractionGhosts(): ReactNode {
		if (!interaction) return null;
		if (interaction.kind === "move-node" && interaction.acceptsChildren) {
			return (
				<>
					{interaction.subtreeFrameIds.map((id) => {
						const rect = interaction.subtreeFrameStartRects[id];
						if (!rect) return null;
						return (
							<div
								key={`ghost-frame-${id}`}
								className={cc.interactionGhost}
								style={{
									left: rect.x,
									top: rect.y,
									width: rect.width,
									height: rect.height,
									zIndex: 1,
								}}
							/>
						);
					})}
					{interaction.subtreeLocalIds.map((id) => {
						const rect = interaction.subtreeLocalStartRects[id];
						if (!rect) return null;
						return (
							<div
								key={`ghost-local-${id}`}
								className={cc.interactionGhost}
								style={{
									left: rect.x,
									top: rect.y,
									width: rect.width,
									height: rect.height,
									zIndex: 1,
								}}
							/>
						);
					})}
				</>
			);
		}
		if (interaction.kind === "move-node" && !interaction.acceptsChildren) {
			return (
				<div
					className={cc.interactionGhost}
					style={{
						left: interaction.startX,
						top: interaction.startY,
						width: interaction.width,
						height: interaction.height,
						zIndex: 1,
					}}
				/>
			);
		}
		if (interaction.kind === "resize-node") {
			return (
				<div
					className={cc.interactionGhost}
					style={{
						left: interaction.x,
						top: interaction.y,
						width: interaction.startWidth,
						height: interaction.startHeight,
						zIndex: 1,
					}}
				/>
			);
		}
		return null;
	}

	// --- Render ---
	return (
		<div id="layout-editor-root" className={cn("space-y-3", cc.root)}>
			<div className="flex items-center justify-between">
				<h3 className="font-semibold">{lb.headerLabel ?? lb.fallbackHeader}</h3>
				<div className="flex items-center gap-2">
					<Tooltip>
						<TooltipTrigger asChild>
							<Toggle
								variant="outline"
								size="sm"
								id="layout-editor-lock-toggle"
								className="size-8 shrink-0 p-0"
								pressed={layoutInteractionLocked}
								onPressedChange={setLayoutInteractionLocked}
								aria-label={
									layoutInteractionLocked
										? (lb.lockLayoutToggleUnlockHint ?? "")
										: (lb.lockLayoutToggleLockHint ?? "")
								}
							>
								{layoutInteractionLocked ? (
									<Lock className="size-4" aria-hidden />
								) : (
									<LockOpen className="size-4" aria-hidden />
								)}
							</Toggle>
						</TooltipTrigger>
						<TooltipContent>
							{layoutInteractionLocked ? lb.lockLayoutToggleUnlockHint : lb.lockLayoutToggleLockHint}
						</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Toggle
								variant="outline"
								size="sm"
								id="layout-editor-grid-toggle"
								className="size-8 shrink-0 p-0"
								pressed={gridDisplayVisible}
								onPressedChange={setGridDisplayVisible}
								aria-label={
									gridDisplayVisible
										? (lb.gridDisplayToggleHideHint ?? "")
										: (lb.gridDisplayToggleShowHint ?? "")
								}
							>
								{gridDisplayVisible ? (
									<Grid2x2Check className="size-4" aria-hidden />
								) : (
									<Grid2x2X className="size-4" aria-hidden />
								)}
							</Toggle>
						</TooltipTrigger>
						<TooltipContent>
							{gridDisplayVisible ? lb.gridDisplayToggleHideHint : lb.gridDisplayToggleShowHint}
						</TooltipContent>
					</Tooltip>
					<ButtonGroup>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="outline"
									size="icon-lg"
									id="layout-editor-zoom-out"
									aria-label={lb.zoomOut}
									
									onClick={() => setViewport((p) => ({ ...p, scale: Math.max(0.4, p.scale - 0.1) }))}
								>
									<Minus />
								</Button>
							</TooltipTrigger>
							<TooltipContent>{lb.zoomOut}</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="outline"
									size="icon-lg"
									id="layout-editor-zoom-in"
									aria-label={lb.zoomIn}	
									onClick={() => setViewport((p) => ({ ...p, scale: Math.min(3, p.scale + 0.1) }))}
								>
									<Plus />
								</Button>
							</TooltipTrigger>
							<TooltipContent>{lb.zoomIn}</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="outline"
									size="icon-lg"
									aria-label={lb.resetView}
									onClick={() =>
										setViewport({ ...DEFAULT_INITIAL_VIEWPORT, ...initialViewportPartial })
									}
								>
									<RotateCcw />
								</Button>
							</TooltipTrigger>
							<TooltipContent>{lb.resetView}</TooltipContent>
						</Tooltip>
					</ButtonGroup>
					{layoutHistoryResolved ? (
						<ButtonGroup>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										type="button"
										variant="outline"
										size="icon-lg"
										id="layout-editor-history-undo"
										aria-label={lb.undo}
										disabled={geometryEditFrozen || !layoutHistoryResolved.canUndo}
										onClick={() => void layoutHistoryResolved.undo()}
									>
										<Undo2 />
									</Button>
								</TooltipTrigger>
								<TooltipContent>{lb.undo}</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										type="button"
										variant="outline"
										size="icon-lg"
										aria-label={lb.redo}
										disabled={geometryEditFrozen || !layoutHistoryResolved.canRedo}
										onClick={() => void layoutHistoryResolved.redo()}
									>
										<Redo2 />
									</Button>
								</TooltipTrigger>
								<TooltipContent>{lb.redo}</TooltipContent>
							</Tooltip>
						</ButtonGroup>
					) : null}
				</div>
			</div>
			<div
				ref={viewportRef}
				id="layout-editor-viewport"
				className={cn(cc.viewport)}
				style={{
					width: "100%",
					...(gridDisplayVisible ? viewportWorldGridBackground : {}),
					backgroundImage: gridDisplayVisible
						? "linear-gradient(to right, rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.08) 1px, transparent 1px)"
						: "none",
					cursor: interaction?.kind === "pan" ? "grabbing" : geometryEditFrozen ? "default" : "grab",
					touchAction: "none",
				}}
				onPointerDownCapture={handleViewportPointerDownCapture}
				onPointerDown={handleViewportPointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={finishInteraction}
				onPointerLeave={finishInteraction}
				onContextMenuCapture={() => {
					setActiveContextTarget(null);
				}}
			>
				<ContextMenu
					onOpenChange={(open) => {
						setContextMenuOpenState(toContextTarget(rootId), open);
					}}
				>
					<ContextMenuTrigger>
						<div
							id="layout-editor-root-surface"
							className="relative"
							style={{
								width: rootDraft?.width ?? root.geometry.width,
								height: rootDraft?.height ?? root.geometry.height,
								transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
								transformOrigin: "top left",
							}}
						>
							<div
								aria-hidden
								className={cn(
									"pointer-events-none absolute inset-0 z-0 border-2 border-dashed transition-colors",
									cc.rootShell(root, rootVisualState),
								)}
							/>
							{renderInteractionGhosts()}
							{geometryEditFrozen ? null : (
								<div
									id="layout-editor-root-resize-handle"
									className={cn(cc.rootResizeHandle)}
									onPointerDown={startResizeRoot}
								/>
							)}
							{renderCreateManyPlacementForm(rootId)}
							{effectiveNodes.map((node) => {
								const nodeId = String(node.id);
								const nodeTarget = toContextTarget(nodeId);
								const vis = getNodeVisualState(node);
								const isDraftNode =
									nodeId === placementNodeId ||
									createManyIds.has(String(nodeId)) ||
									placementCompanionIds.has(nodeId);
								const isTemplateDraftNode = createManyTemplateNodeId === nodeId;
								const rect = getNodeCanvasRect(node);
								const w = activeDrafts[nodeId]?.width ?? node.geometry.width;
								const h = activeDrafts[nodeId]?.height ?? node.geometry.height;
								const depthKey = String(node.acceptsChildren ? node.id : (node.parentId ?? root.id));
								const zIndex = 10 + getFrameDepthFor(depthKey) * 10 + (node.acceptsChildren ? 0 : 5);

								return (
									<ContextMenu
										key={nodeId}
										onOpenChange={(open) => setContextMenuOpenState(nodeTarget, open)}
									>
										<ContextMenuTrigger>
											<div
												id={nodeId === primaryTourNodeId ? "layout-editor-primary-node" : undefined}
												data-layout-node-shell="true"
												className={cn(
													cc.nodeShell(node, vis),
													activeHighlightNodeId === nodeId ? cc.nodeHighlight : undefined,
													isDraftNode ? cc.nodeDraftShell(node, vis) : undefined,
													isTemplateDraftNode
														? cc.nodeDraftTemplateShell(node, vis)
														: undefined,
													geometryEditFrozen ? "cursor-default!" : null,
												)}
												style={{
													left: rect.x,
													top: rect.y,
													width: w,
													height: h,
													zIndex,
												}}
												onPointerDown={(event) =>
													startMoveGeometry(event, {
														acceptsChildren: node.acceptsChildren,
														id: nodeId,
														x: rect.x,
														y: rect.y,
														width: w,
														height: h,
														parentId: node.parentId ? String(node.parentId) : null,
													})
												}
											>
												<div className={cn(cc.nodeContent)}>
													{renderNodeContent(node, vis)}
													{placementNodeId === nodeId && activePlacement ? (
														<div className="pointer-events-none absolute top-[calc(100%+8px)] left-0 z-20 w-full">
															<div className="pointer-events-auto mx-auto w-fit rounded-md border bg-background/95 p-1 shadow-sm">
																<ButtonGroup>
																	<Button
																		size="sm"
																		variant="secondary"
																		className="h-7 px-2"
																		onPointerDown={(event) =>
																			event.stopPropagation()
																		}
																		onClick={(event) => {
																			event.stopPropagation();
																			if (activePlacement.kind === "create")
																				setCreatePlacement(null);
																			else if (
																				activePlacement.kind === "duplicate"
																			)
																				setDuplicatePlacement(null);
																			else placementCandidate?.onCancel();
																		}}
																	>
																		{lb.cancelPlacement}
																	</Button>
																	<Button
																		size="sm"
																		className="h-7 px-2"
																		disabled={!isCreatePlacementValid}
																		onPointerDown={(event) =>
																			event.stopPropagation()
																		}
																		onClick={(event) => {
																			event.stopPropagation();
																			if (!activePlacement) return;
																			if (activePlacement.kind === "create") {
																				const result =
																					onCreatePlacementConfirm?.({
																						optionId:
																							createPlacement?.optionId ??
																							"",
																						node: activePlacement.node,
																						parent:
																							nodeById.get(
																								createPlacement?.parentId ??
																									"",
																							) ?? root,
																					});
																				void Promise.resolve(result).finally(
																					() => {
																						setCreatePlacement(null);
																					},
																				);
																			} else if (
																				activePlacement.kind === "duplicate"
																			) {
																				const result =
																					onDuplicateNodePlacementConfirm?.({
																						sourceNode:
																							activePlacement.source,
																						duplicateNode:
																							activePlacement.node,
																					});
																				void Promise.resolve(result).finally(
																					() => {
																						setDuplicatePlacement(null);
																					},
																				);
																			} else {
																				void Promise.resolve(
																					resolvedPlacementCandidate?.onConfirm(
																						activePlacement.node,
																					),
																				);
																			}
																		}}
																	>
																		{activePlacement.kind === "duplicate"
																			? duplicateConfirmLabelResolved
																			: lb.confirmPlacement}
																	</Button>
																</ButtonGroup>
															</div>
														</div>
													) : null}
													{renderCreateManyPlacementForm(nodeId)}
													{geometryEditFrozen ||
													(activePlacement?.kind === "external" &&
														placementCompanionIds.has(nodeId)) ? null : (
														<div
															id={nodeId === primaryTourNodeId ? "layout-editor-primary-node-resize" : undefined}
															className={cn(cc.nodeResizeHandle)}
															onPointerDown={(event) =>
																startResizeGeometry(event, {
																	acceptsChildren: node.acceptsChildren,
																	id: nodeId,
																	x: rect.x,
																	y: rect.y,
																	width: w,
																	height: h,
																	parentId: node.parentId
																		? String(node.parentId)
																		: null,
																})
															}
														/>
													)}
												</div>
											</div>
										</ContextMenuTrigger>
										<ContextMenuContent>
											<ContextMenuLabel>{node.label}</ContextMenuLabel>
											{geometryEditFrozen
												? buildHostContextMenuSlices(node, false)
												: (() => {
														const hasDirectChildren =
															(childCountByParentId.get(nodeId) ?? 0) > 0;
														const hostSlices = buildHostContextMenuSlices(node, true);
														return (
															<>
																{renderCreateMenu(node)}
																{renderCreateManyMenu(node)}
																{onDuplicateNodePlacementConfirm &&
																String(node.id) !== String(root.id) ? (
																	<ContextMenuItem
																		disabled={placementBlocked}
																		onClick={() => handleDuplicateClick(node)}
																	>
																		{lb.duplicate}
																	</ContextMenuItem>
																) : null}
																{renderAutoLayoutMenu(nodeId, hasDirectChildren)}
																{hostSlices ? (
																	<>
																		<ContextMenuSeparator />
																		{hostSlices}
																	</>
																) : null}
																<ContextMenuSeparator />
																{!isProvisionalSpatialId(nodeId) ? (
																	hasDirectChildren ? (
																		<>
																			<ContextMenuSub>
																				<ContextMenuSubTrigger>
																					{detachMenuLabel}
																				</ContextMenuSubTrigger>
																				<ContextMenuSubContent>
																					<ContextMenuItem
																						onClick={() =>
																							void handleDeleteNodeWithChildren(
																								nodeId,
																								"detach",
																							).catch(() => {
																								clearDraftById(nodeId);
																							})
																						}
																					>
																						{
																							detachOrRemoveSubLabels.withChildren
																						}
																					</ContextMenuItem>
																					<ContextMenuItem
																						onClick={() =>
																							void handleDeleteNodeWithoutChildren(
																								nodeId,
																								"detach",
																							).catch(() => {
																								clearDraftById(nodeId);
																							})
																						}
																					>
																						{
																							detachOrRemoveSubLabels.withoutChildren
																						}
																					</ContextMenuItem>
																				</ContextMenuSubContent>
																			</ContextMenuSub>
																			<ContextMenuSub>
																			<ContextMenuSubTrigger
																				id="layout-editor-remove-menu"
																				className="text-destructive"
																			>
																					{removeMenuLabel}
																				</ContextMenuSubTrigger>
																				<ContextMenuSubContent>
																					<ContextMenuItem
																						id="layout-editor-delete-without-children"
																						variant="destructive"
																						onClick={() =>
																							void handleDeleteNodeWithChildren(
																								nodeId,
																								"remove",
																							).catch(() => {
																								clearDraftById(nodeId);
																							})
																						}
																					>
																						{
																							detachOrRemoveSubLabels.withChildren
																						}
																					</ContextMenuItem>
																					<ContextMenuItem
																						variant="destructive"
																						onClick={() =>
																							void handleDeleteNodeWithoutChildren(
																								nodeId,
																								"remove",
																							).catch(() => {
																								clearDraftById(nodeId);
																							})
																						}
																					>
																						{
																							detachOrRemoveSubLabels.withoutChildren
																						}
																					</ContextMenuItem>
																				</ContextMenuSubContent>
																			</ContextMenuSub>
																		</>
																	) : (
																		<>
																			<ContextMenuItem
																				onClick={() =>
																					void handleDeleteNodeWithoutChildren(
																						nodeId,
																						"detach",
																					).catch(() => {
																						clearDraftById(nodeId);
																					})
																				}
																			>
																				{detachMenuLabel}
																			</ContextMenuItem>
																			<ContextMenuItem
																				variant="destructive"
																				onClick={() =>
																					void handleDeleteNodeWithoutChildren(
																						nodeId,
																						"remove",
																					).catch(() => {
																						clearDraftById(nodeId);
																					})
																				}
																			>
																				{removeMenuLabel}
																			</ContextMenuItem>
																		</>
																	)
																) : null}
															</>
														);
													})()}
										</ContextMenuContent>
									</ContextMenu>
								);
							})}
							{effectiveNodes.map((node) => {
								const nodeId = String(node.id);
								const vis = getNodeVisualState(node);
								const rect = getNodeCanvasRect(node);
								const w = activeDrafts[nodeId]?.width ?? node.geometry.width;
								const labelEl = renderNodeLabel(node, vis);
								if (labelEl == null) return null;
								return (
									<div
										key={`spatial-node-label-${nodeId}`}
										className="pointer-events-none absolute min-w-0"
										style={{
											zIndex: 9000,
											left: rect.x + w / 2,
											top: `calc(${rect.y}px - 1.25rem)`,
											transform: "translateX(-50%)",
											/* Up to ~140% of node width so host labels can extend past the frame */
											maxWidth: Math.max(48, w * 1.4 - 8),
										}}
									>
										{labelEl}
									</div>
								);
							})}
						</div>
					</ContextMenuTrigger>
					<ContextMenuContent>
						<ContextMenuLabel>{lb.canvasMenu}</ContextMenuLabel>
						{geometryEditFrozen ? (
							buildHostContextMenuSlices(root, false)
						) : (
							<>
								{renderCreateMenu(root)}
								{renderCreateManyMenu(root)}
								{renderAutoLayoutMenu(rootId, (childCountByParentId.get(rootId) ?? 0) > 0)}
								{(() => {
									const hostSlices = buildHostContextMenuSlices(root, true);
									if (!hostSlices) return null;
									return (
										<>
											<ContextMenuSeparator />
											{hostSlices}
										</>
									);
								})()}
							</>
						)}
					</ContextMenuContent>
				</ContextMenu>
			</div>
		</div>
	);
}
