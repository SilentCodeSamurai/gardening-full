import type { SpatialNodeEntity, SpatialNodeTreeNode } from "@backend/core/domain/spatial/entities";
import type {
	SpatialNodeRepositoryCreateInputDTO,
	SpatialNodeRepositoryCreateOutputDTO,
	SpatialNodeRepositoryDeleteInputDTO,
	SpatialNodeRepositoryDeleteOutputDTO,
	SpatialNodeRepositoryGetAllOutputDTO,
	SpatialNodeRepositoryGetByIdInputDTO,
	SpatialNodeRepositoryGetByIdOutputDTO,
	SpatialNodeRepositoryGetByRefInputDTO,
	SpatialNodeRepositoryGetByRefOutputDTO,
	SpatialNodeRepositoryGetTreeForRootIdInputDTO,
	SpatialNodeRepositoryGetTreeForRootIdOutputDTO,
	SpatialNodeRepositoryPort,
	SpatialNodeRepositoryRestoreInputDTO,
	SpatialNodeRepositoryRestoreOutputDTO,
	SpatialNodeRepositoryUpdateInputDTO,
	SpatialNodeRepositoryUpdateOutputDTO,
} from "@backend/core/application/ports/repositories/spatial/spatial-node.repository.port";
import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { InMemoryGardeningStore } from "@backend/infrastructure/integrations/in-memory-database/client";
import { idKey, spatialNodeId } from "@backend/infrastructure/integrations/shared/database-ids";

export class SpatialNodeInMemoryRepository extends BaseRepositoryErrors implements SpatialNodeRepositoryPort {
	constructor(private readonly store: InMemoryGardeningStore) {
		super();
	}

	async create(dto: SpatialNodeRepositoryCreateInputDTO): Promise<SpatialNodeRepositoryCreateOutputDTO> {
		if (dto.parentId !== null && !this.store.spatialNodes.has(idKey(dto.parentId))) {
			this.throwNotFoundError("SpatialNode", dto.parentId);
		}
		const now = new Date();
		const row: SpatialNodeEntity = {
			id: spatialNodeId(),
			parentId: dto.parentId,
			rect: dto.rect,
			kind: dto.kind,
			ref: dto.ref,
			createdAt: now,
			updatedAt: now,
		};
		this.store.spatialNodes.set(idKey(row.id), row);
		return row;
	}

	async getById(dto: SpatialNodeRepositoryGetByIdInputDTO): Promise<SpatialNodeRepositoryGetByIdOutputDTO> {
		const row = this.store.spatialNodes.get(idKey(dto.id));
		if (!row) this.throwNotFoundError("SpatialNode", dto.id);
		return row;
	}

	async getByRef(dto: SpatialNodeRepositoryGetByRefInputDTO): Promise<SpatialNodeRepositoryGetByRefOutputDTO> {
		for (const row of this.store.spatialNodes.values()) {
			if (row.ref.entity === dto.ref.entity && row.ref.entityId === dto.ref.entityId) return row;
		}
		this.throwNotFoundError("SpatialNodeRef", `${dto.ref.entity}:${dto.ref.entityId}`);
	}

	async getAll(): Promise<SpatialNodeRepositoryGetAllOutputDTO> {
		return { items: [...this.store.spatialNodes.values()] };
	}

	async update(dto: SpatialNodeRepositoryUpdateInputDTO): Promise<SpatialNodeRepositoryUpdateOutputDTO> {
		const key = idKey(dto.id);
		const existing = this.store.spatialNodes.get(key);
		if (!existing) this.throwNotFoundError("SpatialNode", dto.id);
		if (dto.parentId !== undefined && dto.parentId !== null) {
			if (!this.store.spatialNodes.has(idKey(dto.parentId))) {
				this.throwNotFoundError("SpatialNode", dto.parentId);
			}
		}
		const updated: SpatialNodeEntity = {
			...existing,
			parentId: dto.parentId !== undefined ? dto.parentId : existing.parentId,
			rect: dto.rect ?? existing.rect,
			kind: dto.kind ?? existing.kind,
			ref: dto.ref ?? existing.ref,
			id: existing.id,
			createdAt: existing.createdAt,
			updatedAt: new Date(),
		};
		this.store.spatialNodes.set(key, updated);
		return updated;
	}

	async delete(dto: SpatialNodeRepositoryDeleteInputDTO): Promise<SpatialNodeRepositoryDeleteOutputDTO> {
		const key = idKey(dto.id);
		if (!this.store.spatialNodes.has(key)) this.throwNotFoundError("SpatialNode", dto.id);
		for (const n of this.store.spatialNodes.values()) {
			if (n.parentId !== null && idKey(n.parentId) === key) {
				this.throwConflictError({
					operation: "delete",
					reason: "child-nodes-exist",
					context: { id: dto.id, childId: n.id, parentId: n.parentId },
					participants: [
						{ entity: "SpatialNode", role: "target", id: dto.id as unknown as string },
						{ entity: "SpatialNode", role: "child", id: n.id as unknown as string },
					],
					message: "Cannot delete spatial node: child nodes exist.",
				});
			}
		}
		this.store.spatialNodes.delete(key);
		return dto.id;
	}

	async restore(dto: SpatialNodeRepositoryRestoreInputDTO): Promise<SpatialNodeRepositoryRestoreOutputDTO> {
		if (dto.parentId !== null && !this.store.spatialNodes.has(idKey(dto.parentId))) {
			this.throwNotFoundError("SpatialNode", dto.parentId);
		}
		const key = idKey(dto.id);
		const existing = this.store.spatialNodes.get(key);
		const now = new Date();
		const row: SpatialNodeEntity = {
			id: dto.id,
			parentId: dto.parentId,
			rect: dto.rect,
			kind: dto.kind,
			ref: dto.ref,
			createdAt: existing?.createdAt ?? now,
			updatedAt: now,
		};
		this.store.spatialNodes.set(key, row);
		return row;
	}

	async getTreeForRootId(
		dto: SpatialNodeRepositoryGetTreeForRootIdInputDTO,
	): Promise<SpatialNodeRepositoryGetTreeForRootIdOutputDTO> {
		const root = this.store.spatialNodes.get(idKey(dto.id));
		if (!root) this.throwNotFoundError("SpatialNode", dto.id);
		const byParent = new Map<string, SpatialNodeEntity[]>();
		for (const n of this.store.spatialNodes.values()) {
			const key = n.parentId ? idKey(n.parentId) : "__root__";
			const arr = byParent.get(key) ?? [];
			arr.push(n);
			byParent.set(key, arr);
		}
		const build = (node: SpatialNodeEntity): SpatialNodeTreeNode => {
			const children = (byParent.get(idKey(node.id)) ?? [])
				.slice()
				.sort((a, b) => idKey(a.id).localeCompare(idKey(b.id)));
			return { ...node, children: children.map(build) };
		};
		return build(root);
	}
}
