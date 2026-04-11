import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
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
	SpatialNodeRepositoryRestoreInnerDTO,
	SpatialNodeRepositoryRestoreOutputDTO,
	SpatialNodeRepositoryUpdateInputDTO,
	SpatialNodeRepositoryUpdateOutputDTO,
} from "@backend/core/application/ports/repositories/spatial/spatial-node.repository.port";
import type { SpatialNodeEntity, SpatialNodeTreeNode } from "@backend/core/domain/spatial/entities";
import type { InMemoryStore } from "@backend/infrastructure/integrations/in-memory-database/client";
import { idKey, spatialNodeId } from "@backend/infrastructure/integrations/shared/database-ids";

export class SpatialNodeInMemoryRepository extends BaseRepositoryErrors implements SpatialNodeRepositoryPort {
	constructor(private readonly store: InMemoryStore) {
		super();
	}

	private insertRow(dto: SpatialNodeRepositoryCreateInputDTO): SpatialNodeRepositoryCreateOutputDTO {
		if (dto.parentId !== null && !this.store.spatialNodes.has(idKey(dto.parentId))) {
			this.throwNotFoundError("SpatialNode", dto.parentId);
		}
		const now = new Date();
		const row: SpatialNodeEntity = {
			id: spatialNodeId(),
			workspaceKey: dto.workspaceKey,
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

	private loadById(dto: SpatialNodeRepositoryGetByIdInputDTO): SpatialNodeRepositoryGetByIdOutputDTO {
		const row = this.store.spatialNodes.get(idKey(dto.id));
		if (!row) this.throwNotFoundError("SpatialNode", dto.id);
		return row;
	}

	private patchRow(dto: SpatialNodeRepositoryUpdateInputDTO): SpatialNodeRepositoryUpdateOutputDTO {
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

	private removeRow(dto: SpatialNodeRepositoryDeleteInputDTO): SpatialNodeRepositoryDeleteOutputDTO {
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

	private listInWorkspaces(
		workspaceKeys: readonly SpatialNodeEntity["workspaceKey"][],
	): SpatialNodeRepositoryGetAllOutputDTO {
		const allowed = new Set(workspaceKeys.map((key) => String(key)));
		return { items: [...this.store.spatialNodes.values()].filter((x) => allowed.has(String(x.workspaceKey))) };
	}

	async getByRefScoped(input: {
		workspaceKeys: readonly SpatialNodeEntity["workspaceKey"][];
		dto: SpatialNodeRepositoryGetByRefInputDTO;
	}): Promise<SpatialNodeRepositoryGetByRefOutputDTO> {
		const allowed = new Set(input.workspaceKeys.map((key) => String(key)));
		for (const row of this.store.spatialNodes.values()) {
			if (
				row.ref.entity === input.dto.ref.entity &&
				row.ref.entityId === input.dto.ref.entityId &&
				allowed.has(String(row.workspaceKey))
			) {
				return row;
			}
		}
		this.throwNotFoundError("SpatialNodeRef", `${input.dto.ref.entity}:${input.dto.ref.entityId}`);
	}

	async restoreScoped(input: {
		workspaceKey: SpatialNodeEntity["workspaceKey"];
		dto: SpatialNodeRepositoryRestoreInnerDTO;
	}): Promise<SpatialNodeRepositoryRestoreOutputDTO> {
		if (input.dto.parentId !== null && !this.store.spatialNodes.has(idKey(input.dto.parentId))) {
			this.throwNotFoundError("SpatialNode", input.dto.parentId);
		}
		const key = idKey(input.dto.id);
		const existing = this.store.spatialNodes.get(key);
		const now = new Date();
		const row: SpatialNodeEntity = {
			id: input.dto.id,
			workspaceKey: input.workspaceKey,
			parentId: input.dto.parentId,
			rect: input.dto.rect,
			kind: input.dto.kind,
			ref: input.dto.ref,
			createdAt: existing?.createdAt ?? now,
			updatedAt: now,
		};
		this.store.spatialNodes.set(key, row);
		return row;
	}

	async getTreeForRootIdScoped(input: {
		workspaceKey: SpatialNodeEntity["workspaceKey"];
		dto: SpatialNodeRepositoryGetTreeForRootIdInputDTO;
	}): Promise<SpatialNodeRepositoryGetTreeForRootIdOutputDTO> {
		const root = this.store.spatialNodes.get(idKey(input.dto.id));
		if (!root) this.throwNotFoundError("SpatialNode", input.dto.id);
		if (String(root.workspaceKey) !== String(input.workspaceKey)) {
			this.throwNotFoundError("SpatialNode", input.dto.id);
		}
		const byParent = new Map<string, SpatialNodeEntity[]>();
		for (const n of this.store.spatialNodes.values()) {
			const pkey = n.parentId ? idKey(n.parentId) : "__root__";
			const arr = byParent.get(pkey) ?? [];
			arr.push(n);
			byParent.set(pkey, arr);
		}
		const build = (node: SpatialNodeEntity): SpatialNodeTreeNode => {
			const children = (byParent.get(idKey(node.id)) ?? [])
				.slice()
				.sort((a, b) => idKey(a.id).localeCompare(idKey(b.id)));
			return { ...node, children: children.map(build) };
		};
		return build(root);
	}

	async createScoped(input: { dto: SpatialNodeRepositoryCreateInputDTO }): Promise<SpatialNodeRepositoryCreateOutputDTO> {
		return this.insertRow(input.dto);
	}

	async getAllScoped(input: {
		workspaceKeys: readonly SpatialNodeEntity["workspaceKey"][];
	}): Promise<SpatialNodeRepositoryGetAllOutputDTO> {
		return this.listInWorkspaces(input.workspaceKeys);
	}

	async getByIdScoped(input: {
		workspaceKey: SpatialNodeEntity["workspaceKey"];
		dto: SpatialNodeRepositoryGetByIdInputDTO;
	}): Promise<SpatialNodeRepositoryGetByIdOutputDTO> {
		const row = this.loadById(input.dto);
		if (String(row.workspaceKey) !== String(input.workspaceKey)) {
			this.throwNotFoundError("SpatialNode", input.dto.id);
		}
		return row;
	}

	async updateByIdScoped(input: {
		workspaceKey: SpatialNodeEntity["workspaceKey"];
		dto: SpatialNodeRepositoryUpdateInputDTO;
	}): Promise<SpatialNodeRepositoryUpdateOutputDTO> {
		await this.getByIdScoped({ workspaceKey: input.workspaceKey, dto: { id: input.dto.id } });
		return this.patchRow(input.dto);
	}

	async deleteByIdScoped(input: {
		workspaceKey: SpatialNodeEntity["workspaceKey"];
		dto: SpatialNodeRepositoryDeleteInputDTO;
	}): Promise<SpatialNodeRepositoryDeleteOutputDTO> {
		await this.getByIdScoped({ workspaceKey: input.workspaceKey, dto: input.dto });
		return this.removeRow(input.dto);
	}
}
