import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type {
	SpatialNodeRepositoryPortV2,
	SpatialNodeRepositoryV2CreateInputDTO,
	SpatialNodeRepositoryV2CreateManyInputDTO,
	SpatialNodeRepositoryV2CreateManyOutputDTO,
	SpatialNodeRepositoryV2CreateOutputDTO,
	SpatialNodeRepositoryV2DeleteManyOutputDTO,
	SpatialNodeRepositoryV2DeleteOutputDTO,
	SpatialNodeRepositoryV2FilterClause,
	SpatialNodeRepositoryV2GetByRefFilterClause,
	SpatialNodeRepositoryV2GetManyOutputDTO,
	SpatialNodeRepositoryV2GetOneOutputDTO,
	SpatialNodeRepositoryV2RestoreInputDTO,
	SpatialNodeRepositoryV2TreeRootFilterClause,
	SpatialNodeRepositoryV2UpdateManyOutputDTO,
	SpatialNodeRepositoryV2UpdateOutputDTO,
	SpatialNodeRepositoryV2UpdatePatchDTO,
} from "@backend/core/application/ports/repositories/spatial/spatial-node.repository.port.v2";
import type { SpatialNodeEntity, SpatialNodeTreeNode } from "@backend/core/domain/spatial/entities";
import { workspaceKeysEqual } from "@backend/infrastructure/adapters/repositories/shared/workspace-key";
import {
	findFirstRowMatchingAnyClause,
	findRowsMatchingAnyClause,
} from "@backend/infrastructure/adapters/repositories/shared/in-memory-v2-entity-filter";
import type { InMemoryStoreV2 } from "@backend/infrastructure/integrations/in-memory-database/client.v2";
import { idKey, spatialNodeId } from "@backend/infrastructure/integrations/shared/database-ids";

export class SpatialNodeInMemoryRepositoryV2 extends BaseRepositoryErrors implements SpatialNodeRepositoryPortV2 {
	constructor(private readonly store: InMemoryStoreV2) {
		super();
	}

	private insertRow(dto: SpatialNodeRepositoryV2CreateInputDTO): SpatialNodeRepositoryV2CreateOutputDTO {
		if (dto.parentId !== null) {
			const parent = this.store.spatialNodes.get(idKey(dto.parentId));
			if (!parent) this.throwNotFoundError("SpatialNode", dto.parentId);
			if (!workspaceKeysEqual(parent.workspaceKey, dto.workspaceKey)) {
				this.throwValidationError({
					operation: "create",
					validationCode: "parent-workspace-mismatch",
					context: { parentId: dto.parentId, workspaceKey: dto.workspaceKey },
				});
			}
		}
		const now = new Date();
		const row: SpatialNodeEntity = {
			...dto,
			id: spatialNodeId(),
			createdAt: now,
			updatedAt: now,
		};
		this.store.spatialNodes.set(idKey(row.id), row);
		return row;
	}

	private patchStored(existing: SpatialNodeEntity, dto: SpatialNodeRepositoryV2UpdatePatchDTO): SpatialNodeEntity {
		const nextWorkspaceKey = dto.workspaceKey !== undefined ? dto.workspaceKey : existing.workspaceKey;
		const nextParent = dto.parentId !== undefined ? dto.parentId : existing.parentId;
		return {
			...existing,
			workspaceKey: nextWorkspaceKey,
			parentId: nextParent,
			rect: dto.rect !== undefined ? dto.rect : existing.rect,
			kind: dto.kind !== undefined ? dto.kind : existing.kind,
			ref: dto.ref !== undefined ? dto.ref : existing.ref,
			updatedAt: new Date(),
		};
	}

	private matchesRefClause(row: SpatialNodeEntity, clause: SpatialNodeRepositoryV2GetByRefFilterClause): boolean {
		return (
			row.ref.entity === clause.ref.entity &&
			row.ref.entityId === clause.ref.entityId &&
			workspaceKeysEqual(row.workspaceKey, clause.workspaceKey)
		);
	}

