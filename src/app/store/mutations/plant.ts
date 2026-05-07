import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import type { HydratedCultivarEntity, HydratedPlantEntity } from "@backend/core/domain/gardening/entities";
import type { SpatialNodeEntity, SpatialNodeTreeNode } from "@backend/core/domain/spatial/entities";
import type { ItemsContainer } from "@backend/shared/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { renderError } from "@/lib/render-error";
import { orpc } from "@/orpc/client";
import * as m from "@/paraglide/messages.js";

import { useActiveWorkspaceKey } from "@/store/active-workspace-key";
import {
	appendManyToItemsContainer,
	appendToItemsContainer,
	removeFromItemsContainer,
	removeManyFromItemsContainer,
	upsertInItemsContainer,
} from "@/store/cache-utils";
import { queryKeys } from "@/store/keys";
import type {
	CachedCultivarList,
	CachedHydratedPlant,
	CachedHydratedPlantList,
	CachedSpeciesList,
} from "@/store/query-cache-types";
import { isQueryObjectPending, markQueryObjectPending, QUERY_OBJECT_PENDING } from "@/store/query-object-status";
import { getSpatialPlacementStatusByRef } from "@/store/spatial-placement";
import {
	cancelQueriesByKeys,
	dropPendingInItemsContainer,
	dropPendingManyInItemsContainer,
	makePendingId,
	replacePendingInItemsContainer,
	restoreQuerySnapshots,
	snapshotQueries,
} from "./optimistic";
import { setSpatialItemsAndRebuildTrees } from "./spatial-delete-plan";

function getHydratedCultivar(
	queryClient: ReturnType<typeof useQueryClient>,
	cultivarId: string,
): HydratedCultivarEntity | null {
	const cultivar = queryClient
		.getQueryData<CachedCultivarList>(queryKeys.cultivar.all.queryKey)
		?.items.find((c) => String(c.id) === String(cultivarId));
	if (!cultivar) return null;
	if (cultivar.speciesId === null) {
		return { ...cultivar, species: null };
	}
	const species = queryClient
		.getQueryData<CachedSpeciesList>(queryKeys.species.all.queryKey)
		?.items.find((s) => String(s.id) === String(cultivar.speciesId));
	return { ...cultivar, species: species ?? null };
}

export function usePlantCreateMutation() {
	const queryClient = useQueryClient();
	const workspaceKey = useActiveWorkspaceKey();

	return useMutation(
		orpc.plant.create.mutationOptions({
			onMutate: async (variables) => {
				await cancelQueriesByKeys(queryClient, [queryKeys.plant.all.queryKey]);
				const snapshots = snapshotQueries(queryClient, [queryKeys.plant.all.queryKey]);
				if (!workspaceKey) return { snapshots };
				const cultivar =
					variables.cultivarId === null
						? null
						: getHydratedCultivar(queryClient, String(variables.cultivarId));
				const pendingId = makePendingId("plant");
				const pending: CachedHydratedPlant = {
					workspace: WorkspaceVO.fromKey(workspaceKey),
					id: pendingId as HydratedPlantEntity["id"],
					title: variables.title ?? null,
					description: variables.description ?? null,
					cultivarId: variables.cultivarId as HydratedPlantEntity["cultivarId"],
					presentation: variables.presentation,
					cultivar,
					createdAt: new Date(),
					updatedAt: new Date(),
					objectStatus: QUERY_OBJECT_PENDING,
				};
				queryClient.setQueryData<CachedHydratedPlantList>(queryKeys.plant.all.queryKey, (prev) =>
					appendToItemsContainer(prev, pending),
				);
				return { snapshots, pendingIds: [pendingId] };
			},
			onError: (error, _vars, ctx) => {
				if (!ctx) return;
				restoreQuerySnapshots(queryClient, ctx.snapshots);
				toast.error(renderError(error, m.collections_plant_actionError()));
			},
			onSuccess: (entity, _vars, ctx) => {
				if (ctx?.pendingIds?.[0]) {
					const pendingId = ctx.pendingIds[0];
					queryClient.setQueryData<CachedHydratedPlantList>(queryKeys.plant.all.queryKey, (prev) =>
						replacePendingInItemsContainer(prev, pendingId as HydratedPlantEntity["id"], entity),
					);
				} else {
					queryClient.setQueryData<CachedHydratedPlantList>(queryKeys.plant.all.queryKey, (prev) =>
						replacePendingInItemsContainer(prev, entity.id, entity),
					);
				}
				toast.success(m.collections_plant_createSuccess());
			},
		}),
	);
}

