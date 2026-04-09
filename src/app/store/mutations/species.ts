import type { PlantHydratedWithCatalogSpecies } from "@backend/core/application/use-cases/gardening/plant.use-cases";
import type { SpeciesWithSystemCatalog } from "@backend/core/application/use-cases/gardening/species.crud-use-cases";
import type { ItemsContainer } from "@backend/shared/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/orpc/client";
import * as m from "@/paraglide/messages.js";

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

export function useSpeciesCreateMutation() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.species.create.mutationOptions({
			onMutate: async (variables) => {
				await cancelQueriesByKeys(queryClient, [queryKeys.species.all.queryKey]);
				const snapshots = snapshotQueries(queryClient, [queryKeys.species.all.queryKey]);
				const pendingId = makePendingId("species") as SpeciesWithSystemCatalog["id"];
				const pending: SpeciesWithSystemCatalog = {
					id: pendingId,
					categoryId: variables.categoryId as SpeciesWithSystemCatalog["categoryId"],
					characteristics: variables.characteristics,
					systemCatalog: false,
					presentation: variables.presentation,
					createdAt: new Date(),
					updatedAt: new Date(),
				};
				queryClient.setQueryData<ItemsContainer<SpeciesWithSystemCatalog>>(
					queryKeys.species.all.queryKey,
					(prev) => appendToItemsContainer(prev, pending),
				);
				queryClient.setQueryData(queryKeys.species.detail(pending.id).queryKey, pending);
				return { snapshots, pendingId };
			},
			onError: (_e, _vars, ctx) => {
				if (!ctx) return;
				restoreQuerySnapshots(queryClient, ctx.snapshots);
				// TODO: Translate backend error details/codes instead of generic messages.
				toast.error(m.collections_species_actionError());
			},
			onSuccess: (entity, _vars, ctx) => {
				if (ctx?.pendingId) {
					const pendingId = ctx.pendingId as SpeciesWithSystemCatalog["id"];
					queryClient.setQueryData<ItemsContainer<SpeciesWithSystemCatalog>>(
						queryKeys.species.all.queryKey,
						(prev) => replacePendingInItemsContainer(prev, pendingId, entity),
					);
					queryClient.setQueryData(queryKeys.species.detail(pendingId).queryKey, undefined);
				} else {
					queryClient.setQueryData<ItemsContainer<SpeciesWithSystemCatalog>>(
						queryKeys.species.all.queryKey,
						(prev) => replacePendingInItemsContainer(prev, entity.id, entity),
					);
				}
				queryClient.setQueryData(queryKeys.species.detail(entity.id).queryKey, entity);
				toast.success(m.collections_species_createSuccess());
			},
		}),
	);
}

export function useSpeciesUpdateMutation() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.species.update.mutationOptions({
			onMutate: async (variables) => {
				await cancelQueriesByKeys(queryClient, [queryKeys.species.all.queryKey]);
				const snapshots = snapshotQueries(queryClient, [
					queryKeys.species.all.queryKey,
					queryKeys.species.detail(variables.id).queryKey,
				]);
				const previousAll = snapshots[0]?.data as ItemsContainer<SpeciesWithSystemCatalog> | undefined;
				const previousDetail = snapshots[1]?.data as SpeciesWithSystemCatalog | undefined;
				const base =
					previousDetail ??
					previousAll?.items.find((item) => String(item.id) === String(variables.id)) ??
					null;
				if (base) {
					const optimistic: SpeciesWithSystemCatalog = {
						...base,
						...variables,
						id: base.id,
						categoryId: (variables.categoryId ?? base.categoryId) as SpeciesWithSystemCatalog["categoryId"],
						updatedAt: new Date(),
					};
					queryClient.setQueryData<ItemsContainer<SpeciesWithSystemCatalog>>(
						queryKeys.species.all.queryKey,
						(prev) => upsertInItemsContainer(prev, optimistic),
					);
					queryClient.setQueryData(queryKeys.species.detail(variables.id).queryKey, optimistic);
				}
				return { snapshots };
			},
			onError: (_e, variables, ctx) => {
				if (!ctx) return;
				void variables;
				restoreQuerySnapshots(queryClient, ctx.snapshots);
				// TODO: Translate backend error details/codes instead of generic messages.
				toast.error(m.collections_species_actionError());
			},
			onSuccess: (entity) => {
				queryClient.setQueryData<ItemsContainer<SpeciesWithSystemCatalog>>(
					queryKeys.species.all.queryKey,
					(prev) => upsertInItemsContainer(prev, entity),
				);
				queryClient.setQueryData(queryKeys.species.detail(entity.id).queryKey, entity);
				queryClient.setQueryData<ItemsContainer<PlantHydratedWithCatalogSpecies>>(
					queryKeys.plant.all.queryKey,
					(prev) => {
						if (!prev) return prev;
						return {
							...prev,
							items: prev.items.map((plant) =>
								String(plant.cultivar.species.id) === String(entity.id)
									? {
											...plant,
											cultivar: {
												...plant.cultivar,
												species: entity,
											},
										}
									: plant,
							),
						};
					},
				);
				toast.success(m.collections_species_updateSuccess());
			},
		}),
	);
}

export function useSpeciesDeleteMutation() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.species.delete.mutationOptions({
			onMutate: async (variables) => {
				await cancelQueriesByKeys(queryClient, [queryKeys.species.all.queryKey]);
				const snapshots = snapshotQueries(queryClient, [
					queryKeys.species.all.queryKey,
					queryKeys.species.detail(variables.id).queryKey,
				]);
				queryClient.setQueryData<ItemsContainer<SpeciesWithSystemCatalog>>(
					queryKeys.species.all.queryKey,
					(prev) => removeFromItemsContainer(prev, variables.id),
				);
				queryClient.setQueryData(queryKeys.species.detail(variables.id).queryKey, undefined);
				return { snapshots };
			},
			onError: (_e, variables, ctx) => {
				if (!ctx) return;
				void variables;
				restoreQuerySnapshots(queryClient, ctx.snapshots);
				// TODO: Translate backend error details/codes instead of generic messages.
				toast.error(m.collections_species_actionError());
			},
			onSuccess: (deletedId) => {
				queryClient.setQueryData<ItemsContainer<SpeciesWithSystemCatalog>>(
					queryKeys.species.all.queryKey,
					(prev) => dropPendingInItemsContainer(prev, deletedId),
				);
				queryClient.setQueryData(queryKeys.species.detail(deletedId).queryKey, undefined);
				toast.success(m.collections_species_deleteSuccess());
			},
		}),
	);
}
