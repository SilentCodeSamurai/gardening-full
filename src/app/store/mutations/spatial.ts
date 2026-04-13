import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import type { SpatialNodeEntityId, SpatialNodeTreeNode } from "@backend/core/domain/spatial/entities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/orpc/client";

import { useActiveWorkspaceKey } from "@/store/active-workspace-key";
import { queryKeys } from "@/store/keys";
import type { CachedSpatialNode, CachedSpatialNodeList } from "@/store/query-cache-types";
import { QUERY_OBJECT_PENDING } from "@/store/query-object-status";
import { makePendingId } from "./optimistic";

export function useSpatialNodeCreateMutation() {
	const queryClient = useQueryClient();
	const workspaceKey = useActiveWorkspaceKey();

	return useMutation(
		orpc.spatial.createNode.mutationOptions({
			onMutate: async (variables) => {
				await queryClient.cancelQueries({ queryKey: queryKeys.spatial.allNodes.queryKey });
				const previousAll = queryClient.getQueryData<CachedSpatialNodeList>(
					queryKeys.spatial.allNodes.queryKey,
				);
				const treeQueries = queryClient.getQueriesData<SpatialNodeTreeNode>({
					queryKey: queryKeys.spatial.tree._def,
				});
				if (!workspaceKey) return { previousAll, treeQueries, pendingId: undefined as string | undefined };

				const pendingId = makePendingId("spatial") as unknown as SpatialNodeEntityId;
				const pending: CachedSpatialNode = {
					workspace: WorkspaceVO.fromKey(workspaceKey),
					id: pendingId,
					parentId: variables.parentId as SpatialNodeEntityId | null,
					rect: variables.rect,
					kind: variables.kind,
					ref: variables.ref,
					createdAt: new Date(),
					updatedAt: new Date(),
					objectStatus: QUERY_OBJECT_PENDING,
				};
				queryClient.setQueryData<CachedSpatialNodeList>(queryKeys.spatial.allNodes.queryKey, (prev) => ({
					items: [...(prev?.items ?? []), pending],
				}));
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
					queryClient.setQueryData<CachedSpatialNodeList>(queryKeys.spatial.allNodes.queryKey, (prev) => {
						if (!prev) return prev;
						return {
							items: prev.items.filter((item) => String(item.id) !== String(ctx.pendingId)),
						};
					});
				}
				queryClient.setQueryData<CachedSpatialNodeList>(queryKeys.spatial.allNodes.queryKey, (prev) => ({
					items: [...(prev?.items ?? []), entity],
				}));

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