export function usePlantCreateManyMutation() {
	const queryClient = useQueryClient();
	const workspaceKey = useActiveWorkspaceKey();

	return useMutation(
		orpc.plant.createMany.mutationOptions({
			onMutate: async (variables) => {
				await cancelQueriesByKeys(queryClient, [queryKeys.plant.all.queryKey]);
				const snapshots = snapshotQueries(queryClient, [queryKeys.plant.all.queryKey]);
				const pendingItems: CachedHydratedPlant[] = [];
				if (!workspaceKey) return { snapshots, pendingIds: [] as string[] };
				for (let i = 0; i < variables.rows.length; i++) {
					const row = variables.rows[i];
					const cultivar =
						row.cultivarId === null ? null : getHydratedCultivar(queryClient, String(row.cultivarId));
					const pendingId = makePendingId(`plant-many-${i}`);
					pendingItems.push({
						workspace: WorkspaceVO.fromKey(workspaceKey),
						id: pendingId as HydratedPlantEntity["id"],
						title: row.title ?? null,
						description: row.description ?? null,
						cultivarId: row.cultivarId as HydratedPlantEntity["cultivarId"],
						presentation: row.presentation,
						cultivar,
						createdAt: new Date(),
						updatedAt: new Date(),
						objectStatus: QUERY_OBJECT_PENDING,
					});
				}
				if (pendingItems.length > 0) {
					queryClient.setQueryData<CachedHydratedPlantList>(queryKeys.plant.all.queryKey, (prev) =>
						appendManyToItemsContainer(prev, pendingItems),
					);
				}
				return { snapshots, pendingIds: pendingItems.map((p) => String(p.id)) };
			},
			onError: (error, _vars, ctx) => {
				if (!ctx) return;
				restoreQuerySnapshots(queryClient, ctx.snapshots);
				toast.error(renderError(error, m.collections_plant_actionError()));
			},
			onSuccess: (container, _vars, ctx) => {
				if (ctx?.pendingIds?.length) {
					queryClient.setQueryData<CachedHydratedPlantList>(queryKeys.plant.all.queryKey, (prev) =>
						dropPendingManyInItemsContainer(prev, ctx.pendingIds ?? []),
					);
				}
				queryClient.setQueryData<CachedHydratedPlantList>(queryKeys.plant.all.queryKey, (prev) =>
					appendManyToItemsContainer(prev, container.items),
				);
				toast.success(m.collections_plant_createManySuccess());
			},
		}),
	);
}

export function usePlantUpdateMutation() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.plant.update.mutationOptions({
			onMutate: async (variables) => {
				await cancelQueriesByKeys(queryClient, [queryKeys.plant.all.queryKey]);
				const snapshots = snapshotQueries(queryClient, [queryKeys.plant.all.queryKey]);
				const previousAll = snapshots[0]?.data as CachedHydratedPlantList | undefined;
				const existing =
					previousAll?.items.find((item) => String(item.id) === String(variables.id)) ?? null;
				if (existing && !isQueryObjectPending(existing)) {
					const nextCultivar =
						variables.cultivarId === undefined
							? existing.cultivar
							: variables.cultivarId === null
								? null
								: (getHydratedCultivar(queryClient, String(variables.cultivarId)) ?? null);
					const optimistic = markQueryObjectPending({
						...existing,
						...variables,
						id: existing.id,
						cultivarId: (variables.cultivarId ?? existing.cultivarId) as HydratedPlantEntity["cultivarId"],
						cultivar: nextCultivar,
						updatedAt: new Date(),
					});
					queryClient.setQueryData<CachedHydratedPlantList>(queryKeys.plant.all.queryKey, (prev) =>
						upsertInItemsContainer(prev, optimistic),
					);
				}
				return { snapshots };
			},
			onError: (error, variables, ctx) => {
				if (!ctx) return;
				void variables;
				restoreQuerySnapshots(queryClient, ctx.snapshots);
				toast.error(renderError(error, m.collections_plant_actionError()));
			},
			onSuccess: (entity) => {
				queryClient.setQueryData<CachedHydratedPlantList>(queryKeys.plant.all.queryKey, (prev) =>
					upsertInItemsContainer(prev, entity),
				);
				toast.success(m.collections_plant_updateSuccess());
			},
		}),
	);
}

