import type {
	WorkspaceRoleAssignmentRepositoryPortV2,
	WorkspaceRoleAssignmentRepositoryV2CreateInputDTO,
	WorkspaceRoleAssignmentRepositoryV2CreateManyInputDTO,
	WorkspaceRoleAssignmentRepositoryV2CreateManyOutputDTO,
	WorkspaceRoleAssignmentRepositoryV2CreateOutputDTO,
	WorkspaceRoleAssignmentRepositoryV2DeleteManyOutputDTO,
	WorkspaceRoleAssignmentRepositoryV2DeleteOutputDTO,
	WorkspaceRoleAssignmentRepositoryV2FilterClause,
	WorkspaceRoleAssignmentRepositoryV2GetManyOutputDTO,
	WorkspaceRoleAssignmentRepositoryV2GetOneOutputDTO,
	WorkspaceRoleAssignmentRepositoryV2UpdateManyOutputDTO,
	WorkspaceRoleAssignmentRepositoryV2UpdateOutputDTO,
	WorkspaceRoleAssignmentRepositoryV2UpdatePatchDTO,
} from "@backend/core/application/ports/repositories/access/workspace-role-assignment.repository.port.v2";
import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { WorkspaceRoleAssignmentEntity } from "@backend/core/domain/access/entities";
import type { SubjectKey } from "@backend/core/domain/access/subject.vo";
import type { WorkspaceKey } from "@backend/core/domain/access/workspace.vo";
import {
	findFirstRowMatchingAnyClause,
	findRowsMatchingAnyClause,
} from "@backend/infrastructure/adapters/repositories/shared/in-memory-v2-entity-filter";
import type { InMemoryStoreV2 } from "@backend/infrastructure/integrations/in-memory-database/client.v2";
import { idKey, workspaceRoleAssignmentId } from "@backend/infrastructure/integrations/shared/database-ids";

function compositeKey(subjectKey: SubjectKey, workspaceKey: WorkspaceKey): `${SubjectKey}|${WorkspaceKey}` {
	return `${subjectKey}|${workspaceKey}` as const;
}

