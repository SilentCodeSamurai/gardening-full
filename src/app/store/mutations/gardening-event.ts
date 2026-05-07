import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import type { GardeningEventEntity } from "@backend/core/domain/gardening/entities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/orpc/client";
import * as m from "@/paraglide/messages.js";
import { renderError } from "@/lib/render-error";
import { useActiveWorkspaceKey } from "@/store/active-workspace-key";
import {
	appendToItemsContainer,
	appendToScopedList,
	removeFromGardeningEventScopedLists,
	removeFromItemsContainer,
	removeManyFromItemsContainer,
	upsertInGardeningEventScopedLists,
	upsertInItemsContainer,
} from "@/store/cache-utils";
import { queryKeys } from "@/store/keys";
import type { CachedGardeningEvent, CachedGardeningEventList } from "@/store/query-cache-types";
import { isQueryObjectPending, markQueryObjectPending, QUERY_OBJECT_PENDING } from "@/store/query-object-status";
import {
	cancelQueriesByKeys,
	dropPendingInItemsContainer,
	dropPendingManyInItemsContainer,
	makePendingId,
	type QuerySnapshot,
	replacePendingInItemsContainer,
	restoreQuerySnapshots,
	snapshotQueries,
} from "./optimistic";

type Ctx = { snapshots: QuerySnapshot[]; pendingId?: string };

function toDateOrNull(value: unknown): Date | null {
	if (value === null) return null;
	if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
	if (typeof value === "string" || typeof value === "number") {
		const parsed = new Date(value);
		if (!Number.isNaN(parsed.getTime())) return parsed;
	}
	return null;
}

export function useGardeningEventUpdateMutation() {
	const qc = useQueryClient();
	return useMutation(
		orpc.gardeningEvent.update.mutationOptions({
			onMutate: async (variables) => {
				await cancelQueriesByKeys(qc, [queryKeys.gardeningEvent.all.queryKey]);
				const snapshots = snapshotQueries(qc, [queryKeys.gardeningEvent.all.queryKey]);
				const previousAll = snapshots[0]?.data as CachedGardeningEventList | undefined;
				const existing =
					previousAll?.items.find((item) => String(item.id) === String(variables.id)) ?? null;
				if (existing && !isQueryObjectPending(existing)) {
					const occurredAt =
						"occurredAt" in variables
							? toDateOrNull((variables as { occurredAt?: unknown }).occurredAt)
							: undefined;
					const optimistic = markQueryObjectPending({
						...existing,
						...(variables.action !== undefined ? { action: variables.action } : {}),
						...(occurredAt !== undefined ? { occurredAt } : {}),
						id: existing.id,
						updatedAt: new Date(),
					});
					qc.setQueryData<CachedGardeningEventList>(queryKeys.gardeningEvent.all.queryKey, (prev) =>
						upsertInItemsContainer(prev, optimistic),
					);
					upsertInGardeningEventScopedLists(qc, optimistic);
				}
				return { snapshots } satisfies Ctx;
			},
			onError: (error, variables, ctx) => {
				if (ctx) restoreQuerySnapshots(qc, ctx.snapshots);
				toast.error(renderError(error, m.collections_gardeningEvent_actionError()));
				void error;
				void variables;
			},
			onSuccess: (entity, variables, ctx) => {
				qc.setQueryData<CachedGardeningEventList>(queryKeys.gardeningEvent.all.queryKey, (prev) =>
					upsertInItemsContainer(prev, entity),
				);
				void qc.invalidateQueries({ queryKey: queryKeys.gardeningEvent.bindings(entity.id).queryKey });
				void qc.invalidateQueries({ queryKey: queryKeys.gardeningEvent.forPlant._def });
				void qc.invalidateQueries({ queryKey: queryKeys.gardeningEvent.forLocation._def });
				toast.success(m.collections_gardeningEvent_updateSuccess());
				void variables;
				void ctx;
			},
		}),
	);
}

