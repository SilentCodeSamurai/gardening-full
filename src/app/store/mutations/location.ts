import type { LocationEntity } from "@backend/core/domain/gardening/entities";
import type { SpatialNodeEntity, SpatialNodeTreeNode } from "@backend/core/domain/spatial/entities";
import type { ItemsContainer } from "@backend/shared/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/orpc/client";
import * as m from "@/paraglide/messages.js";

import {
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

export function useLocationCreateMutation() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.location.create.mutationOptions({
			onMutate: async (variables) => {
				await cancelQueriesByKeys(queryClient, [queryKeys.location.all.queryKey]);
				const pendingId = makePendingId("location");
				const pending: LocationEntity = {
					id: pendingId as LocationEntity["id"],
					name: variables.name,
					presentation: variables.presentation,
					createdAt: new Date(),
					updatedAt: new Date(),
				};
				const snapshots = snapshotQueries(queryClient, [queryKeys.location.all.queryKey]);
				queryClient.setQueryData<ItemsContainer<LocationEntity>>(queryKeys.location.all.queryKey, (prev) =>
					appendToItemsContainer(prev, pending),
				);
				queryClient.setQueryData(queryKeys.location.detail(pending.id).queryKey, pending);
				return { snapshots, pendingId };
			},
			onError: (_e, _vars, ctx) => {
				if (!ctx) return;
				restoreQuerySnapshots(queryClient, ctx.snapshots);
				if (ctx.pendingId) {
					queryClient.setQueryData(
						queryKeys.location.detail(ctx.pendingId as LocationEntity["id"]).queryKey,
						undefined,
					);
				}
				// TODO: Translate backend error details/codes instead of generic messages.
				toast.error(m["collections.location.actionError"]());
			},
			onSuccess: (entity, _vars, ctx) => {
				if (ctx?.pendingId) {
					queryClient.setQueryData<ItemsContainer<LocationEntity>>(queryKeys.location.all.queryKey, (prev) =>
						replacePendingInItemsContainer(prev, ctx.pendingId as LocationEntity["id"], entity),
					);
					queryClient.setQueryData(
						queryKeys.location.detail(ctx.pendingId as LocationEntity["id"]).queryKey,
						undefined,
					);
				} else {
					queryClient.setQueryData<ItemsContainer<LocationEntity>>(queryKeys.location.all.queryKey, (prev) =>
						replacePendingInItemsContainer(prev, entity.id, entity),
					);
				}
				queryClient.setQueryData(queryKeys.location.detail(entity.id).queryKey, entity);
				toast.success(m["collections.location.createSuccess"]());
			},
		}),
	);
}

export function useLocationUpdateMutation() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.location.update.mutationOptions({
			onMutate: async (variables) => {
				await cancelQueriesByKeys(queryClient, [queryKeys.location.all.queryKey]);
				const snapshots = snapshotQueries(queryClient, [
					queryKeys.location.all.queryKey,
					queryKeys.location.detail(variables.id).queryKey,
				]);
				const previousAll = snapshots[0]?.data as ItemsContainer<LocationEntity> | undefined;
				const previousDetail = snapshots[1]?.data as LocationEntity | undefined;
				const base =
					previousDetail ??
					previousAll?.items.find((item) => String(item.id) === String(variables.id)) ??
					null;
				if (base) {
					const optimistic: LocationEntity = {
						...base,
						...variables,
						id: base.id,
						updatedAt: new Date(),
					};
					queryClient.setQueryData<ItemsContainer<LocationEntity>>(queryKeys.location.all.queryKey, (prev) =>
						upsertInItemsContainer(prev, optimistic),
					);
					queryClient.setQueryData(queryKeys.location.detail(variables.id).queryKey, optimistic);
				}
				return { snapshots };
			},
			onError: (_e, variables, ctx) => {
				if (!ctx) return;
				void variables;
				restoreQuerySnapshots(queryClient, ctx.snapshots);
				// TODO: Translate backend error details/codes instead of generic messages.
				toast.error(m["collections.location.actionError"]());
			},
			onSuccess: (entity) => {
				queryClient.setQueryData<ItemsContainer<LocationEntity>>(queryKeys.location.all.queryKey, (prev) =>
					upsertInItemsContainer(prev, entity),
				);
				queryClient.setQueryData(queryKeys.location.detail(entity.id).queryKey, entity);
				toast.success(m["collections.location.updateSuccess"]());
			},
		}),
	);
}

