import type { GardeningEventEntity } from "@backend/core/domain/gardening/entities";
import type { ItemsContainer } from "@backend/shared/types";
import type { QueryClient, QueryKey } from "@tanstack/react-query";

export function appendToItemsContainer<T extends { id: unknown }>(
	prev: ItemsContainer<T> | undefined,
	entity: T,
): ItemsContainer<T> {
	if (!prev) {
		return { items: [entity] };
	}
	return { items: [...prev.items, entity] };
}

export function upsertInItemsContainer<T extends { id: unknown }>(
	prev: ItemsContainer<T> | undefined,
	entity: T,
): ItemsContainer<T> {
	if (!prev) {
		return { items: [entity] };
	}
	const idx = prev.items.findIndex((item) => item.id === entity.id);
	if (idx === -1) {
		return { items: [...prev.items, entity] };
	}
	const next = [...prev.items];
	next[idx] = entity;
	return { items: next };
}

export function removeFromItemsContainer<T extends { id: unknown }>(
	prev: ItemsContainer<T> | undefined,
	id: unknown,
): ItemsContainer<T> | undefined {
	if (!prev) return undefined;
	return { items: prev.items.filter((item) => String(item.id) !== String(id)) };
}

export function removeManyFromItemsContainer<T extends { id: unknown }>(
	prev: ItemsContainer<T> | undefined,
	ids: readonly unknown[],
): ItemsContainer<T> | undefined {
	if (!prev) return undefined;
	const drop = new Set(ids.map((id) => String(id)));
	return { items: prev.items.filter((item) => !drop.has(String(item.id))) };
}

export function appendManyToItemsContainer<T extends { id: unknown }>(
	prev: ItemsContainer<T> | undefined,
	entities: T[],
): ItemsContainer<T> {
	if (!prev) {
		return { items: [...entities] };
	}
	return { items: [...prev.items, ...entities] };
}

export function appendToScopedList<T extends { id: unknown }>(
	queryClient: QueryClient,
	key: QueryKey,
	entity: T,
): void {
	queryClient.setQueryData<ItemsContainer<T>>(key, (prev) => appendToItemsContainer(prev, entity));
}

export function upsertScopedList<T extends { id: unknown }>(queryClient: QueryClient, key: QueryKey, entity: T): void {
	queryClient.setQueryData<ItemsContainer<T>>(key, (prev) => upsertInItemsContainer(prev, entity));
}

export function removeFromScopedList<T extends { id: unknown }>(
	queryClient: QueryClient,
	key: QueryKey,
	id: T["id"],
): void {
	queryClient.setQueryData<ItemsContainer<T>>(key, (prev) => {
		const next = removeFromItemsContainer(prev, id);
		return next ?? { items: [] };
	});
}

export function upsertInGardeningEventScopedLists(queryClient: QueryClient, event: GardeningEventEntity): void {
	for (const query of queryClient.getQueryCache().getAll()) {
		const key = query.queryKey;
		if (!Array.isArray(key) || key[0] !== "gardeningEvent") continue;
		const scope = key[1];
		if (scope !== "forPlant" && scope !== "forLocation") continue;
		queryClient.setQueryData<ItemsContainer<GardeningEventEntity>>(key, (prev) =>
			upsertInItemsContainer(prev, event),
		);
	}
}

export function removeFromGardeningEventScopedLists(queryClient: QueryClient, eventId: string): void {
	for (const query of queryClient.getQueryCache().getAll()) {
		const key = query.queryKey;
		if (!Array.isArray(key) || key[0] !== "gardeningEvent") continue;
		const scope = key[1];
		if (scope !== "forPlant" && scope !== "forLocation") continue;
		queryClient.setQueryData<ItemsContainer<GardeningEventEntity>>(key, (prev) => {
			const next = removeFromItemsContainer(prev, eventId);
			return next ?? { items: [] };
		});
	}
}
