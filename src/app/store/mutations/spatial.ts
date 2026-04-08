import type {
	SpatialNodeEntity,
	SpatialNodeEntityId,
	SpatialNodeTreeNode,
} from "@backend/core/domain/spatial/entities";
import type { ItemsContainer } from "@backend/shared/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/orpc/client";

import { queryKeys } from "@/store/keys";
import { makePendingId } from "./optimistic";

export function useSpatialNodeCreateMutation() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.spatial.createNode.mutationOptions({
			onMutate: async (variables) => {
				await queryClient.cancelQueries({ queryKey: queryKeys.spatial.allNodes.queryKey });
				const pendingId = makePendingId("spatial") as unknown as SpatialNodeEntityId;
				const pending: SpatialNodeEntity = {
					id: pendingId,
					parentId: variables.parentId as SpatialNodeEntityId | null,
					rect: variables.rect,
					kind: variables.kind,
					ref: variables.ref,
					createdAt: new Date(),
					updatedAt: new Date(),
				};
				const previousAll = queryClient.getQueryData<ItemsContainer<SpatialNodeEntity>>(
					queryKeys.spatial.allNodes.queryKey,
				);
				queryClient.setQueryData<ItemsContainer<SpatialNodeEntity>>(
					queryKeys.spatial.allNodes.queryKey,
					(prev) => ({ items: [...(prev?.items ?? []), pending] }),
				);
				const treeQueries = queryClient.getQueriesData<SpatialNodeTreeNode>({
					queryKey: queryKeys.spatial.tree._def,
				});
				for (const [key, tree] of treeQueries) {
					if (!tree) continue;
					const parentId = variables.parentId ? String(variables.parentId) : null;
					if (parentId !== String(tree.id)) continue;
					queryClient.setQueryData<SpatialNodeTreeNode>(key, {
						...tree,
						children: [...tree.children, { ...pending, children: [] }],
					});
				}
				return { previousAll, treeQueries, pendingId };
			},
			onError: (_e, _vars, ctx) => {
				if (!ctx) return;
				queryClient.setQueryData(queryKeys.spatial.allNodes.queryKey, ctx.previousAll);
				for (const [key, value] of ctx.treeQueries ?? []) queryClient.setQueryData(key, value);
			},
			onSuccess: (entity, _vars, ctx) => {
				if (ctx?.pendingId) {
					queryClient.setQueryData<ItemsContainer<SpatialNodeEntity>>(
						queryKeys.spatial.allNodes.queryKey,
						(prev) => {
							if (!prev) return prev;
							return {
								items: prev.items.filter((item) => String(item.id) !== String(ctx.pendingId)),
							};
						},
					);
				}
				queryClient.setQueryData<ItemsContainer<SpatialNodeEntity>>(
					queryKeys.spatial.allNodes.queryKey,
					(prev) => ({ items: [...(prev?.items ?? []), entity] }),
				);

				const treeQueries = queryClient.getQueriesData<SpatialNodeTreeNode>({
					queryKey: queryKeys.spatial.tree._def,
				});
				for (const [key, tree] of treeQueries) {
					if (!tree) continue;
					const parentId = entity.parentId ? String(entity.parentId) : null;
					if (parentId !== String(tree.id)) continue;
					const nextChildren = tree.children.filter(
						(child) => String(child.id) !== String(ctx?.pendingId ?? ""),
					);
					queryClient.setQueryData<SpatialNodeTreeNode>(key, {
						...tree,
						children: [...nextChildren, { ...entity, children: [] }],
					});
				}
			},
		}),
	);
}
