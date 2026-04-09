import * as m from "@/paraglide/messages.js";
import type { SpeciesWithSystemCatalog } from "@backend/core/application/use-cases/gardening/species.crud-use-cases";
import type { CultivarEntity, HydratedPlantEntity } from "@backend/core/domain/gardening/entities";
import type { SpatialNodeEntity, SpatialNodeTreeNode } from "@backend/core/domain/spatial/entities";
import type { ItemsContainer } from "@backend/shared/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/orpc/client";

import {
	appendManyToItemsContainer,
	appendToItemsContainer,
	removeFromItemsContainer,
	removeManyFromItemsContainer,
	upsertInItemsContainer,
} from "@/store/cache-utils";
import { queryKeys } from "@/store/keys";
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
): HydratedPlantEntity["cultivar"] | null {
	const cultivar = queryClient
		.getQueryData<ItemsContainer<CultivarEntity>>(queryKeys.cultivar.all.queryKey)
		?.items.find((c) => String(c.id) === String(cultivarId));
	if (!cultivar) return null;
	const species = queryClient
		.getQueryData<ItemsContainer<SpeciesWithSystemCatalog>>(queryKeys.species.all.queryKey)
		?.items.find((s) => String(s.id) === String(cultivar.speciesId));
	if (!species) return null;
	return { ...cultivar, species };
}

export function usePlantCreateMutation() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.plant.create.mutationOptions({
			onMutate: async (variables) => {
				await cancelQueriesByKeys(queryClient, [queryKeys.plant.all.queryKey]);
				const snapshots = snapshotQueries(queryClient, [queryKeys.plant.all.queryKey]);
				const cultivar = getHydratedCultivar(queryClient, String(variables.cultivarId));
				if (!cultivar) return { snapshots };
				const pendingId = makePendingId("plant");
				const pending: HydratedPlantEntity = {
					id: pendingId as HydratedPlantEntity["id"],
					title: variables.title ?? null,
					description: variables.description ?? null,
					cultivarId: variables.cultivarId as HydratedPlantEntity["cultivarId"],
					cultivar,
					createdAt: new Date(),
					updatedAt: new Date(),
				};
				queryClient.setQueryData<ItemsContainer<HydratedPlantEntity>>(queryKeys.plant.all.queryKey, (prev) =>
					appendToItemsContainer(prev, pending),
				);
				queryClient.setQueryData(queryKeys.plant.detail(pending.id).queryKey, pending);
				return { snapshots, pendingIds: [pendingId] };
			},
			onError: (_e, _vars, ctx) => {
				if (!ctx) return;
				restoreQuerySnapshots(queryClient, ctx.snapshots);
				for (const pendingId of ctx.pendingIds ?? []) {
					queryClient.setQueryData(
						queryKeys.plant.detail(pendingId as HydratedPlantEntity["id"]).queryKey,
						undefined,
					);
				}
				// TODO: Translate backend error details/codes instead of generic messages.
				toast.error(m.collections_plant_actionError());
			},
			onSuccess: (entity, _vars, ctx) => {
				if (ctx?.pendingIds?.[0]) {
					const pendingId = ctx.pendingIds[0];
					queryClient.setQueryData<ItemsContainer<HydratedPlantEntity>>(
						queryKeys.plant.all.queryKey,
						(prev) => replacePendingInItemsContainer(prev, pendingId as HydratedPlantEntity["id"], entity),
					);
					queryClient.setQueryData(
						queryKeys.plant.detail(pendingId as HydratedPlantEntity["id"]).queryKey,
						undefined,
					);
				} else {
					queryClient.setQueryData<ItemsContainer<HydratedPlantEntity>>(
						queryKeys.plant.all.queryKey,
						(prev) => replacePendingInItemsContainer(prev, entity.id, entity),
					);
				}
				queryClient.setQueryData(queryKeys.plant.detail(entity.id).queryKey, entity);
				toast.success(m.collections_plant_createSuccess());
			},
		}),
	);
}

