import type {
	WorkspaceRoleAssignmentRepositoryPort,
	WorkspaceRoleAssignmentRepositoryCreateInputDTO,
	WorkspaceRoleAssignmentRepositoryCreateManyInputDTO,
	WorkspaceRoleAssignmentRepositoryCreateManyOutputDTO,
	WorkspaceRoleAssignmentRepositoryCreateOutputDTO,
	WorkspaceRoleAssignmentRepositoryDeleteManyOutputDTO,
	WorkspaceRoleAssignmentRepositoryDeleteOutputDTO,
	WorkspaceRoleAssignmentRepositoryFilterClause,
	WorkspaceRoleAssignmentRepositoryGetManyOutputDTO,
	WorkspaceRoleAssignmentRepositoryGetOneOutputDTO,
	WorkspaceRoleAssignmentRepositoryUpdateManyOutputDTO,
	WorkspaceRoleAssignmentRepositoryUpdateOutputDTO,
	WorkspaceRoleAssignmentRepositoryUpdatePatchDTO,
	WorkspaceRoleAssignmentRepositoryUpsertInputDTO,
	WorkspaceRoleAssignmentRepositoryUpsertOutputDTO,
} from "@backend/core/application/ports/repositories/access/workspace-role-assignment.repository.port";
import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { WorkspaceRoleAssignmentEntity } from "@backend/core/domain/access/entities";
import type { SubjectKey } from "@backend/core/domain/access/subject.vo";
import type { WorkspaceKey } from "@backend/core/domain/access/workspace.vo";
import {
	findFirstRowMatchingAnyClause,
	findRowsMatchingAnyClause,
} from "@backend/infrastructure/adapters/repositories/shared/in-memory-entity-filter";
import type { InMemoryStore } from "@backend/infrastructure/integrations/in-memory-database/client";
import { idKey, workspaceRoleAssignmentId } from "@backend/infrastructure/integrations/shared/database-ids";

function compositeKey(subjectKey: SubjectKey, workspaceKey: WorkspaceKey): `${SubjectKey}|${WorkspaceKey}` {
	return `${subjectKey}|${workspaceKey}` as const;
}

export class WorkspaceRoleAssignmentInMemoryRepository
	extends BaseRepositoryErrors
	implements WorkspaceRoleAssignmentRepositoryPort
{
	constructor(private readonly store: InMemoryStore) {
		super();
	}

	private patchStored(
		existing: WorkspaceRoleAssignmentEntity,
		dto: WorkspaceRoleAssignmentRepositoryUpdatePatchDTO,
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
		dto: WorkspaceRoleAssignmentRepositoryCreateInputDTO,
	): WorkspaceRoleAssignmentRepositoryCreateOutputDTO {
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
			...dto,
			id,
			createdAt: now,
			updatedAt: now,
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
		dto: WorkspaceRoleAssignmentRepositoryCreateInputDTO,
	): Promise<WorkspaceRoleAssignmentRepositoryCreateOutputDTO> {
		return this.insertRow(dto);
	}

	async createMany(
		input: WorkspaceRoleAssignmentRepositoryCreateManyInputDTO,
	): Promise<WorkspaceRoleAssignmentRepositoryCreateManyOutputDTO> {
		let count = 0;
		for (const item of input.items) {
			this.insertRow(item);
			count += 1;
		}
		return { count };
	}

	async upsertOne(
		input: WorkspaceRoleAssignmentRepositoryUpsertInputDTO,
	): Promise<WorkspaceRoleAssignmentRepositoryUpsertOutputDTO> {
		const mapKey = compositeKey(input.subjectKey, input.workspaceKey);
		if (this.store.workspaceRoleAssignments.has(mapKey)) {
			return this.updateOne({
				filters: [{ subjectKey: input.subjectKey, workspaceKey: input.workspaceKey }],
				dto:
					input.grantSource !== undefined
						? { role: input.role, grantSource: input.grantSource }
						: { role: input.role },
			});
		}
		return this.createOne({
			subjectKey: input.subjectKey,
			workspaceKey: input.workspaceKey,
			role: input.role,
			grantSource: input.grantSource,
		});
	}

	async getOne(input: {
		filters: readonly WorkspaceRoleAssignmentRepositoryFilterClause[];
	}): Promise<WorkspaceRoleAssignmentRepositoryGetOneOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.workspaceRoleAssignments.values(), input.filters);
		if (!row) this.throwNotFoundError("WorkspaceRoleAssignment", input.filters);
		return row;
	}

	async getMany(input?: {
		filters?: readonly WorkspaceRoleAssignmentRepositoryFilterClause[];
	}): Promise<WorkspaceRoleAssignmentRepositoryGetManyOutputDTO> {
		if (input?.filters === undefined) {
			return { items: [...this.store.workspaceRoleAssignments.values()] };
		}
		if (input.filters.length === 0) return { items: [] };
		const rows = findRowsMatchingAnyClause([...this.store.workspaceRoleAssignments.values()], input.filters);
		return { items: rows };
	}

	async updateOne(input: {
		filters: readonly WorkspaceRoleAssignmentRepositoryFilterClause[];
		dto: WorkspaceRoleAssignmentRepositoryUpdatePatchDTO;
	}): Promise<WorkspaceRoleAssignmentRepositoryUpdateOutputDTO> {
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
		filters: readonly WorkspaceRoleAssignmentRepositoryFilterClause[];
		dto: WorkspaceRoleAssignmentRepositoryUpdatePatchDTO;
	}): Promise<WorkspaceRoleAssignmentRepositoryUpdateManyOutputDTO> {
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
		filters: readonly WorkspaceRoleAssignmentRepositoryFilterClause[];
	}): Promise<WorkspaceRoleAssignmentRepositoryDeleteOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.workspaceRoleAssignments.values(), input.filters);
		if (!row) this.throwNotFoundError("WorkspaceRoleAssignment", input.filters);
		const key = compositeKey(row.subjectKey, row.workspaceKey);
		this.store.workspaceRoleAssignments.delete(key);
		return row.id;
	}

	async deleteMany(input: {
		filters: readonly WorkspaceRoleAssignmentRepositoryFilterClause[];
	}): Promise<WorkspaceRoleAssignmentRepositoryDeleteManyOutputDTO> {
		const rows = findRowsMatchingAnyClause([...this.store.workspaceRoleAssignments.values()], input.filters);
		let count = 0;
		for (const row of rows) {
			const key = compositeKey(row.subjectKey, row.workspaceKey);
			if (this.store.workspaceRoleAssignments.delete(key)) count += 1;
		}
		return { count };
	}
}
