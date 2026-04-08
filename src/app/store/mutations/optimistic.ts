import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { ItemsContainer } from "@backend/shared/types";

/** Monotonic counter used as part of pending-id entropy. */
let pendingSeq = 0;

/**
 * Produces a high-entropy suffix for pending ids.
 *
 * Uses `crypto.randomUUID()` when available, and falls back to `Math.random`
 * for environments where Web Crypto is unavailable.
 */
function randomPart(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return Math.random().toString(36).slice(2);
}

/**
 * Creates a collision-resistant client-side id for optimistic entities.
 *
 * The resulting string includes:
 * - caller-provided prefix
 * - current timestamp
 * - monotonic sequence number
 * - random suffix
 *
 * @example
 * ```ts
 * const pendingId = makePendingId("plant");
 * // "pending-plant-1712512345678-3-6f5c..."
 * ```
 */
export function makePendingId(prefix: string): string {
	pendingSeq = (pendingSeq + 1) % Number.MAX_SAFE_INTEGER;
	return `pending-${prefix}-${Date.now()}-${pendingSeq}-${randomPart()}`;
}

/**
 * Snapshot of query cache state for one query key.
 *
 * Store this before optimistic writes and pass it back to
 * {@link restoreQuerySnapshots} on mutation error.
 */
export type QuerySnapshot = { key: QueryKey; data: unknown };

/**
 * Cancels in-flight queries for each key.
 *
 * This avoids race conditions where late query responses overwrite
 * optimistic cache updates.
 *
 * @example
 * ```ts
 * await cancelQueriesByKeys(queryClient, [
 *   queryKeys.plant.all.queryKey,
 *   queryKeys.plant.detail(id).queryKey,
 * ]);
 * ```
 */
export async function cancelQueriesByKeys(queryClient: QueryClient, keys: readonly QueryKey[]): Promise<void> {
	await Promise.all(keys.map((key) => queryClient.cancelQueries({ queryKey: key })));
}

/**
 * Captures current cache values for a set of query keys.
 *
 * Use this at the start of `onMutate`, then restore on `onError`.
 *
 * @example
 * ```ts
 * const snapshots = snapshotQueries(queryClient, [
 *   queryKeys.location.all.queryKey,
 *   queryKeys.location.detail(id).queryKey,
 * ]);
 * ```
 */
export function snapshotQueries(queryClient: QueryClient, keys: readonly QueryKey[]): QuerySnapshot[] {
	return keys.map((key) => ({ key, data: queryClient.getQueryData(key) }));
}

/**
 * Restores query cache values from previously captured snapshots.
 *
 * @example
 * ```ts
 * onError: (_error, _vars, ctx) => {
 *   if (!ctx) return;
 *   restoreQuerySnapshots(queryClient, ctx.snapshots);
 * }
 * ```
 */
export function restoreQuerySnapshots(queryClient: QueryClient, snapshots: readonly QuerySnapshot[]): void {
	for (const snapshot of snapshots) {
		queryClient.setQueryData(snapshot.key, snapshot.data);
	}
}

/**
 * Replaces a pending row with a real server row inside an `ItemsContainer`.
 *
 * If the pending row is missing (e.g. preloaded cache or race condition),
 * it appends the real entity instead.
 *
 * @example
 * ```ts
 * queryClient.setQueryData(queryKeys.species.all.queryKey, (prev) =>
 *   replacePendingInItemsContainer(prev, pendingId, realEntity),
 * );
 * ```
 */
export function replacePendingInItemsContainer<T extends { id: unknown }>(
	prev: ItemsContainer<T> | undefined,
	pendingId: unknown,
	entity: T,
): ItemsContainer<T> {
	const items = prev?.items ?? [];
	const index = items.findIndex((item) => String(item.id) === String(pendingId));
	if (index === -1) return { items: [...items, entity] };
	const next = [...items];
	next[index] = entity;
	return { items: next };
}

/**
 * Removes a single pending row from an `ItemsContainer`.
 *
 * Useful for optimistic delete success, or cleanup of stale pending rows.
 *
 * @example
 * ```ts
 * queryClient.setQueryData(queryKeys.location.all.queryKey, (prev) =>
 *   dropPendingInItemsContainer(prev, deletedId),
 * );
 * ```
 */
export function dropPendingInItemsContainer<T extends { id: unknown }>(
	prev: ItemsContainer<T> | undefined,
	pendingId: unknown,
): ItemsContainer<T> {
	const items = prev?.items ?? [];
	return { items: items.filter((item) => String(item.id) !== String(pendingId)) };
}

/**
 * Removes many pending rows from an `ItemsContainer` in one pass.
 *
 * Primarily used by optimistic create-many flows.
 *
 * @example
 * ```ts
 * queryClient.setQueryData(queryKeys.plant.all.queryKey, (prev) =>
 *   dropPendingManyInItemsContainer(prev, pendingIds),
 * );
 * ```
 */
export function dropPendingManyInItemsContainer<T extends { id: unknown }>(
	prev: ItemsContainer<T> | undefined,
	pendingIds: readonly unknown[],
): ItemsContainer<T> {
	const drop = new Set(pendingIds.map((id) => String(id)));
	const items = prev?.items ?? [];
	return { items: items.filter((item) => !drop.has(String(item.id))) };
}
