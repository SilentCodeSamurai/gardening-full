import * as m from "@/paraglide/messages.js";
import type {
	CultivarEntity,
	CultivarEntityId,
	HydratedPlantEntity,
	SpeciesEntity,
	SpeciesEntityId,
} from "@backend/core/domain/gardening/entities";
import type { ItemsContainer } from "@backend/shared/types";
import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/orpc/client";

import { appendToItemsContainer, removeFromItemsContainer, upsertInItemsContainer } from "@/store/cache-utils";
import { queryKeys } from "@/store/keys";
import {
	cancelQueriesByKeys,
	dropPendingInItemsContainer,
	makePendingId,
	replacePendingInItemsContainer,
	restoreQuerySnapshots,
	snapshotQueries,
} from "./optimistic";

async function refreshCultivarFullByIdIfCached(queryClient: QueryClient, id: CultivarEntityId): Promise<void> {
	const fullKey = queryKeys.cultivar.fullById(id).queryKey;
	if (queryClient.getQueryData(fullKey) === undefined) return;
	const full = await orpc.cultivar.getFullById.call({ id });
	queryClient.setQueryData(fullKey, full);
}

export function useCultivarCreateMutation() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.cultivar.create.mutationOptions({
			onMutate: async (variables) => {
				await cancelQueriesByKeys(queryClient, [queryKeys.cultivar.all.queryKey]);
				const snapshots = snapshotQueries(queryClient, [queryKeys.cultivar.all.queryKey]);
				const pendingId = makePendingId("cultivar") as CultivarEntity["id"];
				const pending: CultivarEntity = {
					id: pendingId,
					speciesId: variables.speciesId as SpeciesEntityId,
					characteristics: variables.characteristics,
					presentation: variables.presentation,
					createdAt: new Date(),
					updatedAt: new Date(),
				};
				queryClient.setQueryData<ItemsContainer<CultivarEntity>>(queryKeys.cultivar.all.queryKey, (prev) =>
					appendToItemsContainer(prev, pending),
				);
				queryClient.setQueryData(queryKeys.cultivar.detail(pending.id).queryKey, pending);
				return { snapshots, pendingId };
			},
			onError: (_e, _vars, ctx) => {
				if (!ctx) return;
				restoreQuerySnapshots(queryClient, ctx.snapshots);
				// TODO: Translate backend error details/codes instead of generic messages.
				toast.error(m["collections.cultivar.actionError"]());
			},
			onSuccess: async (entity, _vars, ctx) => {
				if (ctx?.pendingId) {
					queryClient.setQueryData<ItemsContainer<CultivarEntity>>(queryKeys.cultivar.all.queryKey, (prev) =>
						replacePendingInItemsContainer(prev, ctx.pendingId as CultivarEntityId, entity),
					);
					queryClient.setQueryData(
						queryKeys.cultivar.detail(ctx.pendingId as CultivarEntity["id"]).queryKey,
						undefined,
					);
				} else {
					queryClient.setQueryData<ItemsContainer<CultivarEntity>>(queryKeys.cultivar.all.queryKey, (prev) =>
						replacePendingInItemsContainer(prev, entity.id, entity),
					);
				}
				queryClient.setQueryData(queryKeys.cultivar.detail(entity.id).queryKey, entity);
				await refreshCultivarFullByIdIfCached(queryClient, entity.id);
				toast.success(m["collections.cultivar.createSuccess"]());
			},
		}),
	);
}

