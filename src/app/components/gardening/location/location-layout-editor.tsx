import { useCallback, useEffect, useMemo, useRef, useState, type HTMLAttributes } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import * as m from "@/paraglide/messages.js";
import type {
	HydratedPlantEntity,
	LocationEntity,
	LocationEntityId,
	PlantEntityId,
} from "@backend/core/domain/gardening/entities";
import type {
	SpatialNodeEntity,
	SpatialNodeEntityId,
	SpatialNodeTreeNode,
} from "@backend/core/domain/spatial/entities";
import type { ItemPresentationValueObject } from "@backend/core/domain/gardening/value-objects";
import { SELECT_NONE } from "@/components/form/select-sentinel";
import { ItemPresentationIcon } from "@/components/icon/item-presentation-icon";
import { LocationCreateDialog } from "@/components/gardening/location/location-create-dialog";
import { LocationCreateManyDialog } from "@/components/gardening/location/location-create-many-dialog";
import { LocationUpdateDialog } from "@/components/gardening/location/location-update-dialog";
import { PlantCreateDialog } from "@/components/gardening/plant/plant-create-dialog";
import { PlantCreateManyDialog } from "@/components/gardening/plant/plant-create-many-dialog";
import { PlantUpdateDialog } from "@/components/gardening/plant/plant-update-dialog";
import {
	GardeningEventCreateDialog,
	type GardeningEventCreateDialogInitialValues,
} from "@/components/gardening/gardening-event/gardening-event-create-dialog";
import {
	SpatialLayoutEditor,
	type SpatialAutoLayoutMode,
	type SpatialLayoutCreateOption,
	type SpatialLayoutEditorHistoryOptions,
	type SpatialLayoutEditorLabels,
	type SpatialLayoutNodeContextActionSlices,
	type SpatialLayoutPlacementCandidate,
	type SpatialGeometry,
	type SpatialLayoutNode,
	type SpatialLayoutNodeSnapshot,
	type SpatialLayoutOperation,
	useSpatialLayoutHistory,
} from "@/components/spatial-layout-editor";
import { Button } from "@/components/ui/button";
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { queryKeys } from "@/store/keys";
import { getSpatialPlacementStatusByRef, spatialNodeHasParent } from "@/store/spatial-placement";
import { useSpatialLayoutApplyOperationsMutation, useSpatialNodeCreateMutation } from "@/store/mutations";
import { flattenSpatialLayoutOperations } from "@/store/mutations/spatial-layout-flatten-ops";
import {
	ContextMenuGroup,
	ContextMenuItem,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
} from "@/components/ui/context-menu";

const locationLayoutRouteApi = getRouteApi("/location/$locationId/layout");

/** True when a layout apply lifts the focused location off its parent (detach) or deletes that location’s spatial node (remove). */
function focusedLocationWasRemovedFromLayout(
	flat: readonly SpatialLayoutOperation<SpatialLayoutNode>[],
	focusEntityId: string,
): boolean {
	for (const op of flat) {
		if (op.type === "reparentNode") {
			const ref = op.before.spatialRef;
			if (
				ref?.entity === "location" &&
				String(ref.entityId) === String(focusEntityId) &&
				op.before.parentId !== null &&
				op.after.parentId === null
			) {
				return true;
			}
		}
		if (op.type === "deleteNode") {
			const ref = op.before.spatialRef;
			if (ref?.entity === "location" && String(ref.entityId) === String(focusEntityId)) {
				return true;
			}
		}
	}
	return false;
}

type LayoutNodeType = "location" | "plant";

type LayoutNode = {
	id: string;
	parentId: string | null;
	geometry: SpatialGeometry;
	label: string;
	acceptsChildren: boolean;
	nodeType: LayoutNodeType;
	presentation?: ItemPresentationValueObject;
	ref: { entity: LayoutNodeType; entityId: string };
};

type AddExistingState = {
	open: boolean;
	parentId: string;
	selectedId: string;
};

type Props = {
	rootLocation: LocationEntity | null;
	className?: HTMLAttributes<HTMLDivElement>["className"];
	highlightLocationEntityId?: string | null;
};

type PendingCreationPlacement = {
	kind: "location" | "plant";
	node: LayoutNode;
};

type PendingExistingPlacement = {
	node: LayoutNode;
	originalNode: LayoutNode | null;
	createIfMissing: boolean;
	companionDraftNodes?: LayoutNode[];
};

type AddExistingOption = {
	id: string;
	label: string;
	presentation?: ItemPresentationValueObject;
	nodeType: LayoutNodeType;
	existingNode: LayoutNode | null;
};

function spatialToLayoutNode(args: {
	spatial: SpatialNodeEntity;
	entity: { type: "location"; value: LocationEntity } | { type: "plant"; value: HydratedPlantEntity } | null;
}): LayoutNode {
	const base = {
		id: String(args.spatial.id),
		parentId: args.spatial.parentId ? String(args.spatial.parentId) : null,
		geometry: {
			x: args.spatial.rect.x,
			y: args.spatial.rect.y,
			width: args.spatial.rect.width,
			height: args.spatial.rect.height,
		},
		acceptsChildren: args.spatial.kind === "frame",
		nodeType: args.spatial.ref.entity as LayoutNodeType,
		ref: { entity: args.spatial.ref.entity as LayoutNodeType, entityId: args.spatial.ref.entityId },
	} satisfies Omit<LayoutNode, "label" | "presentation">;

	if (!args.entity) {
		return { ...base, label: `${args.spatial.ref.entity}:${args.spatial.ref.entityId}` };
	}

	if (args.entity.type === "location") {
		return {
			...base,
			label: args.entity.value.name,
			presentation: args.entity.value.presentation,
		};
	}
	return {
		...base,
		label: args.entity.value.title ?? args.entity.value.cultivar.characteristics.name,
		presentation: args.entity.value.cultivar.presentation,
	};
}

