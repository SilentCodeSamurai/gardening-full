import type { BaseEntity } from "@backend/core/domain/shared/entities";
import type { AccessRole } from "./access-role";
import type { SubjectKey } from "./subject.vo";
import type { WorkspaceKey } from "./workspace.vo";

export type WorkspaceRoleAssignmentEntityId = string & { __brand: "WorkspaceRoleAssignmentEntityId" };

export type WorkspaceRoleAssignmentEntity = BaseEntity<WorkspaceRoleAssignmentEntityId> & {
	readonly subjectKey: SubjectKey;
	readonly workspaceKey: WorkspaceKey;
	readonly role: AccessRole;
	readonly grantSource?: string;
};
