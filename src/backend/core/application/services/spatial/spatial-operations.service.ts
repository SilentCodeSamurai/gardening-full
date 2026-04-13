import { RepositoryNotFoundError } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import {
	type SpatialNodeRepositoryPort,
	SpatialNodeRepositoryPortToken,
} from "@backend/core/application/ports/repositories/spatial/spatial-node.repository.port";
import type {
	SpatialNodeEntity,
	SpatialNodeEntityId,
	SpatialNodeEntityRef,
	SpatialNodeTreeNode,
	SpatialRect,
} from "@backend/core/domain/spatial/entities";
import { inject, injectable } from "tsyringe";

@injectable()
export class SpatialOperationsService {
	constructor(@inject(SpatialNodeRepositoryPortToken) private readonly spatialRepo: SpatialNodeRepositoryPort) {}

	public async getPlacementStatusByRef(params: {
		ref: SpatialNodeEntityRef;
		workspaces: readonly SpatialNodeEntity["workspace"][];
	}): Promise<{
		node: SpatialNodeEntity | null;
		isPlaced: boolean;
	}> {
		const { ref, workspaces } = params;
		let node: SpatialNodeEntity | null = null;
		try {
			node = await this.spatialRepo.getOneByRef({
				filters: [{ ref }],
			});
		} catch (e) {
			if (!(e instanceof RepositoryNotFoundError)) throw e;
		}
		if (node !== null) {
			const nodeWorkspace = node.workspace;
			if (!workspaces.some((workspace) => workspace.equals(nodeWorkspace))) {
				node = null;
			}
		}
		if (!node) {
			return { node: null, isPlaced: false };
		}
		const nodeId = node.id;
		const all = await this.spatialRepo.getMany({
			filters: workspaces.map((workspace) => ({ workspace })),
		});
		const hasChildren = all.items.some((item) => String(item.parentId) === String(nodeId));
		const isPlaced = node.parentId !== null || hasChildren;
		return { node, isPlaced };
	}

	public async deleteUnplacedNodeByRef(params: {
		ref: SpatialNodeEntityRef;
		workspaces: readonly SpatialNodeEntity["workspace"][];
	}): Promise<void> {
		const placement = await this.getPlacementStatusByRef(params);
		if (!placement.node || placement.isPlaced) return;
		await this.spatialRepo.deleteOne({
			filters: [{ id: placement.node.id, workspace: placement.node.workspace }],
		});
	}

	public async placeNode(input: {
		workspace: SpatialNodeEntity["workspace"];
		id: SpatialNodeEntityId;
		parentId: SpatialNodeEntityId | null;
		rect: SpatialRect;
	}): Promise<SpatialNodeEntity> {
		const existing = await this.spatialRepo.getOne({
			filters: [{ id: input.id, workspace: input.workspace }],
		});

		if (input.parentId !== null) {
			if (String(input.parentId) === String(existing.id)) {
				throw new Error("SpatialOperationsService: a node cannot be reparented under itself.");
			}
			await this.spatialRepo.getOne({
				filters: [{ id: input.parentId, workspace: input.workspace }],
			});
			const subtree = await this.spatialRepo.getTreeForRootOne({
				filters: [{ id: input.id }],
			});
			const contains = (node: SpatialNodeTreeNode, targetId: SpatialNodeEntityId): boolean => {
				if (String(node.id) === String(targetId)) return true;
				for (const c of node.children) {
					if (contains(c as SpatialNodeTreeNode, targetId)) return true;
				}
				return false;
			};

			if (contains(subtree, input.parentId)) {
				// TODO: create dedicated error class
				throw new Error("SpatialOperationsService: a node cannot be reparented under its own descendant.");
			}
		}

		return this.spatialRepo.updateOne({
			filters: [{ id: input.id, workspace: input.workspace }],
			dto: {
				parentId: input.parentId,
				rect: input.rect,
			},
		});
	}
}
