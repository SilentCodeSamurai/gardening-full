import type {
	SpatialNodeEntity,
	SpatialNodeEntityId,
	SpatialNodeEntityRef,
	SpatialNodeTreeNode,
} from "@backend/core/domain/spatial/entities";
import type { ItemsContainer } from "@backend/shared/types";
import type { QueryClient } from "@tanstack/react-query";
import { orpc } from "@/orpc/client";

import { queryKeys } from "@/store/keys";

type SpatialWorldPoint = { x: number; y: number };
type SpatialApplyOperation = {
	id: SpatialNodeEntityId;
	parentId: SpatialNodeEntityId | null;
	rect: SpatialNodeEntity["rect"];
};

export type SpatialDeleteWithoutChildrenPlan = {
	targetId: SpatialNodeEntityId;
	reparentOps: SpatialApplyOperation[];
};

function findNodeByRef(items: readonly SpatialNodeEntity[], ref: SpatialNodeEntityRef): SpatialNodeEntity | null {
	return (
		items.find((node) => node.ref.entity === ref.entity && String(node.ref.entityId) === String(ref.entityId)) ??
		null
	);
}

function getWorldPosition(
	id: string,
	byId: Map<string, SpatialNodeEntity>,
	memo: Map<string, SpatialWorldPoint>,
): SpatialWorldPoint {
	const cached = memo.get(id);
	if (cached) return cached;
	const node = byId.get(id);
	if (!node) return { x: 0, y: 0 };
	if (!node.parentId) {
		const rootWorld = { x: node.rect.x, y: node.rect.y };
		memo.set(id, rootWorld);
		return rootWorld;
	}
	const parentWorld = getWorldPosition(String(node.parentId), byId, memo);
	const world = {
		x: parentWorld.x + node.rect.x,
		y: parentWorld.y + node.rect.y,
	};
	memo.set(id, world);
	return world;
}

/** Top-left of the node's rect in root (canvas) coordinates. */
export function getSpatialNodeWorldRect(
	items: readonly SpatialNodeEntity[],
	nodeId: string,
): SpatialNodeEntity["rect"] | null {
	const byId = new Map(items.map((item) => [String(item.id), item]));
	const node = byId.get(String(nodeId));
	if (!node) return null;
	const memo = new Map<string, SpatialWorldPoint>();
	const world = getWorldPosition(String(nodeId), byId, memo);
	return {
		x: world.x,
		y: world.y,
		width: node.rect.width,
		height: node.rect.height,
	};
}

export function planDeleteSpatialRefWithoutChildren(
	items: readonly SpatialNodeEntity[],
	ref: SpatialNodeEntityRef,
): SpatialDeleteWithoutChildrenPlan | null {
	const target = findNodeByRef(items, ref);
	if (!target) return null;

	const byId = new Map(items.map((item) => [String(item.id), item]));
	const memo = new Map<string, SpatialWorldPoint>();
	const parentWorld = target.parentId ? getWorldPosition(String(target.parentId), byId, memo) : { x: 0, y: 0 };

	const directChildren = items.filter((item) => String(item.parentId) === String(target.id));
	const reparentOps: SpatialApplyOperation[] = directChildren.map((child) => {
		const childWorld = getWorldPosition(String(child.id), byId, memo);
		return {
			id: child.id,
			parentId: target.parentId,
			rect: {
				x: childWorld.x - parentWorld.x,
				y: childWorld.y - parentWorld.y,
				width: child.rect.width,
				height: child.rect.height,
			},
		};
	});

	return {
		targetId: target.id,
		reparentOps,
	};
}

export async function executeDeleteWithoutChildrenPlan(plan: SpatialDeleteWithoutChildrenPlan): Promise<void> {
	if (plan.reparentOps.length > 0) {
		await orpc.spatial.applyOperations.call({ operations: plan.reparentOps });
	}
	await orpc.spatial.deleteNode.call({ id: plan.targetId });
}

export function applyDeleteWithoutChildrenPlanToItems(
	items: readonly SpatialNodeEntity[],
	plan: SpatialDeleteWithoutChildrenPlan,
): SpatialNodeEntity[] {
	const byId = new Map(items.map((item) => [String(item.id), item]));
	for (const op of plan.reparentOps) {
		const existing = byId.get(String(op.id));
		if (!existing) continue;
		byId.set(String(op.id), {
			...existing,
			parentId: op.parentId,
			rect: op.rect,
			updatedAt: new Date(),
		});
	}
	byId.delete(String(plan.targetId));
	return [...byId.values()];
}

export function setSpatialItemsAndRebuildTrees(queryClient: QueryClient, items: readonly SpatialNodeEntity[]): void {
	queryClient.setQueryData<ItemsContainer<SpatialNodeEntity>>(queryKeys.spatial.allNodes.queryKey, {
		items: [...items],
	});

	const byId = new Map(items.map((item) => [String(item.id), item]));
	const byParent = new Map<string, SpatialNodeEntity[]>();
	for (const item of items) {
		const key = item.parentId ? String(item.parentId) : "__root__";
		const arr = byParent.get(key);
		if (arr) arr.push(item);
		else byParent.set(key, [item]);
	}

	const treeQueries = queryClient.getQueriesData<SpatialNodeTreeNode>({
		queryKey: queryKeys.spatial.tree._def,
	});
	for (const [key, tree] of treeQueries) {
		if (!tree) continue;
		const build = (id: string): SpatialNodeTreeNode | null => {
			const node = byId.get(id);
			if (!node) return null;
			const children = (byParent.get(id) ?? [])
				.slice()
				.sort((a, b) => String(a.id).localeCompare(String(b.id)))
				.map((child) => build(String(child.id)))
				.filter((child): child is SpatialNodeTreeNode => child !== null);
			return { ...node, children };
		};
		queryClient.setQueryData(key, build(String(tree.id)));
	}
}