export class WorkspaceRoleAssignmentInMemoryRepositoryV2
	extends BaseRepositoryErrors
	implements WorkspaceRoleAssignmentRepositoryPortV2
{
	constructor(private readonly store: InMemoryStoreV2) {
		super();
	}

	private patchStored(
		existing: WorkspaceRoleAssignmentEntity,
		dto: WorkspaceRoleAssignmentRepositoryV2UpdatePatchDTO,
	): WorkspaceRoleAssignmentEntity {
		return {
			...existing,
			subjectKey: dto.subjectKey !== undefined ? dto.subjectKey : existing.subjectKey,
			workspaceKey: dto.workspaceKey !== undefined ? dto.workspaceKey : existing.workspaceKey,
			role: dto.role !== undefined ? dto.role : existing.role,
			grantSource: dto.grantSource !== undefined ? dto.grantSource : existing.grantSource,
			updatedAt: new Date(),
		};
	}

	private insertRow(
		dto: WorkspaceRoleAssignmentRepositoryV2CreateInputDTO,
	): WorkspaceRoleAssignmentRepositoryV2CreateOutputDTO {
		const mapKey = compositeKey(dto.subjectKey, dto.workspaceKey);
		if (this.store.workspaceRoleAssignments.has(mapKey)) {
			this.throwConflictError({
				operation: "create",
				reason: "duplicate-subject-workspace",
				context: { subjectKey: dto.subjectKey, workspaceKey: dto.workspaceKey },
				message: "Workspace role assignment already exists for this subject and workspace.",
			});
		}
		const now = new Date();
		const id = workspaceRoleAssignmentId();
		const row: WorkspaceRoleAssignmentEntity = {
			id,
			createdAt: now,
			updatedAt: now,
			subjectKey: dto.subjectKey,
			workspaceKey: dto.workspaceKey,
			role: dto.role,
			grantSource: dto.grantSource,
		};
		this.store.workspaceRoleAssignments.set(mapKey, row);
		return row;
	}

	private assertVacantTargetKey(
		targetKey: `${SubjectKey}|${WorkspaceKey}`,
		owningId: WorkspaceRoleAssignmentEntity["id"],
	): void {
		const occupant = this.store.workspaceRoleAssignments.get(targetKey);
		if (occupant && idKey(occupant.id) !== idKey(owningId)) {
			this.throwConflictError({
				operation: "update",
				reason: "duplicate-subject-workspace",
				context: { targetKey },
				message: "Another assignment already uses this subject and workspace pair.",
			});
		}
	}

	private replaceInMap(previousKey: `${SubjectKey}|${WorkspaceKey}`, row: WorkspaceRoleAssignmentEntity): void {
		const nextKey = compositeKey(row.subjectKey, row.workspaceKey);
		if (previousKey !== nextKey) {
			this.store.workspaceRoleAssignments.delete(previousKey);
		}
		this.store.workspaceRoleAssignments.set(nextKey, row);
	}

	async createOne(
		dto: WorkspaceRoleAssignmentRepositoryV2CreateInputDTO,
	): Promise<WorkspaceRoleAssignmentRepositoryV2CreateOutputDTO> {
		return this.insertRow(dto);
	}

	async createMany(
		input: WorkspaceRoleAssignmentRepositoryV2CreateManyInputDTO,
	): Promise<WorkspaceRoleAssignmentRepositoryV2CreateManyOutputDTO> {
		let count = 0;
		for (const item of input.items) {
			this.insertRow(item);
			count += 1;
		}
		return { count };
	}

	async getOne(input: {
		filters: readonly WorkspaceRoleAssignmentRepositoryV2FilterClause[];
	}): Promise<WorkspaceRoleAssignmentRepositoryV2GetOneOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.workspaceRoleAssignments.values(), input.filters);
		if (!row) this.throwNotFoundError("WorkspaceRoleAssignment", input.filters);
		return row;
	}

	async getMany(input?: {
		filters?: readonly WorkspaceRoleAssignmentRepositoryV2FilterClause[];
	}): Promise<WorkspaceRoleAssignmentRepositoryV2GetManyOutputDTO> {
		if (input?.filters === undefined) {
			return { items: [...this.store.workspaceRoleAssignments.values()] };
		}
		if (input.filters.length === 0) return { items: [] };
		const rows = findRowsMatchingAnyClause([...this.store.workspaceRoleAssignments.values()], input.filters);
		return { items: rows };
	}

	async updateOne(input: {
		filters: readonly WorkspaceRoleAssignmentRepositoryV2FilterClause[];
		dto: WorkspaceRoleAssignmentRepositoryV2UpdatePatchDTO;
	}): Promise<WorkspaceRoleAssignmentRepositoryV2UpdateOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.workspaceRoleAssignments.values(), input.filters);
		if (!row) this.throwNotFoundError("WorkspaceRoleAssignment", input.filters);
		const previousKey = compositeKey(row.subjectKey, row.workspaceKey);
		const updated = this.patchStored(row, input.dto);
		const nextKey = compositeKey(updated.subjectKey, updated.workspaceKey);
		if (previousKey !== nextKey) {
			this.assertVacantTargetKey(nextKey, updated.id);
		}
		this.replaceInMap(previousKey, updated);
		return updated;
	}

	async updateMany(input: {
		filters: readonly WorkspaceRoleAssignmentRepositoryV2FilterClause[];
		dto: WorkspaceRoleAssignmentRepositoryV2UpdatePatchDTO;
	}): Promise<WorkspaceRoleAssignmentRepositoryV2UpdateManyOutputDTO> {
		const rows = findRowsMatchingAnyClause([...this.store.workspaceRoleAssignments.values()], input.filters);
		let count = 0;
		for (const row of rows) {
			const previousKey = compositeKey(row.subjectKey, row.workspaceKey);
			const updated = this.patchStored(row, input.dto);
			const nextKey = compositeKey(updated.subjectKey, updated.workspaceKey);
			if (previousKey !== nextKey) {
				this.assertVacantTargetKey(nextKey, updated.id);
			}
			this.replaceInMap(previousKey, updated);
			count += 1;
		}
		return { count };
	}

	async deleteOne(input: {
		filters: readonly WorkspaceRoleAssignmentRepositoryV2FilterClause[];
	}): Promise<WorkspaceRoleAssignmentRepositoryV2DeleteOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.workspaceRoleAssignments.values(), input.filters);
		if (!row) this.throwNotFoundError("WorkspaceRoleAssignment", input.filters);
		const key = compositeKey(row.subjectKey, row.workspaceKey);
		this.store.workspaceRoleAssignments.delete(key);
		return row.id;
	}

	async deleteMany(input: {
		filters: readonly WorkspaceRoleAssignmentRepositoryV2FilterClause[];
	}): Promise<WorkspaceRoleAssignmentRepositoryV2DeleteManyOutputDTO> {
		const rows = findRowsMatchingAnyClause([...this.store.workspaceRoleAssignments.values()], input.filters);
		let count = 0;
		for (const row of rows) {
			const key = compositeKey(row.subjectKey, row.workspaceKey);
			if (this.store.workspaceRoleAssignments.delete(key)) count += 1;
		}
		return { count };
	}
}