export function usePlantCreateManyMutation() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.plant.createMany.mutationOptions({
			onMutate: async (variables) => {
				await cancelQueriesByKeys(queryClient, [queryKeys.plant.all.queryKey]);
				const snapshots = snapshotQueries(queryClient, [queryKeys.plant.all.queryKey]);
				const pendingItems: HydratedPlantEntity[] = [];
				for (let i = 0; i < variables.rows.length; i++) {
					const row = variables.rows[i];
					const cultivar = getHydratedCultivar(queryClient, String(row.cultivarId));
					if (!cultivar) continue;
					const pendingId = makePendingId(`plant-many-${i}`);
					pendingItems.push({
						id: pendingId as HydratedPlantEntity["id"],
						title: row.title ?? null,
						description: row.description ?? null,
						cultivarId: row.cultivarId as HydratedPlantEntity["cultivarId"],
						cultivar,
						createdAt: new Date(),
						updatedAt: new Date(),
					});
				}
				if (pendingItems.length > 0) {
					queryClient.setQueryData<ItemsContainer<HydratedPlantEntity>>(
						queryKeys.plant.all.queryKey,
						(prev) => appendManyToItemsContainer(prev, pendingItems),
					);
				}
				return { snapshots, pendingIds: pendingItems.map((p) => String(p.id)) };
			},
			onError: (_e, _vars, ctx) => {
				if (!ctx) return;
				restoreQuerySnapshots(queryClient, ctx.snapshots);
				// TODO: Translate backend error details/codes instead of generic messages.
				toast.error(m.collections_plant_actionError());
			},
			onSuccess: (container, _vars, ctx) => {
				if (ctx?.pendingIds?.length) {
					queryClient.setQueryData<ItemsContainer<HydratedPlantEntity>>(
						queryKeys.plant.all.queryKey,
						(prev) => dropPendingManyInItemsContainer(prev, ctx.pendingIds ?? []),
					);
				}
				queryClient.setQueryData<ItemsContainer<HydratedPlantEntity>>(queryKeys.plant.all.queryKey, (prev) =>
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
				const snapshots = snapshotQueries(queryClient, [
					queryKeys.plant.all.queryKey,
					queryKeys.plant.detail(variables.id).queryKey,
				]);
				const previousAll = snapshots[0]?.data as ItemsContainer<HydratedPlantEntity> | undefined;
				const previousDetail = snapshots[1]?.data as HydratedPlantEntity | undefined;
				const existing =
					previousDetail ??
					previousAll?.items.find((item) => String(item.id) === String(variables.id)) ??
					null;
				if (existing) {
					const cultivar =
						variables.cultivarId !== undefined
							? getHydratedCultivar(queryClient, String(variables.cultivarId))
							: existing.cultivar;
					const optimistic: HydratedPlantEntity = {
						...existing,
						...variables,
						id: existing.id,
						cultivarId: (variables.cultivarId ?? existing.cultivarId) as HydratedPlantEntity["cultivarId"],
						cultivar: cultivar ?? existing.cultivar,
						updatedAt: new Date(),
					};
					queryClient.setQueryData<ItemsContainer<HydratedPlantEntity>>(
						queryKeys.plant.all.queryKey,
						(prev) => upsertInItemsContainer(prev, optimistic),
					);
					queryClient.setQueryData(queryKeys.plant.detail(variables.id).queryKey, optimistic);
				}
				return { snapshots };
			},
			onError: (_e, variables, ctx) => {
				if (!ctx) return;
				void variables;
				restoreQuerySnapshots(queryClient, ctx.snapshots);
				// TODO: Translate backend error details/codes instead of generic messages.
				toast.error(m.collections_plant_actionError());
			},
			onSuccess: (entity) => {
				queryClient.setQueryData<ItemsContainer<HydratedPlantEntity>>(queryKeys.plant.all.queryKey, (prev) =>
					upsertInItemsContainer(prev, entity),
				);
				queryClient.setQueryData(queryKeys.plant.detail(entity.id).queryKey, entity);
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
					queryKeys.plant.detail(variables.id).queryKey,
					queryKeys.spatial.allNodes.queryKey,
				]);
				queryClient.setQueryData<ItemsContainer<HydratedPlantEntity>>(queryKeys.plant.all.queryKey, (prev) =>
					removeFromItemsContainer(prev, variables.id),
				);
				queryClient.setQueryData(queryKeys.plant.detail(variables.id).queryKey, undefined);
				const previousSpatial = snapshots[2]?.data as ItemsContainer<SpatialNodeEntity> | undefined;
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
			onError: (_e, variables, ctx) => {
				if (!ctx) return;
				void variables;
				restoreQuerySnapshots(queryClient, ctx.snapshots);
				if (ctx.treeQueries) {
					for (const [key, value] of ctx.treeQueries) {
						queryClient.setQueryData(key, value);
					}
				}
				// TODO: Translate backend error details/codes instead of generic messages.
				toast.error(m.collections_plant_actionError());
			},
			onSuccess: (deletedId) => {
				queryClient.setQueryData<ItemsContainer<HydratedPlantEntity>>(queryKeys.plant.all.queryKey, (prev) =>
					dropPendingInItemsContainer(prev, deletedId),
				);
				void queryClient.invalidateQueries({
					queryKey: queryKeys.gardeningEvent.forPlant(deletedId).queryKey,
				});
				queryClient.setQueryData(queryKeys.plant.detail(deletedId).queryKey, undefined);
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
					...variables.ids.map((id: string) => queryKeys.plant.detail(id).queryKey),
				]);
				queryClient.setQueryData<ItemsContainer<HydratedPlantEntity>>(
					queryKeys.plant.all.queryKey,
					(prev) => removeManyFromItemsContainer(prev, variables.ids) ?? { items: [] },
				);
				for (const id of variables.ids) {
					queryClient.setQueryData(queryKeys.plant.detail(id).queryKey, undefined);
				}
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
			onError: (_e, variables, ctx) => {
				if (!ctx) return;
				void variables;
				restoreQuerySnapshots(queryClient, ctx.snapshots);
				if (ctx.treeQueries) {
					for (const [key, value] of ctx.treeQueries) {
						queryClient.setQueryData(key, value);
					}
				}
				// TODO: Translate backend error details/codes instead of generic messages.
				toast.error(m.collections_plant_actionError());
			},
			onSuccess: (result) => {
				queryClient.setQueryData<ItemsContainer<HydratedPlantEntity>>(queryKeys.plant.all.queryKey, (prev) =>
					dropPendingManyInItemsContainer(prev, result.deletedIds),
				);
				for (const deletedId of result.deletedIds) {
					void queryClient.invalidateQueries({
						queryKey: queryKeys.gardeningEvent.forPlant(deletedId).queryKey,
					});
					queryClient.setQueryData(queryKeys.plant.detail(deletedId).queryKey, undefined);
				}
				toast.success(m.collections_plant_deleteManySuccess());
			},
		}),
	);
}