export function useGardeningEventDeleteMutation() {
	const qc = useQueryClient();
	return useMutation(
		orpc.gardeningEvent.delete.mutationOptions({
			onMutate: async (variables) => {
				await cancelQueriesByKeys(qc, [queryKeys.gardeningEvent.all.queryKey]);
				const snapshots = snapshotQueries(qc, [queryKeys.gardeningEvent.all.queryKey]);
				const previousAll = snapshots[0]?.data as CachedGardeningEventList | undefined;
				const row = previousAll?.items.find((item) => String(item.id) === String(variables.id));
				if (isQueryObjectPending(row)) return { snapshots } satisfies Ctx;
				qc.setQueryData<CachedGardeningEventList>(queryKeys.gardeningEvent.all.queryKey, (prev) =>
					removeFromItemsContainer(prev, variables.id),
				);
				qc.setQueryData(queryKeys.gardeningEvent.bindings(variables.id).queryKey, undefined);
				removeFromGardeningEventScopedLists(qc, variables.id);
				return { snapshots } satisfies Ctx;
			},
			onError: (error, variables, ctx) => {
				if (ctx) restoreQuerySnapshots(qc, ctx.snapshots);
				toast.error(renderError(error, m.collections_gardeningEvent_actionError()));
				void error;
				void variables;
			},
			onSuccess: (deletedId, variables, ctx) => {
				qc.setQueryData<CachedGardeningEventList>(queryKeys.gardeningEvent.all.queryKey, (prev) =>
					dropPendingInItemsContainer(prev, deletedId),
				);
				qc.setQueryData(queryKeys.gardeningEvent.bindings(deletedId).queryKey, undefined);
				removeFromGardeningEventScopedLists(qc, deletedId);
				toast.success(m.collections_gardeningEvent_deleteSuccess());
				void variables;
				void ctx;
			},
		}),
	);
}

export function useGardeningEventDeleteManyMutation() {
	const qc = useQueryClient();
	return useMutation(
		orpc.gardeningEvent.deleteMany.mutationOptions({
			onMutate: async (variables): Promise<{ snapshots: QuerySnapshot[] }> => {
				await cancelQueriesByKeys(qc, [queryKeys.gardeningEvent.all.queryKey]);
				const snapshots = snapshotQueries(qc, [
					queryKeys.gardeningEvent.all.queryKey,
					...variables.ids.map((id) => queryKeys.gardeningEvent.bindings(id).queryKey),
				]);
				qc.setQueryData<CachedGardeningEventList>(
					queryKeys.gardeningEvent.all.queryKey,
					(prev) => removeManyFromItemsContainer(prev, variables.ids) ?? { items: [] },
				);
				for (const id of variables.ids) {
					qc.setQueryData(queryKeys.gardeningEvent.bindings(id).queryKey, undefined);
					removeFromGardeningEventScopedLists(qc, id);
				}
				return { snapshots };
			},
			onError: (error, _variables, ctx) => {
				if (!ctx) return;
				restoreQuerySnapshots(qc, ctx.snapshots);
				toast.error(renderError(error, m.collections_gardeningEvent_actionError()));
			},
			onSuccess: (_result, variables) => {
				qc.setQueryData<CachedGardeningEventList>(queryKeys.gardeningEvent.all.queryKey, (prev) =>
					dropPendingManyInItemsContainer(prev, variables.ids),
				);
				for (const deletedId of variables.ids) {
					qc.setQueryData(queryKeys.gardeningEvent.bindings(deletedId).queryKey, undefined);
					removeFromGardeningEventScopedLists(qc, deletedId);
				}
				toast.success(m.collections_gardeningEvent_deleteManySuccess());
			},
		}),
	);
}

export function useGardeningEventCreateForLocationMutation() {
	const qc = useQueryClient();
	const workspaceKey = useActiveWorkspaceKey();
	return useMutation(
		orpc.gardeningEvent.createForLocation.mutationOptions({
			onMutate: async (variables) => {
				await cancelQueriesByKeys(qc, [queryKeys.gardeningEvent.all.queryKey]);
				const snapshots = snapshotQueries(qc, [queryKeys.gardeningEvent.all.queryKey]);
				if (!workspaceKey) return { snapshots, pendingId: undefined as string | undefined };
				const pendingId = makePendingId("gardening-event");
				const pending: CachedGardeningEvent = {
					workspace: WorkspaceVO.fromKey(workspaceKey),
					id: pendingId as GardeningEventEntity["id"],
					action: variables.action,
					occurredAt: toDateOrNull(variables.occurredAt),
					createdAt: new Date(),
					updatedAt: new Date(),
					objectStatus: QUERY_OBJECT_PENDING,
				};
				qc.setQueryData<CachedGardeningEventList>(queryKeys.gardeningEvent.all.queryKey, (prev) =>
					appendToItemsContainer(prev, pending),
				);
				appendToScopedList(qc, queryKeys.gardeningEvent.forLocation(variables.locationId).queryKey, pending);
				return { snapshots, pendingId };
			},
			onError: (error, variables, ctx) => {
				if (ctx) restoreQuerySnapshots(qc, ctx.snapshots);
				toast.error(renderError(error, m.collections_gardeningEvent_actionError()));
				void error;
				void variables;
			},
			onSuccess: (entity, variables, ctx) => {
				qc.setQueryData<CachedGardeningEventList>(queryKeys.gardeningEvent.all.queryKey, (prev) =>
					replacePendingInItemsContainer(prev, ctx?.pendingId ?? entity.id, entity),
				);
				if (ctx?.pendingId) removeFromGardeningEventScopedLists(qc, ctx.pendingId);
				void qc.invalidateQueries({ queryKey: queryKeys.gardeningEvent.bindings(entity.id).queryKey });
				appendToScopedList(qc, queryKeys.gardeningEvent.forLocation(variables.locationId).queryKey, entity);
				void qc.invalidateQueries({ queryKey: queryKeys.gardeningEvent.forPlant._def });
				toast.success(m.collections_gardeningEvent_createSuccess());
			},
		}),
	);
}

