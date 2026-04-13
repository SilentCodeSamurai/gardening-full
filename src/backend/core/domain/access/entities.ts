import type { BaseEntity, BaseEntityId } from "../shared/entities";
import type { SubjectVO } from "./subject.vo";
import type { AccessRole } from "./types";
import type { WorkspaceVO } from "./workspace.vo";

/**
 * Identifier for a workspace role assignment.
 */
export type WorkspaceRoleAssignmentEntityId = BaseEntityId<string, "WorkspaceRoleAssignment">;

/**
 * Persisted role assignment for a subject on a workspace scope.
 */
export type WorkspaceRoleAssignmentEntity = BaseEntity<WorkspaceRoleAssignmentEntityId> & {
	readonly subject: SubjectVO;
	readonly workspace: WorkspaceVO;
	readonly role: AccessRole;
	readonly grantSource?: string;
};
