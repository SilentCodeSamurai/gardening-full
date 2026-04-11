import type { AccessRole } from "@backend/core/domain/access/access-role";
import type { SubjectKey } from "@backend/core/domain/access/subject.vo";
import type { WorkspaceKey } from "@backend/core/domain/access/workspace.vo";
import type { WorkspaceRoleAssignmentEntity } from "@backend/core/domain/access/workspace-role-assignment.entity";

import type { ItemsContainer } from "@backend/shared/types";

export type WorkspaceRoleAssignmentUpsertInputDTO = {
	readonly subjectKey: SubjectKey;
	readonly workspaceKey: WorkspaceKey;
	readonly role: AccessRole;
	readonly grantSource?: string;
};

export type WorkspaceRoleAssignmentUpsertOutputDTO = WorkspaceRoleAssignmentEntity;

export type WorkspaceRoleAssignmentRevokeInputDTO = {
	readonly subjectKey: SubjectKey;
	readonly workspaceKey: WorkspaceKey;
	readonly role: AccessRole;
};

export type WorkspaceRoleAssignmentGetBySubjectAndWorkspaceInputDTO = {
	readonly subjectKey: SubjectKey;
	readonly workspaceKey: WorkspaceKey;
};

export type WorkspaceRoleAssignmentGetBySubjectAndWorkspaceOutputDTO = ItemsContainer<WorkspaceRoleAssignmentEntity>;

export type WorkspaceRoleAssignmentListForSubjectInputDTO = {
	readonly subjectKey: SubjectKey;
};

export type WorkspaceRoleAssignmentListForSubjectOutputDTO = ItemsContainer<WorkspaceRoleAssignmentEntity>;

export interface WorkspaceRoleAssignmentRepositoryPort {
	upsertWorkspaceRoleAssignment(
		input: WorkspaceRoleAssignmentUpsertInputDTO,
	): Promise<WorkspaceRoleAssignmentUpsertOutputDTO>;

	revokeWorkspaceRoleAssignment(input: WorkspaceRoleAssignmentRevokeInputDTO): Promise<void>;

	getBySubjectAndWorkspace(input: WorkspaceRoleAssignmentGetBySubjectAndWorkspaceInputDTO): Promise<WorkspaceRoleAssignmentGetBySubjectAndWorkspaceOutputDTO>;

	listAssignmentsForSubject(
		input: WorkspaceRoleAssignmentListForSubjectInputDTO,
	): Promise<WorkspaceRoleAssignmentListForSubjectOutputDTO>;
}