export function useGardeningEventCreateMutation() {
	const qc = useQueryClient();
	const workspaceKey = useActiveWorkspaceKey();
	return useMutation(
		orpc.gardeningEvent.create.mutationOptions({
			onMutate: async (variables) => {
				await cancelQueriesByKeys(qc, [queryKeys.gardeningEvent.all.queryKey]);
				const snapshots = snapshotQueries(qc, [queryKeys.gardeningEvent.all.queryKey]);
				if (!workspaceKey) return { snapshots, pendingId: undefined as string | undefined };
				const pendingId = makePendingId("gardening-event");
				const pending: CachedGardeningEvent = {
					workspace: WorkspaceVO.fromKey(workspaceKey),
					id: pendingId as GardeningEventEntity["id"],
					action: variables.action,
					occurredAt: toDateOrNull(variables.occurredAt),
					createdAt: new Date(),
					updatedAt: new Date(),
					objectStatus: QUERY_OBJECT_PENDING,
				};
				qc.setQueryData<CachedGardeningEventList>(queryKeys.gardeningEvent.all.queryKey, (prev) =>
					appendToItemsContainer(prev, pending),
				);
				return { snapshots, pendingId };
			},
			onError: (error, variables, ctx) => {
				if (ctx) restoreQuerySnapshots(qc, ctx.snapshots);
				toast.error(renderError(error, m.collections_gardeningEvent_actionError()));
				void error;
				void variables;
			},
			onSuccess: (entity, variables, ctx) => {
				qc.setQueryData<CachedGardeningEventList>(queryKeys.gardeningEvent.all.queryKey, (prev) =>
					replacePendingInItemsContainer(prev, ctx?.pendingId ?? entity.id, entity),
				);
				if (ctx?.pendingId) removeFromGardeningEventScopedLists(qc, ctx.pendingId);
				void qc.invalidateQueries({ queryKey: queryKeys.gardeningEvent.bindings(entity.id).queryKey });
				toast.success(m.collections_gardeningEvent_createSuccess());
				void variables;
			},
		}),
	);
}

export function useGardeningEventCreateForPlantListMutation() {
	const qc = useQueryClient();
	const workspaceKey = useActiveWorkspaceKey();
	return useMutation(
		orpc.gardeningEvent.createForPlantList.mutationOptions({
			onMutate: async (variables) => {
				await cancelQueriesByKeys(qc, [queryKeys.gardeningEvent.all.queryKey]);
				const snapshots = snapshotQueries(qc, [queryKeys.gardeningEvent.all.queryKey]);
				if (!workspaceKey) return { snapshots, pendingId: undefined as string | undefined };
				const pendingId = makePendingId("gardening-event");
				const pending: CachedGardeningEvent = {
					workspace: WorkspaceVO.fromKey(workspaceKey),
					id: pendingId as GardeningEventEntity["id"],
					action: variables.action,
					occurredAt: toDateOrNull(variables.occurredAt),
					createdAt: new Date(),
					updatedAt: new Date(),
					objectStatus: QUERY_OBJECT_PENDING,
				};
				qc.setQueryData<CachedGardeningEventList>(queryKeys.gardeningEvent.all.queryKey, (prev) =>
					appendToItemsContainer(prev, pending),
				);
				for (const plantId of variables.plantIds) {
					appendToScopedList(qc, queryKeys.gardeningEvent.forPlant(plantId).queryKey, pending);
				}
				return { snapshots, pendingId };
			},
			onError: (error, variables, ctx) => {
				if (ctx) restoreQuerySnapshots(qc, ctx.snapshots);
				toast.error(renderError(error, m.collections_gardeningEvent_actionError()));
				void error;
				void variables;
			},
			onSuccess: (entity, variables, ctx) => {
				qc.setQueryData<CachedGardeningEventList>(queryKeys.gardeningEvent.all.queryKey, (prev) =>
					replacePendingInItemsContainer(prev, ctx?.pendingId ?? entity.id, entity),
				);
				if (ctx?.pendingId) removeFromGardeningEventScopedLists(qc, ctx.pendingId);
				void qc.invalidateQueries({ queryKey: queryKeys.gardeningEvent.bindings(entity.id).queryKey });
				for (const plantId of variables.plantIds) {
					appendToScopedList(qc, queryKeys.gardeningEvent.forPlant(plantId).queryKey, entity);
				}
				toast.success(m.collections_gardeningEvent_createSuccess());
			},
		}),
	);
}
