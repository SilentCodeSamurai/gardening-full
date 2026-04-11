import type {
	AccessAuditPort,
	WorkspaceAccessRoleAssignedAuditEvent,
	WorkspaceAccessRoleRevokedAuditEvent,
} from "#/backend/core/application/ports/access/access-audit.port";

export class NoopResourceAccessAudit implements AccessAuditPort {
	recordRoleAssigned(_event: WorkspaceAccessRoleAssignedAuditEvent): void {}
	recordRoleRevoked(_event: WorkspaceAccessRoleRevokedAuditEvent): void {}
}
