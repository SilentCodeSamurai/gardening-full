import type { SpeciesCategoryWithSystemCatalog } from "@backend/core/application/use-cases/gardening/species-category.crud-use-cases";
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

export function useSpeciesCategoryCreateMutation() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.speciesCategory.create.mutationOptions({
			onMutate: async (variables) => {
				await cancelQueriesByKeys(queryClient, [queryKeys.speciesCategory.all.queryKey]);
				const snapshots = snapshotQueries(queryClient, [queryKeys.speciesCategory.all.queryKey]);
				const pendingId = makePendingId("species-category");
				const pending: SpeciesCategoryWithSystemCatalog = {
					id: pendingId as SpeciesCategoryWithSystemCatalog["id"],
					title: variables.title,
					systemCatalog: false,
					presentation: variables.presentation,
					createdAt: new Date(),
					updatedAt: new Date(),
				};
				queryClient.setQueryData<ItemsContainer<SpeciesCategoryWithSystemCatalog>>(
					queryKeys.speciesCategory.all.queryKey,
					(prev) => appendToItemsContainer(prev, pending),
				);
				queryClient.setQueryData(queryKeys.speciesCategory.detail(pending.id).queryKey, pending);
				return { snapshots, pendingId };
			},
			onError: (_e, _vars, ctx) => {
				if (!ctx) return;
				restoreQuerySnapshots(queryClient, ctx.snapshots);
				if (ctx.pendingId) {
					queryClient.setQueryData(
						queryKeys.speciesCategory.detail(ctx.pendingId as SpeciesCategoryWithSystemCatalog["id"]).queryKey,
						undefined,
					);
				}
				// TODO: Translate backend error details/codes instead of generic messages.
				toast.error(m.collections_speciesCategory_actionError());
			},
			onSuccess: (entity, _vars, ctx) => {
				if (ctx?.pendingId) {
					queryClient.setQueryData<ItemsContainer<SpeciesCategoryWithSystemCatalog>>(
						queryKeys.speciesCategory.all.queryKey,
						(prev) =>
							replacePendingInItemsContainer(prev, ctx.pendingId as SpeciesCategoryWithSystemCatalog["id"], entity),
					);
					queryClient.setQueryData(
						queryKeys.speciesCategory.detail(ctx.pendingId as SpeciesCategoryWithSystemCatalog["id"]).queryKey,
						undefined,
					);
				} else {
					queryClient.setQueryData<ItemsContainer<SpeciesCategoryWithSystemCatalog>>(
						queryKeys.speciesCategory.all.queryKey,
						(prev) => replacePendingInItemsContainer(prev, entity.id, entity),
					);
				}
				queryClient.setQueryData(queryKeys.speciesCategory.detail(entity.id).queryKey, entity);
				toast.success(m.collections_speciesCategory_createSuccess());
			},
		}),
	);
}

export function useSpeciesCategoryUpdateMutation() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.speciesCategory.update.mutationOptions({
			onMutate: async (variables) => {
				await cancelQueriesByKeys(queryClient, [queryKeys.speciesCategory.all.queryKey]);
				const snapshots = snapshotQueries(queryClient, [
					queryKeys.speciesCategory.all.queryKey,
					queryKeys.speciesCategory.detail(variables.id).queryKey,
				]);
				const previousAll = snapshots[0]?.data as ItemsContainer<SpeciesCategoryWithSystemCatalog> | undefined;
				const previousDetail = snapshots[1]?.data as SpeciesCategoryWithSystemCatalog | undefined;
				const base =
					previousDetail ??
					previousAll?.items.find((item) => String(item.id) === String(variables.id)) ??
					null;
				if (base) {
					const optimistic: SpeciesCategoryWithSystemCatalog = {
						...base,
						...variables,
						id: base.id,
						updatedAt: new Date(),
					};
					queryClient.setQueryData<ItemsContainer<SpeciesCategoryWithSystemCatalog>>(
						queryKeys.speciesCategory.all.queryKey,
						(prev) => upsertInItemsContainer(prev, optimistic),
					);
					queryClient.setQueryData(queryKeys.speciesCategory.detail(variables.id).queryKey, optimistic);
				}
				return { snapshots };
			},
			onError: (_e, variables, ctx) => {
				if (!ctx) return;
				void variables;
				restoreQuerySnapshots(queryClient, ctx.snapshots);
				// TODO: Translate backend error details/codes instead of generic messages.
				toast.error(m.collections_speciesCategory_actionError());
			},
			onSuccess: (entity) => {
				queryClient.setQueryData<ItemsContainer<SpeciesCategoryWithSystemCatalog>>(
					queryKeys.speciesCategory.all.queryKey,
					(prev) => upsertInItemsContainer(prev, entity),
				);
				queryClient.setQueryData(queryKeys.speciesCategory.detail(entity.id).queryKey, entity);
				toast.success(m.collections_speciesCategory_updateSuccess());
			},
		}),
	);
}

export function useSpeciesCategoryDeleteMutation() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.speciesCategory.delete.mutationOptions({
			onMutate: async (variables) => {
				await cancelQueriesByKeys(queryClient, [queryKeys.speciesCategory.all.queryKey]);
				const snapshots = snapshotQueries(queryClient, [
					queryKeys.speciesCategory.all.queryKey,
					queryKeys.speciesCategory.detail(variables.id).queryKey,
				]);
				queryClient.setQueryData<ItemsContainer<SpeciesCategoryWithSystemCatalog>>(
					queryKeys.speciesCategory.all.queryKey,
					(prev) => removeFromItemsContainer(prev, variables.id),
				);
				queryClient.setQueryData(queryKeys.speciesCategory.detail(variables.id).queryKey, undefined);
				return { snapshots };
			},
			onError: (_e, variables, ctx) => {
				if (!ctx) return;
				void variables;
				restoreQuerySnapshots(queryClient, ctx.snapshots);
				// TODO: Translate backend error details/codes instead of generic messages.
				toast.error(m.collections_speciesCategory_actionError());
			},
			onSuccess: (deletedId) => {
				queryClient.setQueryData<ItemsContainer<SpeciesCategoryWithSystemCatalog>>(
					queryKeys.speciesCategory.all.queryKey,
					(prev) => dropPendingInItemsContainer(prev, deletedId),
				);
				queryClient.setQueryData(queryKeys.speciesCategory.detail(deletedId).queryKey, undefined);
				toast.success(m.collections_speciesCategory_deleteSuccess());
			},
		}),
	);
}