/** Pre-order spatial descendants under `rootSpatialId` (not including the root). */
function collectDescendantLayoutNodesForSpatialRoot(args: {
	spatialItems: readonly SpatialNodeEntity[];
	rootSpatialId: string;
	locationItems: readonly LocationEntity[];
	plantItems: readonly HydratedPlantEntity[];
}): LayoutNode[] {
	const { spatialItems, rootSpatialId, locationItems, plantItems } = args;
	const locById = new Map(locationItems.map((l) => [String(l.id), l]));
	const plantById = new Map(plantItems.map((p) => [String(p.id), p]));
	const byParent = new Map<string, SpatialNodeEntity[]>();
	for (const n of spatialItems) {
		const p = n.parentId ? String(n.parentId) : "__root__";
		const arr = byParent.get(p);
		if (arr) arr.push(n);
		else byParent.set(p, [n]);
	}
	const sortKids = (arr: SpatialNodeEntity[]) => arr.slice().sort((a, b) => String(a.id).localeCompare(String(b.id)));

	const out: LayoutNode[] = [];
	const walk = (parentSpatialId: string) => {
		for (const sp of sortKids(byParent.get(String(parentSpatialId)) ?? [])) {
			const entity =
				sp.ref.entity === "location"
					? (() => {
							const loc = locById.get(String(sp.ref.entityId));
							return loc ? ({ type: "location" as const, value: loc } as const) : null;
						})()
					: (() => {
							const plant = plantById.get(String(sp.ref.entityId));
							return plant ? ({ type: "plant" as const, value: plant } as const) : null;
						})();
			out.push(spatialToLayoutNode({ spatial: sp, entity }));
			walk(String(sp.id));
		}
	};
	walk(rootSpatialId);
	return out;
}

