import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type {
	SpatialNodeRepositoryCreateInputDTO,
	SpatialNodeRepositoryCreateManyInputDTO,
	SpatialNodeRepositoryCreateManyOutputDTO,
	SpatialNodeRepositoryCreateOutputDTO,
	SpatialNodeRepositoryDeleteManyOutputDTO,
	SpatialNodeRepositoryDeleteOutputDTO,
	SpatialNodeRepositoryFilterClause,
	SpatialNodeRepositoryGetByRefFilterClause,
	SpatialNodeRepositoryGetManyOutputDTO,
	SpatialNodeRepositoryGetOneOutputDTO,
	SpatialNodeRepositoryPort,
	SpatialNodeRepositoryRestoreInputDTO,
	SpatialNodeRepositoryTreeRootFilterClause,
	SpatialNodeRepositoryUpdateManyOutputDTO,
	SpatialNodeRepositoryUpdateOutputDTO,
	SpatialNodeRepositoryUpdatePatchDTO,
} from "@backend/core/application/ports/repositories/spatial/spatial-node.repository.port";
import type { SpatialNodeEntity, SpatialNodeTreeNode } from "@backend/core/domain/spatial/entities";
import {
	findFirstRowMatchingAnyClause,
	findRowsMatchingAnyClause,
} from "@backend/infrastructure/adapters/repositories/shared/in-memory-entity-filter";
import { InMemoryTransactionManagerAdapter } from "@backend/infrastructure/adapters/transaction/in-memory-transaction-manager.adapter";
import type { InMemoryStore } from "@backend/infrastructure/integrations/in-memory-database/client";
import { idKey, spatialNodeId } from "@backend/infrastructure/integrations/shared/database-ids";
import { inject, injectable } from "tsyringe";

@injectable()
export class SpatialNodeInMemoryRepository extends BaseRepositoryErrors implements SpatialNodeRepositoryPort {
	constructor(
		@inject(InMemoryTransactionManagerAdapter)
		private readonly transactionManager: InMemoryTransactionManagerAdapter,
	) {
		super();
	}

	private insertRow(dto: SpatialNodeRepositoryCreateInputDTO): SpatialNodeRepositoryCreateOutputDTO {
		if (dto.parentId !== null) {
			const parent = this.store.spatialNodes.get(idKey(dto.parentId));
			if (!parent) this.throwNotFoundError("SpatialNode", dto.parentId);
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

	private patchStored(existing: SpatialNodeEntity, dto: SpatialNodeRepositoryUpdatePatchDTO): SpatialNodeEntity {
		const nextWorkspace = dto.workspace !== undefined ? dto.workspace : existing.workspace;
		const nextParent = dto.parentId !== undefined ? dto.parentId : existing.parentId;
		return {
			...existing,
			workspace: nextWorkspace,
			parentId: nextParent,
			rect: dto.rect !== undefined ? dto.rect : existing.rect,
			kind: dto.kind !== undefined ? dto.kind : existing.kind,
			ref: dto.ref !== undefined ? dto.ref : existing.ref,
			updatedAt: new Date(),
		};
	}

	private matchesRefClause(row: SpatialNodeEntity, clause: SpatialNodeRepositoryGetByRefFilterClause): boolean {
		return row.ref.entity === clause.ref.entity && row.ref.entityId === clause.ref.entityId;
	}

	async createOne(dto: SpatialNodeRepositoryCreateInputDTO): Promise<SpatialNodeRepositoryCreateOutputDTO> {
		return this.insertRow(dto);
	}

	async createMany(
		input: SpatialNodeRepositoryCreateManyInputDTO,
	): Promise<SpatialNodeRepositoryCreateManyOutputDTO> {
		let count = 0;
		for (const item of input.items) {
			this.insertRow(item);
			count += 1;
		}
		return { count };
	}

	async getOne(input: {
		filters: readonly SpatialNodeRepositoryFilterClause[];
	}): Promise<SpatialNodeRepositoryGetOneOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.spatialNodes.values(), input.filters);
		if (!row) this.throwNotFoundError("SpatialNode", input.filters);
		return row;
	}

