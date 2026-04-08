import type { SpatialNodeEntity, SpatialNodeEntityId } from "@backend/core/domain/spatial/entities";
import type { SpatialNodeTreeNode } from "@backend/core/domain/spatial/entities";
import type { SpatialNodeRepositoryPort } from "@backend/core/application/ports/repositories/spatial/spatial-node.repository.port";

import type { SpatialRect } from "@backend/core/domain/spatial/entities";
import type { SpatialNodeEntityRef } from "@backend/core/domain/spatial/entities";

export class SpatialOperationsService {
	constructor(private readonly spatialRepo: SpatialNodeRepositoryPort) {}

	public async getPlacementStatusByRef(ref: SpatialNodeEntityRef): Promise<{
		node: SpatialNodeEntity | null;
		isPlaced: boolean;
	}> {
		const all = await this.spatialRepo.getAll();
		const node =
			all.items.find(
				(item) => item.ref.entity === ref.entity && String(item.ref.entityId) === String(ref.entityId),
			) ?? null;
		if (!node) {
			return { node: null, isPlaced: false };
		}
		const hasChildren = all.items.some((item) => String(item.parentId) === String(node.id));
		const isPlaced = node.parentId !== null || hasChildren;
		return { node, isPlaced };
	}

	public async deleteUnplacedNodeByRef(ref: SpatialNodeEntityRef): Promise<void> {
		const placement = await this.getPlacementStatusByRef(ref);
		if (!placement.node || placement.isPlaced) return;
		await this.spatialRepo.delete({ id: placement.node.id });
	}

	public async placeNode(input: {
		id: SpatialNodeEntityId;
		parentId: SpatialNodeEntityId | null;
		rect: SpatialRect;
	}): Promise<SpatialNodeEntity> {
		const existing = await this.spatialRepo.getById({ id: input.id });

		if (input.parentId !== null) {
			if (String(input.parentId) === String(existing.id)) {
				throw new Error("SpatialOperationsService: a node cannot be reparented under itself.");
			}
			// Relationship validation: parent must exist.
			await this.spatialRepo.getById({ id: input.parentId });
			// Relationship validation: prevent cycles by ensuring the new parent is not already
			// within the current subtree of `input.id`.
			const subtree = await this.spatialRepo.getTreeForRootId({ id: input.id });
			const contains = (node: SpatialNodeTreeNode, targetId: SpatialNodeEntityId): boolean => {
				if (String(node.id) === String(targetId)) return true;
				for (const c of node.children) {
					if (contains(c as SpatialNodeTreeNode, targetId)) return true;
				}
				return false;
			};
			if (contains(subtree, input.parentId)) {
				throw new Error("SpatialOperationsService: a node cannot be reparented under its own descendant.");
			}
		}

		// Persistence-only: persist parentId + rect exactly as provided by the editor.
		return this.spatialRepo.update({
			id: input.id,
			parentId: input.parentId,
			rect: input.rect,
		});
	}
}