export function LocationLayoutEditor({ rootLocation, className, highlightLocationEntityId }: Props) {
	const spatialLayoutLabels = useMemo((): SpatialLayoutEditorLabels => {
		const prefix = "components.spatialLayoutEditor";
		const al = `${prefix}.autoLayout`;
		return {
			fallbackHeader: m[`${prefix}.fallbackTitle` as keyof typeof m](),
			autoLayoutMenu: m[`${prefix}.autoLayoutMenu` as keyof typeof m](),
			createMenu: m[`${prefix}.createMenu` as keyof typeof m](),
			resetView: m[`${prefix}.resetView` as keyof typeof m](),
			undo: m[`${prefix}.undo` as keyof typeof m](),
			redo: m[`${prefix}.redo` as keyof typeof m](),
			duplicate: m[`${prefix}.duplicate` as keyof typeof m](),
			createManyMenu: m[`${prefix}.createManyMenu` as keyof typeof m](),
			createManyQuantity: m[`${prefix}.createManyQuantity` as keyof typeof m](),
			createManyLayoutMode: m[`${prefix}.createManyLayoutMode` as keyof typeof m](),
			duplicateNoSpaceAlert: m[`${prefix}.duplicateNoSpaceAlert` as keyof typeof m](),
			autoLayoutNoFitAlert: m[`${prefix}.autoLayoutNoFitAlert` as keyof typeof m](),
			autoLayoutGroupLabels: {
				stack: m[`${prefix}.autoLayoutGroups.stack` as keyof typeof m](),
				rows: m[`${prefix}.autoLayoutGroups.rows` as keyof typeof m](),
				columns: m[`${prefix}.autoLayoutGroups.columns` as keyof typeof m](),
			},
			createManyCancel: m["common.cancel"](),
			createManyContinue: m[`${prefix}.createManyContinueToForm` as keyof typeof m](),
			toolbarAutoLayout: m[`${prefix}.toolbarAutoLayout` as keyof typeof m](),
			zoomOut: m[`${prefix}.zoomOut` as keyof typeof m](),
			zoomIn: m[`${prefix}.zoomIn` as keyof typeof m](),
			lockLayoutToggleUnlockHint: m[`${prefix}.lockLayoutToggleUnlockHint` as keyof typeof m](),
			lockLayoutToggleLockHint: m[`${prefix}.lockLayoutToggleLockHint` as keyof typeof m](),
			canvasMenu: m[`${prefix}.canvas` as keyof typeof m](),
			detach: m[`${prefix}.detach` as keyof typeof m](),
			remove: m[`${prefix}.remove` as keyof typeof m](),
			detachOrRemoveWithChildren: m[`${prefix}.detachOrRemoveWithChildren` as keyof typeof m](),
			detachOrRemoveWithoutChildren: m[`${prefix}.detachOrRemoveWithoutChildren` as keyof typeof m](),
			headerLabel: m["components.locationLayoutEditor.layoutPageTitle"](),
			confirmPlacement: m["common.add"](),
			duplicateConfirmPlacement: m["common.save"](),
			cancelPlacement: m["common.cancel"](),
			autoLayoutModes: {
				"stack-left": {
					label: m[`${al}.stackLeft.label` as keyof typeof m](),
					hint: m[`${al}.stackLeft.hint` as keyof typeof m](),
				},
				"stack-middle": {
					label: m[`${al}.stackMiddle.label` as keyof typeof m](),
					hint: m[`${al}.stackMiddle.hint` as keyof typeof m](),
				},
				"stack-right": {
					label: m[`${al}.stackRight.label` as keyof typeof m](),
					hint: m[`${al}.stackRight.hint` as keyof typeof m](),
				},
				"stack-top": {
					label: m[`${al}.stackTop.label` as keyof typeof m](),
					hint: m[`${al}.stackTop.hint` as keyof typeof m](),
				},
				"stack-bottom": {
					label: m[`${al}.stackBottom.label` as keyof typeof m](),
					hint: m[`${al}.stackBottom.hint` as keyof typeof m](),
				},
				"row-top": {
					label: m[`${al}.rowTop.label` as keyof typeof m](),
					hint: m[`${al}.rowTop.hint` as keyof typeof m](),
				},
				"row-middle": {
					label: m[`${al}.rowMiddle.label` as keyof typeof m](),
					hint: m[`${al}.rowMiddle.hint` as keyof typeof m](),
				},
				"row-bottom": {
					label: m[`${al}.rowBottom.label` as keyof typeof m](),
					hint: m[`${al}.rowBottom.hint` as keyof typeof m](),
				},
				"column-left": {
					label: m[`${al}.columnLeft.label` as keyof typeof m](),
					hint: m[`${al}.columnLeft.hint` as keyof typeof m](),
				},
				"column-center": {
					label: m[`${al}.columnCenter.label` as keyof typeof m](),
					hint: m[`${al}.columnCenter.hint` as keyof typeof m](),
				},
				"column-right": {
					label: m[`${al}.columnRight.label` as keyof typeof m](),
					hint: m[`${al}.columnRight.hint` as keyof typeof m](),
				},
				"grid-balanced": {
					label: m[`${al}.gridBalanced.label` as keyof typeof m](),
					hint: m[`${al}.gridBalanced.hint` as keyof typeof m](),
				},
				"space-between": {
					label: m[`${al}.spaceBetween.label` as keyof typeof m](),
					hint: m[`${al}.spaceBetween.hint` as keyof typeof m](),
				},
				"space-around": {
					label: m[`${al}.spaceAround.label` as keyof typeof m](),
					hint: m[`${al}.spaceAround.hint` as keyof typeof m](),
				},
			} satisfies Record<SpatialAutoLayoutMode, { label: string; hint: string }>,
		};
	}, []);
	const navigate = useNavigate();
	const { locationId: urlFocusLocationId } = locationLayoutRouteApi.useParams();
	const { data: locationData } = useQuery({ ...queryKeys.location.all });
	const { data: plantData } = useQuery({ ...queryKeys.plant.all });

	const locationItems = useMemo(() => locationData?.items ?? [], [locationData?.items]);
	const plantItems = useMemo(() => plantData?.items ?? [], [plantData?.items]);

	const spatialNodesQuery = useQuery({
		...queryKeys.spatial.allNodes,
		placeholderData: (previous) => previous,
	});
	const spatialNodes = useMemo(() => spatialNodesQuery.data?.items ?? [], [spatialNodesQuery.data]);
	const rootSpatialNode = useMemo(() => {
		if (!rootLocation) return null;
		return (
			spatialNodes.find(
				(n) => n.ref.entity === "location" && String(n.ref.entityId) === String(rootLocation.id),
			) ?? null
		);
	}, [rootLocation, spatialNodes]);
	const { data: spatialTree } = useQuery({
		...queryKeys.spatial.tree((rootSpatialNode?.id ?? "") as SpatialNodeEntityId),
		enabled: rootSpatialNode !== null,
		placeholderData: (previous) => previous,
	});
	const [createLocationState, setCreateLocationState] = useState<{
		open: boolean;
		placement: PendingCreationPlacement | null;
	}>({ open: false, placement: null });
	const [createPlantState, setCreatePlantState] = useState<{
		open: boolean;
		placement: PendingCreationPlacement | null;
	}>({ open: false, placement: null });
	const [addExistingContainerState, setAddExistingContainerState] = useState<AddExistingState>({
		open: false,
		parentId: "",
		selectedId: "",
	});
	const [addExistingItemState, setAddExistingItemState] = useState<AddExistingState>({
		open: false,
		parentId: "",
		selectedId: "",
	});
	const [contextEditPlantId, setContextEditPlantId] = useState<string | null>(null);
	const [contextEditLocationId, setContextEditLocationId] = useState<string | null>(null);
	const [gardeningEventCreateOpen, setGardeningEventCreateOpen] = useState(false);
	const [gardeningEventCreateInitial, setGardeningEventCreateInitial] = useState<
		GardeningEventCreateDialogInitialValues | undefined
	>(undefined);
	const [pendingExistingPlacement, setPendingExistingPlacement] = useState<PendingExistingPlacement | null>(null);
	const [duplicateLocationContext, setDuplicateLocationContext] = useState<{
		duplicate: LayoutNode;
		source: LocationEntity;
	} | null>(null);
	const [duplicatePlantContext, setDuplicatePlantContext] = useState<{
		duplicate: LayoutNode;
		source: HydratedPlantEntity;
	} | null>(null);
	const [createManyLocationsForm, setCreateManyLocationsForm] = useState<{
		parent: LayoutNode;
		nodes: LayoutNode[];
	} | null>(null);
	const [createManyPlantsForm, setCreateManyPlantsForm] = useState<{
		parent: LayoutNode;
		nodes: LayoutNode[];
	} | null>(null);
	const rootNodeInitRequestedRef = useRef<string | null>(null);
	const spatialRoot = useMemo(() => {
		if (!rootLocation || !spatialTree) return null;
		return spatialToLayoutNode({
			spatial: spatialTree,
			entity: { type: "location", value: rootLocation },
		});
	}, [rootLocation, spatialTree]);

	const layoutNodes: LayoutNode[] = useMemo(() => {
		if (!spatialTree) return [];
		const locById = new Map(locationItems.map((l) => [String(l.id), l]));
		const plantById = new Map(plantItems.map((p) => [String(p.id), p]));
		const out: LayoutNode[] = [];
		const walk = (node: SpatialNodeTreeNode) => {
			if (String(node.id) !== String(spatialTree.id)) {
				const entity =
					node.ref.entity === "location"
						? (() => {
								const loc = locById.get(String(node.ref.entityId));
								return loc ? ({ type: "location" as const, value: loc } as const) : null;
							})()
						: (() => {
								const plant = plantById.get(String(node.ref.entityId));
								return plant ? ({ type: "plant" as const, value: plant } as const) : null;
							})();
				out.push(spatialToLayoutNode({ spatial: node, entity }));
			}
			for (const child of node.children) walk(child);
		};
		walk(spatialTree as SpatialNodeTreeNode);
		return out;
	}, [locationItems, plantItems, spatialTree]);
	const highlightNodeId = useMemo(() => {
		if (!highlightLocationEntityId) return null;
		const node = layoutNodes.find(
			(item) => item.nodeType === "location" && String(item.ref.entityId) === String(highlightLocationEntityId),
		);
		return node ? String(node.id) : null;
	}, [highlightLocationEntityId, layoutNodes]);

	const subtreeSpatialNodeIds = useMemo(() => {
		const ids = new Set<string>();
		if (!spatialTree) return ids;
		const walk = (node: SpatialNodeTreeNode) => {
			ids.add(String(node.id));
			for (const child of node.children) walk(child);
		};
		walk(spatialTree as SpatialNodeTreeNode);
		return ids;
	}, [spatialTree]);

	const existingContainerOptions: AddExistingOption[] = useMemo(() => {
		const result: AddExistingOption[] = [];
		for (const location of locationItems) {
			if (String(location.id) === String(rootLocation?.id ?? "")) continue;
			const status = getSpatialPlacementStatusByRef(spatialNodes, {
				entity: "location",
				entityId: String(location.id),
			});
			// With a bound node: reparent subtree into this layout. No node yet: create/bind on confirm.
			// If the node has a parent elsewhere, detach it on that layout first.
			if (status.node) {
				if (spatialNodeHasParent(status.node)) continue;
				if (subtreeSpatialNodeIds.has(String(status.node.id))) continue;
			}
			const existingNode = status.node
				? spatialToLayoutNode({
						spatial: status.node,
						entity: { type: "location", value: location },
					})
				: null;
			result.push({
				id: String(location.id),
				label: location.name,
				presentation: location.presentation,
				nodeType: "location" as const,
				existingNode,
			});
		}
		return result;
	}, [locationItems, rootLocation?.id, spatialNodes, subtreeSpatialNodeIds]);

	const existingItemOptions: AddExistingOption[] = useMemo(() => {
		const result: AddExistingOption[] = [];
		for (const plant of plantItems) {
			const status = getSpatialPlacementStatusByRef(spatialNodes, {
				entity: "plant",
				entityId: String(plant.id),
			});
			if (spatialNodeHasParent(status.node)) continue;
			if (status.node && subtreeSpatialNodeIds.has(String(status.node.id))) continue;
			const existingNode = status.node
				? spatialToLayoutNode({
						spatial: status.node,
						entity: { type: "plant", value: plant },
					})
				: null;
			result.push({
				id: String(plant.id),
				label: plant.title ?? plant.cultivar.characteristics.name,
				presentation: plant.cultivar.presentation,
				nodeType: "plant" as const,
				existingNode,
			});
		}
		return result;
	}, [plantItems, spatialNodes, subtreeSpatialNodeIds]);

	const applySpatialLayoutOperationsMutation = useSpatialLayoutApplyOperationsMutation();
	const spatialNodeCreateMutation = useSpatialNodeCreateMutation();

	useEffect(() => {
		if (!rootLocation) return;
		if (rootSpatialNode) return;
		if (spatialNodesQuery.isPending) return;
		const rootId = String(rootLocation.id);
		if (rootNodeInitRequestedRef.current === rootId) return;
		rootNodeInitRequestedRef.current = rootId;
		void spatialNodeCreateMutation
			.mutateAsync({
				parentId: null,
				kind: "frame",
				ref: { entity: "location", entityId: rootId },
				rect: { x: 0, y: 0, width: 640, height: 480 },
			})
			.catch(() => {
				rootNodeInitRequestedRef.current = null;
			});
	}, [rootLocation, rootSpatialNode, spatialNodeCreateMutation, spatialNodesQuery.isPending]);

	const onApplyOperations = useCallback(
		async (input: { operations: readonly SpatialLayoutOperation<LayoutNode>[] }): Promise<void> => {
			const operations = input.operations as readonly SpatialLayoutOperation<SpatialLayoutNode>[];
			const shouldRetargetUrlToRoot =
				rootLocation &&
				urlFocusLocationId &&
				String(urlFocusLocationId) !== String(rootLocation.id) &&
				focusedLocationWasRemovedFromLayout(
					flattenSpatialLayoutOperations(operations),
					String(urlFocusLocationId),
				);
			// Navigate before persisting so the route matches the canvas root before spatial data refetches (avoids a flash / double navigation).
			if (shouldRetargetUrlToRoot) {
				void navigate({
					to: "/location/$locationId/layout",
					params: { locationId: String(rootLocation.id) },
					replace: true,
				});
			}
			await applySpatialLayoutOperationsMutation.mutateAsync({ operations });
		},
		[applySpatialLayoutOperationsMutation, navigate, rootLocation, urlFocusLocationId],
	);

	const applyHistoryOperations = useCallback(
		async (ops: readonly SpatialLayoutOperation<SpatialLayoutNode>[]) => {
			await onApplyOperations({
				operations: ops as readonly SpatialLayoutOperation<LayoutNode>[],
			});
		},
		[onApplyOperations],
	);

	const layoutEditorHistory = useMemo((): SpatialLayoutEditorHistoryOptions => {
		if (!rootLocation) return { enabled: false };
		return {
			enabled: true,
			storageKey: `gardening:spatial-layout-history:${rootLocation.id}`,
		};
	}, [rootLocation]);
	const layoutHistoryApi = useSpatialLayoutHistory({
		enabled: layoutEditorHistory.enabled,
		storageKey: layoutEditorHistory.enabled ? layoutEditorHistory.storageKey : "",
		maxEntries: layoutEditorHistory.enabled ? layoutEditorHistory.maxEntries : undefined,
		applyOperations: applyHistoryOperations,
	});

	const layoutEditorClassNames = useMemo(
		() => ({
			root: className,
			viewport: "min-h-full",
			nodeHighlight: "ring-4 ring-amber-400/80 animate-pulse",
		}),
		[className],
	);

	const commitCreatedNode = useCallback(
		(input: {
			id: string;
			parentId: string | null;
			rect: { x: number; y: number; width: number; height: number };
			label: string;
			nodeType: LayoutNodeType;
			ref: { entity: "location" | "plant"; entityId: string };
		}) => {
			layoutHistoryApi.commit([
				{
					type: "createNode",
					id: String(input.id),
					after: {
						id: String(input.id),
						parentId: input.parentId,
						geometry: input.rect,
						acceptsChildren: input.nodeType === "location",
						nodeType: input.nodeType,
						label: input.label,
						spatialRef: input.ref,
					},
				},
			]);
		},
		[layoutHistoryApi],
	);

	const getCreateOptions = useCallback(
		(parent: LayoutNode): SpatialLayoutCreateOption<LayoutNode>[] =>
			parent.acceptsChildren
				? [
						{
							id: "location",
							label: m["components.locationLayoutEditor.newLocationLabel"](),
							createNode: (targetParent) => ({
								id: `pending-location-${Date.now()}`,
								parentId: String(targetParent.id),
								geometry: { x: 0, y: 0, width: 80, height: 80 },
								acceptsChildren: true,
								nodeType: "location",
								label: m["components.locationLayoutEditor.newLocationLabel"](),
								ref: { entity: "location", entityId: "" },
							}),
						},
						{
							id: "plant",
							label: m["components.locationLayoutEditor.newPlantLabel"](),
							createNode: (targetParent) => ({
								id: `pending-plant-${Date.now()}`,
								parentId: String(targetParent.id),
								geometry: { x: 0, y: 0, width: 40, height: 40 },
								acceptsChildren: false,
								nodeType: "plant",
								label: m["components.locationLayoutEditor.newPlantLabel"](),
								ref: { entity: "plant", entityId: "" },
							}),
						},
					]
				: [],
		[],
	);

	const onCreatePlacementConfirm = useCallback(
		({ optionId, node }: { optionId: string; node: LayoutNode; parent: LayoutNode }) => {
			if (optionId === "location") {
				setCreateLocationState({
					open: true,
					placement: { kind: "location", node },
				});
				return;
			}
			setCreatePlantState({
				open: true,
				placement: { kind: "plant", node },
			});
		},
		[],
	);

	const onDuplicateNodePlacementConfirm = useCallback(
		({ sourceNode, duplicateNode }: { sourceNode: LayoutNode; duplicateNode: LayoutNode }) => {
			if (sourceNode.nodeType === "location") {
				const loc = locationItems.find((l) => String(l.id) === String(sourceNode.ref.entityId));
				if (!loc) return;
				setDuplicateLocationContext({ duplicate: duplicateNode, source: loc });
				return;
			}
			const plant = plantItems.find((p) => String(p.id) === String(sourceNode.ref.entityId));
			if (!plant) return;
			setDuplicatePlantContext({ duplicate: duplicateNode, source: plant });
		},
		[locationItems, plantItems],
	);

	const onCreateManyPlacementConfirm = useCallback(
		({ parent, optionId, nodes }: { parent: LayoutNode; optionId: string; nodes: readonly LayoutNode[] }) => {
			const drafts = [...nodes];
			if (optionId === "location") {
				setCreateManyLocationsForm({ parent, nodes: drafts });
				return;
			}
			if (optionId === "plant") {
				setCreateManyPlantsForm({ parent, nodes: drafts });
			}
		},
		[],
	);

	const placementOnChange = useCallback((next: LayoutNode) => {
		setPendingExistingPlacement((prev) => (prev ? { ...prev, node: next } : prev));
	}, []);

	const placementOnCancel = useCallback(() => setPendingExistingPlacement(null), []);

	const placementOnConfirm = useCallback(
		async (node: LayoutNode) => {
			if (pendingExistingPlacement?.createIfMissing) {
				const created = await spatialNodeCreateMutation.mutateAsync({
					parentId: (node.parentId as SpatialNodeEntityId | null) ?? null,
					kind: node.acceptsChildren ? "frame" : "leaf",
					ref: {
						entity: node.ref.entity,
						entityId: node.ref.entityId,
					},
					rect: {
						x: node.geometry.x,
						y: node.geometry.y,
						width: node.geometry.width,
						height: node.geometry.height,
					},
				});
				commitCreatedNode({
					id: String(created.id),
					parentId: created.parentId ? String(created.parentId) : null,
					rect: created.rect,
					label: node.label,
					nodeType: node.nodeType,
					ref: created.ref,
				});
				setPendingExistingPlacement(null);
				return;
			}
			const original = pendingExistingPlacement?.originalNode;
			const beforeNode = original ?? node;
			const snap: SpatialLayoutNodeSnapshot = {
				id: node.id,
				parentId: node.parentId,
				geometry: node.geometry,
				nodeType: node.nodeType,
				acceptsChildren: node.acceptsChildren,
				label: node.label,
			};

			const before: SpatialLayoutNodeSnapshot = {
				id: beforeNode.id,
				parentId: beforeNode.parentId,
				geometry: beforeNode.geometry,
				nodeType: beforeNode.nodeType,
				acceptsChildren: beforeNode.acceptsChildren,
				label: beforeNode.label,
			};
			const reparentOp: SpatialLayoutOperation<LayoutNode> = {
				type: "reparentNode",
				id: String(node.id),
				before,
				after: snap,
			};
			await onApplyOperations({
				operations: [reparentOp],
			});
			// Reparenting an existing bound node is not recorded by the editor’s placement wrapper:
			// the node is already in `effectiveNodes` with its final parent/geometry before `onConfirm`,
			// so before/after snapshots there match and no entry is pushed. Commit the durable op here.
			layoutHistoryApi.commit([reparentOp as SpatialLayoutOperation<SpatialLayoutNode>]);

			setPendingExistingPlacement(null);
		},
		[commitCreatedNode, layoutHistoryApi, onApplyOperations, pendingExistingPlacement, spatialNodeCreateMutation],
	);

	const placementCandidate = useMemo((): SpatialLayoutPlacementCandidate<LayoutNode> | null => {
		if (!pendingExistingPlacement) return null;
		return {
			node: pendingExistingPlacement.node,
			companionDraftNodes: pendingExistingPlacement.companionDraftNodes,
			onChange: placementOnChange,
			onCancel: placementOnCancel,
			onConfirm: placementOnConfirm,
		};
	}, [pendingExistingPlacement, placementOnChange, placementOnCancel, placementOnConfirm]);

	const submitAddExistingContainer = useCallback(async () => {
		const selected = existingContainerOptions.find((row) => row.id === addExistingContainerState.selectedId);
		if (!selected) return;
		const baseNode: LayoutNode =
			selected.existingNode ??
			({
				id: `pending-existing-location-${selected.id}-${Date.now()}`,
				parentId: addExistingContainerState.parentId,
				geometry: { x: 0, y: 0, width: 80, height: 80 },
				acceptsChildren: true,
				nodeType: "location",
				label: selected.label,
				presentation: selected.presentation,
				ref: { entity: "location", entityId: selected.id },
			} satisfies LayoutNode);
		const companionDraftNodes =
			selected.existingNode && selected.nodeType === "location"
				? collectDescendantLayoutNodesForSpatialRoot({
						spatialItems: spatialNodes,
						rootSpatialId: String(selected.existingNode.id),
						locationItems,
						plantItems,
					})
				: [];

		setPendingExistingPlacement({
			node: {
				...baseNode,
				parentId: addExistingContainerState.parentId,
				geometry: {
					x: 0,
					y: 0,
					width: baseNode.geometry.width,
					height: baseNode.geometry.height,
				},
			},
			originalNode: selected.existingNode,
			createIfMissing: selected.existingNode === null,
			companionDraftNodes: companionDraftNodes.length > 0 ? companionDraftNodes : undefined,
		});
		setAddExistingContainerState((prev) => ({ ...prev, open: false }));
	}, [
		addExistingContainerState.parentId,
		addExistingContainerState.selectedId,
		existingContainerOptions,
		locationItems,
		plantItems,
		spatialNodes,
	]);

	const submitAddExistingItem = useCallback(async () => {
		const selected = existingItemOptions.find((row) => row.id === addExistingItemState.selectedId);
		if (!selected) return;
		const baseNode: LayoutNode =
			selected.existingNode ??
			({
				id: `pending-existing-plant-${selected.id}-${Date.now()}`,
				parentId: addExistingItemState.parentId,
				geometry: { x: 0, y: 0, width: 40, height: 40 },
				acceptsChildren: false,
				nodeType: "plant",
				label: selected.label,
				presentation: selected.presentation,
				ref: { entity: "plant", entityId: selected.id },
			} satisfies LayoutNode);
		setPendingExistingPlacement({
			node: {
				...baseNode,
				parentId: addExistingItemState.parentId,
				geometry: {
					x: 0,
					y: 0,
					width: baseNode.geometry.width,
					height: baseNode.geometry.height,
				},
			},
			originalNode: selected.existingNode,
			createIfMissing: selected.existingNode === null,
		});
		setAddExistingItemState((prev) => ({ ...prev, open: false }));
	}, [addExistingItemState.parentId, addExistingItemState.selectedId, existingItemOptions]);

	const comboboxLayoutLabel = useCallback((item: AddExistingOption) => item.label, []);
	const comboboxLayoutValue = useCallback((item: AddExistingOption) => item.id, []);
	const comboboxLayoutEqual = useCallback((a: AddExistingOption, b: AddExistingOption) => a.id === b.id, []);

	const createManyLocationSiblingNames = useMemo(() => {
		return [];
	}, []);

	const createManyPlantSiblingTitles = useMemo(() => {
		return [];
	}, []);

	const renderNodeContent = useCallback((node: LayoutNode) => {
		return (
			<>
				{node.presentation?.backgroundColor ? (
					<div
						aria-hidden
						className="pointer-events-none absolute inset-0"
						style={{ backgroundColor: node.presentation.backgroundColor }}
					/>
				) : null}
				<span className="pointer-events-none absolute -top-5 left-1/2 max-w-[calc(140%-8px)] -translate-x-1/2 truncate rounded bg-background/80 px-[2px] py-0.5 text-[10px] leading-tight">
					{node.label}
				</span>
				{node.nodeType === "plant" ? (
					<div className="pointer-events-none absolute inset-0 grid place-items-center">
						<ItemPresentationIcon presentation={node.presentation} className="size-6 border-none" />
					</div>
				) : null}
			</>
		);
	}, []);

	const renderNodeContextActions = useCallback(
		(node: LayoutNode): SpatialLayoutNodeContextActionSlices | null => {
			const entityId = node.ref.entityId.trim();
			const hasPersistedEntity = entityId !== "" && (node.nodeType === "plant" || node.nodeType === "location");

			const layoutSlice = node.acceptsChildren ? (
				<ContextMenuSub>
					<ContextMenuSubTrigger>
						{m["components.locationLayoutEditor.addExistingMenu"]()}
					</ContextMenuSubTrigger>
					<ContextMenuSubContent>
						<ContextMenuGroup>
							<ContextMenuItem
								onClick={() =>
									setAddExistingContainerState({
										open: true,
										parentId: node.id,
										selectedId: "",
									})
								}
							>
								{m["components.locationLayoutEditor.addExistingLocationMenu"]()}
							</ContextMenuItem>
							<ContextMenuItem
								onClick={() =>
									setAddExistingItemState({
										open: true,
										parentId: node.id,
										selectedId: "",
									})
								}
							>
								{m["components.locationLayoutEditor.addExistingPlantMenu"]()}
							</ContextMenuItem>
						</ContextMenuGroup>
					</ContextMenuSubContent>
				</ContextMenuSub>
			) : undefined;

			const otherSlice = hasPersistedEntity ? (
				<ContextMenuGroup>
					<ContextMenuItem
						onClick={() => {
							if (node.ref.entity === "plant") {
								void navigate({ to: "/plant/$plantId", params: { plantId: entityId } });
							} else {
								void navigate({ to: "/location/$locationId", params: { locationId: entityId } });
							}
						}}
					>
						{m["common.open"]()}
					</ContextMenuItem>
					<ContextMenuItem
						onClick={() => {
							if (node.ref.entity === "plant") {
								if (plantItems.some((p) => String(p.id) === entityId)) {
									setContextEditPlantId(entityId);
								}
							} else if (locationItems.some((l) => String(l.id) === entityId)) {
								setContextEditLocationId(entityId);
							}
						}}
					>
						{m["common.edit"]()}
					</ContextMenuItem>
					<ContextMenuItem
						onClick={() => {
							if (node.ref.entity === "plant") {
								if (!plantItems.some((p) => String(p.id) === entityId)) return;
								setGardeningEventCreateInitial({
									target: "plants",
									plantIds: [entityId as PlantEntityId],
								});
							} else {
								if (!locationItems.some((l) => String(l.id) === entityId)) return;
								setGardeningEventCreateInitial({
									target: "location",
									locationId: entityId as LocationEntityId,
								});
							}
							setGardeningEventCreateOpen(true);
						}}
					>
						{m["components.locationLayoutEditor.addEventMenu"]()}
					</ContextMenuItem>
				</ContextMenuGroup>
			) : null;

			if (!layoutSlice && !otherSlice) return null;

			return {
				...(layoutSlice ? { layout: layoutSlice } : {}),
				...(otherSlice ? { other: otherSlice } : {}),
			};
		},
		[locationItems, navigate, plantItems, t],
	);

	if (!rootLocation) return null;
	if (!rootSpatialNode || !spatialTree || !spatialRoot) {
		return <div className="text-sm text-muted-foreground">{m["common.loading"]()}</div>;
	}

	return (
		<>
			<SpatialLayoutEditor
				gridStep={10}
				history={layoutEditorHistory}
				layoutHistory={layoutHistoryApi}
				classNames={layoutEditorClassNames}
				labels={spatialLayoutLabels}
				root={spatialRoot}
				nodes={layoutNodes}
				onApplyOperations={onApplyOperations}
				renderNodeContent={renderNodeContent}
				renderNodeContextActions={renderNodeContextActions}
				getCreateOptions={getCreateOptions}
				onCreatePlacementConfirm={onCreatePlacementConfirm}
				onDuplicateNodePlacementConfirm={onDuplicateNodePlacementConfirm}
				onCreateManyPlacementConfirm={onCreateManyPlacementConfirm}
				placementCandidate={placementCandidate}
				highlightNodeId={highlightNodeId}
				onErrorMessage={(message) => window.alert(message)}
			/>

			<LocationCreateDialog
				open={createLocationState.open}
				onOpenChange={(open) => setCreateLocationState((s) => ({ ...s, open }))}
				initialPlacement={
					createLocationState.placement
						? {
								parentSpatialNodeId: createLocationState.placement.node
									.parentId as unknown as SpatialNodeEntityId | null,
								...createLocationState.placement.node.geometry,
							}
						: undefined
				}
				onSpatialNodeCreated={(node) =>
					commitCreatedNode({ ...node, nodeType: "location", label: node.label || "Location" })
				}
			/>

			<PlantCreateDialog
				open={createPlantState.open}
				onOpenChange={(open) => setCreatePlantState((s) => ({ ...s, open }))}
				initialPlacement={
					createPlantState.placement
						? {
								parentSpatialNodeId: createPlantState.placement.node
									.parentId as unknown as SpatialNodeEntityId | null,
								...createPlantState.placement.node.geometry,
							}
						: undefined
				}
				onSpatialNodeCreated={(node) =>
					commitCreatedNode({ ...node, nodeType: "plant", label: node.label || "Plant" })
				}
			/>

			{duplicateLocationContext ? (
				<LocationCreateDialog
					open
					onOpenChange={(open) => {
						if (!open) setDuplicateLocationContext(null);
					}}
					initialName={duplicateLocationContext.duplicate.label}
					initialPresentationFields={{
						iconKey: duplicateLocationContext.source.presentation?.iconKey
							? String(duplicateLocationContext.source.presentation.iconKey)
							: SELECT_NONE,
						iconColor: duplicateLocationContext.source.presentation?.iconColor ?? "",
						backgroundColor: duplicateLocationContext.source.presentation?.backgroundColor ?? "",
					}}
					initialPlacement={{
						parentSpatialNodeId: duplicateLocationContext.duplicate
							.parentId as unknown as SpatialNodeEntityId | null,
						...duplicateLocationContext.duplicate.geometry,
					}}
					onSpatialNodeCreated={(node) =>
						commitCreatedNode({
							...node,
							nodeType: "location",
							label: node.label || duplicateLocationContext.duplicate.label || "Location",
						})
					}
				/>
			) : null}

			{duplicatePlantContext ? (
				<PlantCreateDialog
					open
					onOpenChange={(open) => {
						if (!open) setDuplicatePlantContext(null);
					}}
					initialTitle={duplicatePlantContext.duplicate.label}
					defaultCultivarId={duplicatePlantContext.source.cultivarId}
					initialDescription={duplicatePlantContext.source.description}
					initialPlacement={{
						parentSpatialNodeId: duplicatePlantContext.duplicate
							.parentId as unknown as SpatialNodeEntityId | null,
						...duplicatePlantContext.duplicate.geometry,
					}}
					onSpatialNodeCreated={(node) =>
						commitCreatedNode({
							...node,
							nodeType: "plant",
							label: node.label || duplicatePlantContext.duplicate.label || "Plant",
						})
					}
				/>
			) : null}

			{createManyLocationsForm ? (
				<LocationCreateManyDialog
					open
					parentSpatialNodeId={createManyLocationsForm.parent.id as unknown as SpatialNodeEntityId}
					nodes={createManyLocationsForm.nodes}
					existingSiblingNames={createManyLocationSiblingNames}
					onOpenChange={(open) => {
						if (!open) setCreateManyLocationsForm(null);
					}}
					onSpatialNodeCreated={(node) =>
						commitCreatedNode({ ...node, nodeType: "location", label: node.label || "Location" })
					}
				/>
			) : null}

			{createManyPlantsForm ? (
				<PlantCreateManyDialog
					open
					parentSpatialNodeId={createManyPlantsForm.parent.id as unknown as SpatialNodeEntityId}
					nodes={createManyPlantsForm.nodes}
					existingSiblingTitles={createManyPlantSiblingTitles}
					onOpenChange={(open) => {
						if (!open) setCreateManyPlantsForm(null);
					}}
					onSpatialNodeCreated={(node) =>
						commitCreatedNode({ ...node, nodeType: "plant", label: node.label || "Plant" })
					}
				/>
			) : null}

			<Dialog
				open={addExistingContainerState.open}
				onOpenChange={(open) => setAddExistingContainerState((prev) => ({ ...prev, open }))}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{m["components.locationLayoutEditor.dialogAddExistingLocation"]()}</DialogTitle>
					</DialogHeader>
					<Combobox
						name="existing-location"
						items={existingContainerOptions}
						value={
							existingContainerOptions.find((row) => row.id === addExistingContainerState.selectedId) ??
							null
						}
						onValueChange={(item) =>
							setAddExistingContainerState((prev) => ({
								...prev,
								selectedId: item ? item.id : "",
							}))
						}
						itemToStringLabel={comboboxLayoutLabel}
						itemToStringValue={comboboxLayoutValue}
						isItemEqualToValue={comboboxLayoutEqual}
					>
						<ComboboxInput
							placeholder={m["components.locationLayoutEditor.searchLocationsPlaceholder"]()}
							showClear
						/>
						<ComboboxContent className="z-100">
							<ComboboxEmpty>{m["components.locationLayoutEditor.noLocationsAvailable"]()}</ComboboxEmpty>
							<ComboboxList>
								{(item) => (
									<ComboboxItem key={item.id} value={item}>
										<span className="min-w-0 flex-1 truncate">{item.label}</span>
									</ComboboxItem>
								)}
							</ComboboxList>
						</ComboboxContent>
					</Combobox>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setAddExistingContainerState((prev) => ({ ...prev, open: false }))}
						>
							{m["common.cancel"]()}
						</Button>
						<Button
							disabled={!addExistingContainerState.selectedId}
							onClick={() => void submitAddExistingContainer()}
						>
							{m["common.add"]()}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={addExistingItemState.open}
				onOpenChange={(open) => setAddExistingItemState((prev) => ({ ...prev, open }))}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{m["components.locationLayoutEditor.dialogAddExistingPlant"]()}</DialogTitle>
					</DialogHeader>
					<Combobox
						name="existing-plant"
						items={existingItemOptions}
						value={existingItemOptions.find((item) => item.id === addExistingItemState.selectedId) ?? null}
						onValueChange={(item) =>
							setAddExistingItemState((prev) => ({
								...prev,
								selectedId: item ? item.id : "",
							}))
						}
						itemToStringLabel={comboboxLayoutLabel}
						itemToStringValue={comboboxLayoutValue}
						isItemEqualToValue={comboboxLayoutEqual}
					>
						<ComboboxInput
							placeholder={m["components.locationLayoutEditor.searchPlantsPlaceholder"]()}
							showClear
						/>
						<ComboboxContent className="z-100">
							<ComboboxEmpty>{m["components.locationLayoutEditor.noPlantsAvailable"]()}</ComboboxEmpty>
							<ComboboxList>
								{(item) => (
									<ComboboxItem key={item.id} value={item}>
										<ItemPresentationIcon presentation={item.presentation} />
										<span className="min-w-0 flex-1 truncate">{item.label}</span>
									</ComboboxItem>
								)}
							</ComboboxList>
						</ComboboxContent>
					</Combobox>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setAddExistingItemState((prev) => ({ ...prev, open: false }))}
						>
							{m["common.cancel"]()}
						</Button>
						<Button
							disabled={!addExistingItemState.selectedId}
							onClick={() => void submitAddExistingItem()}
						>
							{m["common.add"]()}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{contextEditPlantId
				? (() => {
						const plant = plantItems.find((p) => String(p.id) === contextEditPlantId);
						if (!plant) return null;
						return (
							<PlantUpdateDialog
								plant={plant}
								open
								onOpenChange={(open) => {
									if (!open) setContextEditPlantId(null);
								}}
							/>
						);
					})()
				: null}
			{contextEditLocationId
				? (() => {
						const location = locationItems.find((l) => String(l.id) === contextEditLocationId);
						if (!location) return null;
						return (
							<LocationUpdateDialog
								location={location}
								open
								onOpenChange={(open) => {
									if (!open) setContextEditLocationId(null);
								}}
							/>
						);
					})()
				: null}

			<GardeningEventCreateDialog
				open={gardeningEventCreateOpen}
				onOpenChange={(open) => {
					setGardeningEventCreateOpen(open);
					if (!open) setGardeningEventCreateInitial(undefined);
				}}
				initialValues={gardeningEventCreateInitial}
			/>
		</>
	);
}
