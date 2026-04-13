import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { SpeciesWithSystemCatalog } from "#/backend/core/application/use-cases/gardening/species.use-cases";
import { orpc } from "@/orpc/client";
import * as m from "@/paraglide/messages.js";
import { renderError } from "@/lib/render-error";

import { useActiveWorkspaceKey } from "@/store/active-workspace-key";
import { appendToItemsContainer, removeFromItemsContainer, upsertInItemsContainer } from "@/store/cache-utils";
import { queryKeys } from "@/store/keys";
import type {
	CachedPlantHydratedWithCatalogSpecies,
	CachedPlantHydratedWithCatalogSpeciesList,
	CachedSpeciesList,
	CachedSpeciesWithSystemCatalog,
} from "@/store/query-cache-types";
import { isQueryObjectPending, markQueryObjectPending, QUERY_OBJECT_PENDING } from "@/store/query-object-status";
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
	const workspaceKey = useActiveWorkspaceKey();

	return useMutation(
		orpc.species.create.mutationOptions({
			onMutate: async (variables) => {
				await cancelQueriesByKeys(queryClient, [queryKeys.species.all.queryKey]);
				const snapshots = snapshotQueries(queryClient, [queryKeys.species.all.queryKey]);
				if (!workspaceKey) return { snapshots, pendingId: undefined as string | undefined };
				const pendingId = makePendingId("species") as SpeciesWithSystemCatalog["id"];
				const pending: CachedSpeciesWithSystemCatalog = {
					workspace: WorkspaceVO.fromKey(workspaceKey),
					id: pendingId,
					categoryId: variables.categoryId as SpeciesWithSystemCatalog["categoryId"],
					characteristics: variables.characteristics,
					systemCatalog: false,
					presentation: variables.presentation,
					createdAt: new Date(),
					updatedAt: new Date(),
					objectStatus: QUERY_OBJECT_PENDING,
				};
				queryClient.setQueryData<CachedSpeciesList>(queryKeys.species.all.queryKey, (prev) =>
					appendToItemsContainer(prev, pending),
				);
				queryClient.setQueryData(queryKeys.species.detail(pending.id).queryKey, pending);
				return { snapshots, pendingId };
			},
			onError: (error, _vars, ctx) => {
				if (!ctx) return;
				restoreQuerySnapshots(queryClient, ctx.snapshots);
				toast.error(renderError(error, m.collections_species_actionError()));
			},
			onSuccess: (entity, _vars, ctx) => {
				if (ctx?.pendingId) {
					const pendingId = ctx.pendingId as SpeciesWithSystemCatalog["id"];
					queryClient.setQueryData<CachedSpeciesList>(queryKeys.species.all.queryKey, (prev) =>
						replacePendingInItemsContainer(prev, pendingId, entity),
					);
					queryClient.setQueryData(queryKeys.species.detail(pendingId).queryKey, undefined);
				} else {
					queryClient.setQueryData<CachedSpeciesList>(queryKeys.species.all.queryKey, (prev) =>
						replacePendingInItemsContainer(prev, entity.id, entity),
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
				const previousAll = snapshots[0]?.data as CachedSpeciesList | undefined;
				const previousDetail = snapshots[1]?.data as CachedSpeciesWithSystemCatalog | undefined;
				const base =
					previousDetail ??
					previousAll?.items.find((item) => String(item.id) === String(variables.id)) ??
					null;
				if (base && !isQueryObjectPending(base)) {
					const optimistic = markQueryObjectPending({
						...base,
						...variables,
						id: base.id,
						categoryId: (variables.categoryId !== undefined
							? variables.categoryId
							: base.categoryId) as SpeciesWithSystemCatalog["categoryId"],
						updatedAt: new Date(),
					});
					queryClient.setQueryData<CachedSpeciesList>(queryKeys.species.all.queryKey, (prev) =>
						upsertInItemsContainer(prev, optimistic),
					);
					queryClient.setQueryData(queryKeys.species.detail(variables.id).queryKey, optimistic);
				}
				return { snapshots };
			},
			onError: (error, variables, ctx) => {
				if (!ctx) return;
				void variables;
				restoreQuerySnapshots(queryClient, ctx.snapshots);
				toast.error(renderError(error, m.collections_species_actionError()));
			},
			onSuccess: (entity) => {
				queryClient.setQueryData<CachedSpeciesList>(queryKeys.species.all.queryKey, (prev) =>
					upsertInItemsContainer(prev, entity),
				);
				queryClient.setQueryData(queryKeys.species.detail(entity.id).queryKey, entity);
				queryClient.setQueryData<CachedPlantHydratedWithCatalogSpeciesList>(
					queryKeys.plant.all.queryKey,
					(prev) => {
						if (!prev) return prev;
						const species: SpeciesWithSystemCatalog = {
							...entity,
							systemCatalog: WorkspaceVO.isGlobalShared(entity.workspace),
						};
						return {
							...prev,
							items: prev.items.map((plant): CachedPlantHydratedWithCatalogSpecies => {
								if (
									!plant.cultivar?.species ||
									String(plant.cultivar.species.id) !== String(entity.id)
								) {
									return plant;
								}
								return {
									...plant,
									cultivar: {
										...plant.cultivar,
										species,
									},
								};
							}),
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
				const previousAll = snapshots[0]?.data as CachedSpeciesList | undefined;
				const row = previousAll?.items.find((item) => String(item.id) === String(variables.id));
				if (isQueryObjectPending(row)) return { snapshots };
				queryClient.setQueryData<CachedSpeciesList>(queryKeys.species.all.queryKey, (prev) =>
					removeFromItemsContainer(prev, variables.id),
				);
				queryClient.setQueryData(queryKeys.species.detail(variables.id).queryKey, undefined);
				return { snapshots };
			},
			onError: (error, variables, ctx) => {
				if (!ctx) return;
				void variables;
				restoreQuerySnapshots(queryClient, ctx.snapshots);
				toast.error(renderError(error, m.collections_species_actionError()));
			},
			onSuccess: (deletedId) => {
				queryClient.setQueryData<CachedSpeciesList>(queryKeys.species.all.queryKey, (prev) =>
					dropPendingInItemsContainer(prev, deletedId),
				);
				queryClient.setQueryData(queryKeys.species.detail(deletedId).queryKey, undefined);
				toast.success(m.collections_species_deleteSuccess());
			},
		}),
	);
}