export function useCultivarUpdateMutation() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.cultivar.update.mutationOptions({
			onMutate: async (variables) => {
				await cancelQueriesByKeys(queryClient, [queryKeys.cultivar.all.queryKey]);
				const snapshots = snapshotQueries(queryClient, [
					queryKeys.cultivar.all.queryKey,
					queryKeys.cultivar.detail(variables.id).queryKey,
				]);
				const previousAll = snapshots[0]?.data as ItemsContainer<CultivarEntity> | undefined;
				const previousDetail = snapshots[1]?.data as CultivarEntity | undefined;
				const base =
					previousDetail ??
					previousAll?.items.find((item) => String(item.id) === String(variables.id)) ??
					null;
				if (base) {
					const optimistic: CultivarEntity = {
						...base,
						...variables,
						id: base.id,
						speciesId: (variables.speciesId ?? base.speciesId) as CultivarEntity["speciesId"],
						updatedAt: new Date(),
					};
					queryClient.setQueryData<ItemsContainer<CultivarEntity>>(queryKeys.cultivar.all.queryKey, (prev) =>
						upsertInItemsContainer(prev, optimistic),
					);
					queryClient.setQueryData(queryKeys.cultivar.detail(variables.id).queryKey, optimistic);
				}
				return { snapshots };
			},
			onError: (_e, variables, ctx) => {
				if (!ctx) return;
				void variables;
				restoreQuerySnapshots(queryClient, ctx.snapshots);
				// TODO: Translate backend error details/codes instead of generic messages.
				toast.error(m["collections.cultivar.actionError"]());
			},
			onSuccess: async (entity) => {
				queryClient.setQueryData<ItemsContainer<CultivarEntity>>(queryKeys.cultivar.all.queryKey, (prev) =>
					upsertInItemsContainer(prev, entity),
				);
				queryClient.setQueryData(queryKeys.cultivar.detail(entity.id).queryKey, entity);
				queryClient.setQueryData<ItemsContainer<HydratedPlantEntity>>(queryKeys.plant.all.queryKey, (prev) => {
					if (!prev) return prev;
					const speciesById = new Map<string, SpeciesEntity>(
						(
							queryClient.getQueryData<ItemsContainer<SpeciesEntity>>(queryKeys.species.all.queryKey)
								?.items ?? []
						).map((species) => [String(species.id), species] as const),
					);
					return {
						...prev,
						items: prev.items.map((plant) => {
							if (String(plant.cultivar.id) !== String(entity.id)) return plant;
							const nextSpecies = speciesById.get(String(entity.speciesId)) ?? plant.cultivar.species;
							return {
								...plant,
								cultivar: {
									...entity,
									species: nextSpecies,
								},
							};
						}),
					};
				});
				await refreshCultivarFullByIdIfCached(queryClient, entity.id);
				toast.success(m["collections.cultivar.updateSuccess"]());
			},
		}),
	);
}

export function useCultivarDeleteMutation() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.cultivar.delete.mutationOptions({
			onMutate: async (variables) => {
				await cancelQueriesByKeys(queryClient, [queryKeys.cultivar.all.queryKey]);
				const snapshots = snapshotQueries(queryClient, [
					queryKeys.cultivar.all.queryKey,
					queryKeys.cultivar.detail(variables.id).queryKey,
				]);
				queryClient.setQueryData<ItemsContainer<CultivarEntity>>(queryKeys.cultivar.all.queryKey, (prev) =>
					removeFromItemsContainer(prev, variables.id),
				);
				queryClient.setQueryData(queryKeys.cultivar.detail(variables.id).queryKey, undefined);
				queryClient.setQueryData(queryKeys.cultivar.fullById(variables.id).queryKey, undefined);
				return { snapshots };
			},
			onError: (_e, variables, ctx) => {
				if (!ctx) return;
				void variables;
				restoreQuerySnapshots(queryClient, ctx.snapshots);
				// TODO: Translate backend error details/codes instead of generic messages.
				toast.error(m["collections.cultivar.actionError"]());
			},
			onSuccess: (deletedId) => {
				queryClient.setQueryData<ItemsContainer<CultivarEntity>>(queryKeys.cultivar.all.queryKey, (prev) =>
					dropPendingInItemsContainer(prev, deletedId),
				);
				queryClient.setQueryData(queryKeys.cultivar.detail(deletedId).queryKey, undefined);
				queryClient.setQueryData(queryKeys.cultivar.fullById(deletedId).queryKey, undefined);
				toast.success(m["collections.cultivar.deleteSuccess"]());
			},
		}),
	);
}
