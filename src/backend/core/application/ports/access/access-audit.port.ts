import type { AccessRole } from "@backend/core/domain/access/access-role";
import type { SubjectKey } from "@backend/core/domain/access/subject.vo";
import type { WorkspaceKey } from "@backend/core/domain/access/workspace.vo";

export type WorkspaceAccessRoleAssignedAuditEvent = {
	readonly actorSubjectKey: SubjectKey;
	readonly targetSubjectKey: SubjectKey;
	readonly workspaceKey: WorkspaceKey;
	readonly role: AccessRole;
	readonly grantSource?: string;
};

export type WorkspaceAccessRoleRevokedAuditEvent = {
	readonly actorSubjectKey: SubjectKey;
	readonly targetSubjectKey: SubjectKey;
	readonly workspaceKey: WorkspaceKey;
	readonly role: AccessRole;
};

export interface AccessAuditPort {
	recordRoleAssigned(event: WorkspaceAccessRoleAssignedAuditEvent): void;
	recordRoleRevoked(event: WorkspaceAccessRoleRevokedAuditEvent): void;
}