export function usePlantDeleteMutation() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.plant.delete.mutationOptions({
			onMutate: async (variables) => {
				await cancelQueriesByKeys(queryClient, [
					queryKeys.plant.all.queryKey,
					queryKeys.spatial.allNodes.queryKey,
				]);
				await queryClient.cancelQueries({ queryKey: queryKeys.spatial.tree._def });
				const treeQueries = queryClient.getQueriesData<SpatialNodeTreeNode>({
					queryKey: queryKeys.spatial.tree._def,
				});
				const snapshots = snapshotQueries(queryClient, [
					queryKeys.plant.all.queryKey,
					queryKeys.spatial.allNodes.queryKey,
				]);
				const previousAll = snapshots[0]?.data as CachedHydratedPlantList | undefined;
				const row = previousAll?.items.find((item) => String(item.id) === String(variables.id));
				if (isQueryObjectPending(row)) return { snapshots, treeQueries };
				queryClient.setQueryData<CachedHydratedPlantList>(queryKeys.plant.all.queryKey, (prev) =>
					removeFromItemsContainer(prev, variables.id),
				);
				const previousSpatial = snapshots[1]?.data as ItemsContainer<SpatialNodeEntity> | undefined;
				if (previousSpatial) {
					const placement = getSpatialPlacementStatusByRef(previousSpatial.items, {
						entity: "plant",
						entityId: String(variables.id),
					});
					const nextSpatialItems = previousSpatial.items.filter(
						(item) => String(item.id) !== String(placement.node?.id ?? ""),
					);
					setSpatialItemsAndRebuildTrees(queryClient, nextSpatialItems);
				}
				return { snapshots, treeQueries };
			},
			onError: (error, variables, ctx) => {
				if (!ctx) return;
				void variables;
				restoreQuerySnapshots(queryClient, ctx.snapshots);
				if (ctx.treeQueries) {
					for (const [key, value] of ctx.treeQueries) {
						queryClient.setQueryData(key, value);
					}
				}
				toast.error(renderError(error, m.collections_plant_actionError()));
			},
			onSuccess: (deletedId) => {
				queryClient.setQueryData<CachedHydratedPlantList>(queryKeys.plant.all.queryKey, (prev) =>
					dropPendingInItemsContainer(prev, deletedId),
				);
				void queryClient.invalidateQueries({
					queryKey: queryKeys.gardeningEvent.forPlant(deletedId).queryKey,
				});
				toast.success(m.collections_plant_deleteSuccess());
			},
		}),
	);
}

export function usePlantDeleteManyMutation() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.plant.deleteMany.mutationOptions({
			onMutate: async (variables) => {
				await cancelQueriesByKeys(queryClient, [
					queryKeys.plant.all.queryKey,
					queryKeys.spatial.allNodes.queryKey,
				]);
				await queryClient.cancelQueries({ queryKey: queryKeys.spatial.tree._def });
				const treeQueries = queryClient.getQueriesData<SpatialNodeTreeNode>({
					queryKey: queryKeys.spatial.tree._def,
				});
				const snapshots = snapshotQueries(queryClient, [
					queryKeys.plant.all.queryKey,
					queryKeys.spatial.allNodes.queryKey,
				]);
				queryClient.setQueryData<CachedHydratedPlantList>(
					queryKeys.plant.all.queryKey,
					(prev) => removeManyFromItemsContainer(prev, variables.ids) ?? { items: [] },
				);
				const previousSpatial = snapshots[1]?.data as ItemsContainer<SpatialNodeEntity> | undefined;
				if (previousSpatial) {
					const nodeIdsToDrop = new Set<string>();
					for (const id of variables.ids) {
						const placement = getSpatialPlacementStatusByRef(previousSpatial.items, {
							entity: "plant",
							entityId: String(id),
						});
						if (placement.node) nodeIdsToDrop.add(String(placement.node.id));
					}
					const nextSpatialItems = previousSpatial.items.filter(
						(item) => !nodeIdsToDrop.has(String(item.id)),
					);
					setSpatialItemsAndRebuildTrees(queryClient, nextSpatialItems);
				}
				return { snapshots, treeQueries };
			},
			onError: (error, variables, ctx) => {
				if (!ctx) return;
				void variables;
				restoreQuerySnapshots(queryClient, ctx.snapshots);
				if (ctx.treeQueries) {
					for (const [key, value] of ctx.treeQueries) {
						queryClient.setQueryData(key, value);
					}
				}
				toast.error(renderError(error, m.collections_plant_actionError()));
			},
			onSuccess: (result) => {
				queryClient.setQueryData<CachedHydratedPlantList>(queryKeys.plant.all.queryKey, (prev) =>
					dropPendingManyInItemsContainer(prev, result.deletedIds),
				);
				for (const deletedId of result.deletedIds) {
					void queryClient.invalidateQueries({
						queryKey: queryKeys.gardeningEvent.forPlant(deletedId).queryKey,
					});
				}
				toast.success(m.collections_plant_deleteManySuccess());
			},
		}),
	);
}