	async createOne(dto: SpatialNodeRepositoryV2CreateInputDTO): Promise<SpatialNodeRepositoryV2CreateOutputDTO> {
		return this.insertRow(dto);
	}

	async createMany(
		input: SpatialNodeRepositoryV2CreateManyInputDTO,
	): Promise<SpatialNodeRepositoryV2CreateManyOutputDTO> {
		let count = 0;
		for (const item of input.items) {
			this.insertRow(item);
			count += 1;
		}
		return { count };
	}

	async getOne(input: {
		filters: readonly SpatialNodeRepositoryV2FilterClause[];
	}): Promise<SpatialNodeRepositoryV2GetOneOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.spatialNodes.values(), input.filters);
		if (!row) this.throwNotFoundError("SpatialNode", input.filters);
		return row;
	}

	async getOneByRef(input: {
		filters: readonly SpatialNodeRepositoryV2GetByRefFilterClause[];
	}): Promise<SpatialNodeRepositoryV2GetOneOutputDTO> {
		for (const row of this.store.spatialNodes.values()) {
			if (input.filters.some((c) => this.matchesRefClause(row, c))) {
				return row;
			}
		}
		this.throwNotFoundError("SpatialNodeRef", input.filters);
	}

	async getMany(input?: {
		filters?: readonly SpatialNodeRepositoryV2FilterClause[];
	}): Promise<SpatialNodeRepositoryV2GetManyOutputDTO> {
		if (input?.filters === undefined) {
			return { items: [...this.store.spatialNodes.values()] };
		}
		if (input.filters.length === 0) return { items: [] };
		const rows = findRowsMatchingAnyClause([...this.store.spatialNodes.values()], input.filters);
		return { items: rows };
	}

	async updateOne(input: {
		filters: readonly SpatialNodeRepositoryV2FilterClause[];
		dto: SpatialNodeRepositoryV2UpdatePatchDTO;
	}): Promise<SpatialNodeRepositoryV2UpdateOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.spatialNodes.values(), input.filters);
		if (!row) this.throwNotFoundError("SpatialNode", input.filters);
		const updated = this.patchStored(row, input.dto);
		if (updated.parentId !== null) {
			const parent = this.store.spatialNodes.get(idKey(updated.parentId));
			if (!parent) this.throwNotFoundError("SpatialNode", updated.parentId);
			if (!workspaceKeysEqual(parent.workspaceKey, updated.workspaceKey)) {
				this.throwValidationError({
					operation: "update",
					validationCode: "parent-workspace-mismatch",
					context: { parentId: updated.parentId },
				});
			}
		}
		this.store.spatialNodes.set(idKey(updated.id), updated);
		return updated;
	}

	async updateMany(input: {
		filters: readonly SpatialNodeRepositoryV2FilterClause[];
		dto: SpatialNodeRepositoryV2UpdatePatchDTO;
	}): Promise<SpatialNodeRepositoryV2UpdateManyOutputDTO> {
		const rows = findRowsMatchingAnyClause([...this.store.spatialNodes.values()], input.filters);
		let count = 0;
		for (const row of rows) {
			const updated = this.patchStored(row, input.dto);
			if (updated.parentId !== null) {
				const parent = this.store.spatialNodes.get(idKey(updated.parentId));
				if (!parent) this.throwNotFoundError("SpatialNode", updated.parentId);
				if (!workspaceKeysEqual(parent.workspaceKey, updated.workspaceKey)) {
					this.throwValidationError({
						operation: "updateMany",
						validationCode: "parent-workspace-mismatch",
						context: { parentId: updated.parentId },
					});
				}
			}
			this.store.spatialNodes.set(idKey(updated.id), updated);
			count += 1;
		}
		return { count };
	}

	async deleteOne(input: {
		filters: readonly SpatialNodeRepositoryV2FilterClause[];
	}): Promise<SpatialNodeRepositoryV2DeleteOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.spatialNodes.values(), input.filters);
		if (!row) this.throwNotFoundError("SpatialNode", input.filters);
		const key = idKey(row.id);
		for (const n of this.store.spatialNodes.values()) {
			if (
				n.parentId !== null &&
				idKey(n.parentId) === key &&
				workspaceKeysEqual(n.workspaceKey, row.workspaceKey)
			) {
				this.throwConflictError({
					operation: "delete",
					reason: "child-nodes-exist",
					context: { id: row.id, childId: n.id, parentId: n.parentId },
					participants: [
						{ entity: "SpatialNode", role: "target", id: row.id as unknown as string },
						{ entity: "SpatialNode", role: "child", id: n.id as unknown as string },
					],
					message: "Cannot delete spatial node: child nodes exist.",
				});
			}
		}
		this.store.spatialNodes.delete(key);
		return row.id;
	}

	async deleteMany(input: {
		filters: readonly SpatialNodeRepositoryV2FilterClause[];
	}): Promise<SpatialNodeRepositoryV2DeleteManyOutputDTO> {
		const rows = findRowsMatchingAnyClause([...this.store.spatialNodes.values()], input.filters);
		let count = 0;
		for (const row of rows) {
			const key = idKey(row.id);
			const hasChild = [...this.store.spatialNodes.values()].some(
				(n) =>
					n.parentId !== null &&
					idKey(n.parentId) === key &&
					workspaceKeysEqual(n.workspaceKey, row.workspaceKey),
			);
			if (hasChild) continue;
			if (this.store.spatialNodes.delete(key)) count += 1;
		}
		return { count };
	}

	async restoreOne(input: SpatialNodeRepositoryV2RestoreInputDTO): Promise<SpatialNodeEntity> {
		const key = idKey(input.id);
		const existing = this.store.spatialNodes.get(key);
		if (input.parentId !== null) {
			const parent = this.store.spatialNodes.get(idKey(input.parentId));
			if (!parent) this.throwNotFoundError("SpatialNode", input.parentId);
			if (!workspaceKeysEqual(parent.workspaceKey, input.workspaceKey)) {
				this.throwValidationError({
					operation: "restore",
					validationCode: "parent-workspace-mismatch",
					context: { parentId: input.parentId },
				});
			}
		}
		const now = new Date();
		const row: SpatialNodeEntity = {
			...input,
			createdAt: existing?.createdAt ?? now,
			updatedAt: now,
		};
		this.store.spatialNodes.set(key, row);
		return row;
	}

	async getTreeForRootOne(input: {
		filters: readonly SpatialNodeRepositoryV2TreeRootFilterClause[];
	}): Promise<SpatialNodeTreeNode> {
		const root =
			input.filters.length === 0
				? undefined
				: [...this.store.spatialNodes.values()].find((n) =>
						input.filters.some(
							(c) => idKey(n.id) === idKey(c.id) && workspaceKeysEqual(n.workspaceKey, c.workspaceKey),
						),
					);
		if (!root) this.throwNotFoundError("SpatialNode", input.filters);

		const byParent = new Map<string, SpatialNodeEntity[]>();
		for (const n of this.store.spatialNodes.values()) {
			if (!workspaceKeysEqual(n.workspaceKey, root.workspaceKey)) continue;
			const pkey = n.parentId ? idKey(n.parentId) : "__root__";
			const arr = byParent.get(pkey) ?? [];
			arr.push(n);
			byParent.set(pkey, arr);
		}

		const build = (node: SpatialNodeEntity): SpatialNodeTreeNode => {
			const children = (byParent.get(idKey(node.id)) ?? [])
				.slice()
				.sort((a, b) => idKey(a.id).localeCompare(idKey(b.id)));
			return {
				...node,
				children: children.map(build),
			};
		};
		return build(root);
	}
}
