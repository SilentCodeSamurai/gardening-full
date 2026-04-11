import type {
	WorkspaceRoleAssignmentGetBySubjectAndWorkspaceInputDTO,
	WorkspaceRoleAssignmentGetBySubjectAndWorkspaceOutputDTO,
	WorkspaceRoleAssignmentListForSubjectInputDTO,
	WorkspaceRoleAssignmentListForSubjectOutputDTO,
	WorkspaceRoleAssignmentRepositoryPort,
	WorkspaceRoleAssignmentRevokeInputDTO,
	WorkspaceRoleAssignmentUpsertInputDTO,
} from "@backend/core/application/ports/repositories/access/workspace-role-assignment.repository.port";
import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { WorkspaceRoleAssignmentEntity } from "@backend/core/domain/access/workspace-role-assignment.entity";
import type { InMemoryStore } from "@backend/infrastructure/integrations/in-memory-database/client";
import { workspaceRoleAssignmentId } from "@backend/infrastructure/integrations/shared/database-ids";
import type { SubjectKey } from "#/backend/core/domain/access/subject.vo";
import type { WorkspaceKey } from "#/backend/core/domain/access/workspace.vo";

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

	putWorkspaceRoleAssignmentSync(input: WorkspaceRoleAssignmentUpsertInputDTO): WorkspaceRoleAssignmentEntity {
		const key = compositeKey(input.subjectKey, input.workspaceKey);
		const existing = this.store.workspaceRoleAssignments.get(key);
		const entity: WorkspaceRoleAssignmentEntity = {
			id: existing?.id ?? workspaceRoleAssignmentId(),
			createdAt: existing?.createdAt ?? new Date(),
			updatedAt: new Date(),
			subjectKey: input.subjectKey,
			workspaceKey: input.workspaceKey,
			role: input.role,
			grantSource: input.grantSource ?? existing?.grantSource,
		};
		this.store.workspaceRoleAssignments.set(key, entity);
		return entity;
	}

	async upsertWorkspaceRoleAssignment(
		input: WorkspaceRoleAssignmentUpsertInputDTO,
	): Promise<WorkspaceRoleAssignmentEntity> {
		return this.putWorkspaceRoleAssignmentSync(input);
	}

	async revokeWorkspaceRoleAssignment(input: WorkspaceRoleAssignmentRevokeInputDTO): Promise<void> {
		const key = compositeKey(input.subjectKey, input.workspaceKey);
		this.store.workspaceRoleAssignments.delete(key);
	}

	async listAssignmentsForSubject(
		input: WorkspaceRoleAssignmentListForSubjectInputDTO,
	): Promise<WorkspaceRoleAssignmentListForSubjectOutputDTO> {
		return {
			items: [...this.store.workspaceRoleAssignments.values()].filter((r) => r.subjectKey === input.subjectKey),
		};
	}

	async getBySubjectAndWorkspace(
		input: WorkspaceRoleAssignmentGetBySubjectAndWorkspaceInputDTO,
	): Promise<WorkspaceRoleAssignmentGetBySubjectAndWorkspaceOutputDTO> {
		const key = compositeKey(input.subjectKey, input.workspaceKey);
		const assignment = this.store.workspaceRoleAssignments.get(key);
		if (!assignment) {
			return { items: [] };
		}
		return {
			items: [assignment],
		};
	}
}
