import { RepositoryNotFoundError } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { SpatialNodeRepositoryPort } from "@backend/core/application/ports/repositories/spatial/spatial-node.repository.port";
import type {
	SpatialNodeEntity,
	SpatialNodeEntityId,
	SpatialNodeEntityRef,
	SpatialNodeTreeNode,
	SpatialRect,
} from "@backend/core/domain/spatial/entities";

export class SpatialOperationsService {
	constructor(private readonly spatialRepo: SpatialNodeRepositoryPort) {}

	public async getPlacementStatusByRef(params: {
		ref: SpatialNodeEntityRef;
		workspaceKeys: readonly SpatialNodeEntity["workspaceKey"][];
	}): Promise<{
		node: SpatialNodeEntity | null;
		isPlaced: boolean;
	}> {
		const { ref, workspaceKeys } = params;
		let node: SpatialNodeEntity | null = null;
		try {
			node = await this.spatialRepo.getByRefScoped({
				workspaceKeys,
				dto: { ref },
			});
		} catch (e) {
			if (!(e instanceof RepositoryNotFoundError)) throw e;
		}
		if (!node) {
			return { node: null, isPlaced: false };
		}
		const all = await this.spatialRepo.getAllScoped({ workspaceKeys });
		const hasChildren = all.items.some((item) => String(item.parentId) === String(node.id));
		const isPlaced = node.parentId !== null || hasChildren;
		return { node, isPlaced };
	}

	public async deleteUnplacedNodeByRef(params: {
		ref: SpatialNodeEntityRef;
		workspaceKeys: readonly SpatialNodeEntity["workspaceKey"][];
	}): Promise<void> {
		const placement = await this.getPlacementStatusByRef(params);
		if (!placement.node || placement.isPlaced) return;
		await this.spatialRepo.deleteByIdScoped({
			workspaceKey: placement.node.workspaceKey,
			dto: { id: placement.node.id },
		});
	}

	public async placeNode(input: {
		workspaceKey: SpatialNodeEntity["workspaceKey"];
		id: SpatialNodeEntityId;
		parentId: SpatialNodeEntityId | null;
		rect: SpatialRect;
	}): Promise<SpatialNodeEntity> {
		const existing = await this.spatialRepo.getByIdScoped({
			workspaceKey: input.workspaceKey,
			dto: { id: input.id },
		});

		if (input.parentId !== null) {
			if (String(input.parentId) === String(existing.id)) {
				throw new Error("SpatialOperationsService: a node cannot be reparented under itself.");
			}
			await this.spatialRepo.getByIdScoped({
				workspaceKey: input.workspaceKey,
				dto: { id: input.parentId },
			});
			const subtree = await this.spatialRepo.getTreeForRootIdScoped({
				workspaceKey: input.workspaceKey,
				dto: { id: input.id },
			});
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

		return this.spatialRepo.updateByIdScoped({
			workspaceKey: input.workspaceKey,
			dto: {
				id: input.id,
				parentId: input.parentId,
				rect: input.rect,
			},
		});
	}
}
 