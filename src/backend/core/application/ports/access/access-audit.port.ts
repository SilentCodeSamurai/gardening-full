import type { SubjectVO } from "@backend/core/domain/access/subject.vo";
import type { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import type { InjectionToken } from "tsyringe";
import type { AccessRole } from "#/backend/core/domain/access/types";

export type WorkspaceAccessRoleAssignedAuditEvent = {
	readonly actorSubject: SubjectVO;
	readonly targetSubject: SubjectVO;
	readonly workspace: WorkspaceVO;
	readonly role: AccessRole;
	readonly grantSource?: string;
};

export type WorkspaceAccessRoleRevokedAuditEvent = {
	readonly actorSubject: SubjectVO;
	readonly targetSubject: SubjectVO;
	readonly workspace: WorkspaceVO;
	readonly role: AccessRole;
};

export interface AccessAuditPort {
	recordRoleAssigned(event: WorkspaceAccessRoleAssignedAuditEvent): void;
	recordRoleRevoked(event: WorkspaceAccessRoleRevokedAuditEvent): void;
}

export const AccessAuditPortToken: InjectionToken<AccessAuditPort> = Symbol.for("AccessAuditPort");