	async getOneByRef(input: {
		filters: readonly SpatialNodeRepositoryGetByRefFilterClause[];
	}): Promise<SpatialNodeRepositoryGetOneOutputDTO> {
		for (const row of this.store.spatialNodes.values()) {
			if (input.filters.some((c) => this.matchesRefClause(row, c))) {
				return row;
			}
		}
		this.throwNotFoundError("SpatialNodeRef", input.filters);
	}

	async getMany(input?: {
		filters?: readonly SpatialNodeRepositoryFilterClause[];
	}): Promise<SpatialNodeRepositoryGetManyOutputDTO> {
		if (input?.filters === undefined) {
			return { items: [...this.store.spatialNodes.values()] };
		}
		if (input.filters.length === 0) return { items: [] };
		const rows = findRowsMatchingAnyClause([...this.store.spatialNodes.values()], input.filters);
		return { items: rows };
	}

	async updateOne(input: {
		filters: readonly SpatialNodeRepositoryFilterClause[];
		dto: SpatialNodeRepositoryUpdatePatchDTO;
	}): Promise<SpatialNodeRepositoryUpdateOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.spatialNodes.values(), input.filters);
		if (!row) this.throwNotFoundError("SpatialNode", input.filters);
		const updated = this.patchStored(row, input.dto);
		if (updated.parentId !== null) {
			const parent = this.store.spatialNodes.get(idKey(updated.parentId));
			if (!parent) this.throwNotFoundError("SpatialNode", updated.parentId);
		}
		this.store.spatialNodes.set(idKey(updated.id), updated);
		return updated;
	}

	async updateMany(input: {
		filters: readonly SpatialNodeRepositoryFilterClause[];
		dto: SpatialNodeRepositoryUpdatePatchDTO;
	}): Promise<SpatialNodeRepositoryUpdateManyOutputDTO> {
		const rows = findRowsMatchingAnyClause([...this.store.spatialNodes.values()], input.filters);
		let count = 0;
		for (const row of rows) {
			const updated = this.patchStored(row, input.dto);
			if (updated.parentId !== null) {
				const parent = this.store.spatialNodes.get(idKey(updated.parentId));
				if (!parent) this.throwNotFoundError("SpatialNode", updated.parentId);
			}
			this.store.spatialNodes.set(idKey(updated.id), updated);
			count += 1;
		}
		return { count };
	}

	async deleteOne(input: {
		filters: readonly SpatialNodeRepositoryFilterClause[];
	}): Promise<SpatialNodeRepositoryDeleteOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.spatialNodes.values(), input.filters);
		if (!row) this.throwNotFoundError("SpatialNode", input.filters);
		const key = idKey(row.id);
		for (const n of this.store.spatialNodes.values()) {
			if (n.parentId !== null && idKey(n.parentId) === key) {
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
		filters: readonly SpatialNodeRepositoryFilterClause[];
	}): Promise<SpatialNodeRepositoryDeleteManyOutputDTO> {
		const rows = findRowsMatchingAnyClause([...this.store.spatialNodes.values()], input.filters);
		let count = 0;
		for (const row of rows) {
			const key = idKey(row.id);
			const hasChild = [...this.store.spatialNodes.values()].some(
				(n) => n.parentId !== null && idKey(n.parentId) === key,
			);
			if (hasChild) continue;
			if (this.store.spatialNodes.delete(key)) count += 1;
		}
		return { count };
	}

	async restoreOne(input: SpatialNodeRepositoryRestoreInputDTO): Promise<SpatialNodeEntity> {
		const key = idKey(input.id);
		const existing = this.store.spatialNodes.get(key);
		if (input.parentId !== null) {
			const parent = this.store.spatialNodes.get(idKey(input.parentId));
			if (!parent) this.throwNotFoundError("SpatialNode", input.parentId);
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
		filters: readonly SpatialNodeRepositoryTreeRootFilterClause[];
	}): Promise<SpatialNodeTreeNode> {
		const root =
			input.filters.length === 0
				? undefined
				: [...this.store.spatialNodes.values()].find((n) =>
						input.filters.some((c) => idKey(n.id) === idKey(c.id)),
					);
		if (!root) this.throwNotFoundError("SpatialNode", input.filters);

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
			return {
				...node,
				children: children.map(build),
			};
		};
		return build(root);
	}

	private get store(): InMemoryStore {
		return this.transactionManager.session;
	}
}