export function useLocationDeleteMutation() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.location.delete.mutationOptions({
			onMutate: async (variables) => {
				await cancelQueriesByKeys(queryClient, [
					queryKeys.location.all.queryKey,
					queryKeys.spatial.allNodes.queryKey,
				]);
				await queryClient.cancelQueries({ queryKey: queryKeys.spatial.tree._def });
				const treeQueries = queryClient.getQueriesData<SpatialNodeTreeNode>({
					queryKey: queryKeys.spatial.tree._def,
				});
				const snapshots = snapshotQueries(queryClient, [
					queryKeys.location.all.queryKey,
					queryKeys.location.detail(variables.id).queryKey,
					queryKeys.spatial.allNodes.queryKey,
				]);
				queryClient.setQueryData<ItemsContainer<LocationEntity>>(queryKeys.location.all.queryKey, (prev) =>
					removeFromItemsContainer(prev, variables.id),
				);
				queryClient.setQueryData(queryKeys.location.detail(variables.id).queryKey, undefined);
				const previousSpatial = snapshots[2]?.data as ItemsContainer<SpatialNodeEntity> | undefined;
				if (previousSpatial) {
					const placement = getSpatialPlacementStatusByRef(previousSpatial.items, {
						entity: "location",
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
				toast.error(m["collections.location.actionError"]());
			},
			onSuccess: (deletedId) => {
				queryClient.setQueryData<ItemsContainer<LocationEntity>>(queryKeys.location.all.queryKey, (prev) =>
					dropPendingInItemsContainer(prev, deletedId),
				);
				queryClient.setQueryData(queryKeys.location.detail(deletedId).queryKey, undefined);
				toast.success(m["collections.location.deleteSuccess"]());
			},
		}),
	);
}

export function useLocationDeleteManyMutation() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.location.deleteMany.mutationOptions({
			onMutate: async (variables) => {
				await cancelQueriesByKeys(queryClient, [
					queryKeys.location.all.queryKey,
					queryKeys.spatial.allNodes.queryKey,
				]);
				await queryClient.cancelQueries({ queryKey: queryKeys.spatial.tree._def });
				const treeQueries = queryClient.getQueriesData<SpatialNodeTreeNode>({
					queryKey: queryKeys.spatial.tree._def,
				});
				const snapshots = snapshotQueries(queryClient, [
					queryKeys.location.all.queryKey,
					queryKeys.spatial.allNodes.queryKey,
					...variables.ids.map((id: string) => queryKeys.location.detail(id).queryKey),
				]);
				queryClient.setQueryData<ItemsContainer<LocationEntity>>(
					queryKeys.location.all.queryKey,
					(prev) => removeManyFromItemsContainer(prev, variables.ids) ?? { items: [] },
				);
				for (const id of variables.ids) {
					queryClient.setQueryData(queryKeys.location.detail(id).queryKey, undefined);
				}
				const previousSpatial = snapshots[1]?.data as ItemsContainer<SpatialNodeEntity> | undefined;
				if (previousSpatial) {
					const nodeIdsToDrop = new Set<string>();
					for (const id of variables.ids) {
						const placement = getSpatialPlacementStatusByRef(previousSpatial.items, {
							entity: "location",
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
				toast.error(m["collections.location.actionError"]());
			},
			onSuccess: (result) => {
				queryClient.setQueryData<ItemsContainer<LocationEntity>>(queryKeys.location.all.queryKey, (prev) =>
					dropPendingManyInItemsContainer(prev, result.deletedIds),
				);
				for (const deletedId of result.deletedIds) {
					void queryClient.invalidateQueries({
						queryKey: queryKeys.gardeningEvent.forLocation(deletedId).queryKey,
					});
					queryClient.setQueryData(queryKeys.location.detail(deletedId).queryKey, undefined);
				}
				toast.success(m["collections.location.deleteManySuccess"]());
			},
		}),
	);
}
