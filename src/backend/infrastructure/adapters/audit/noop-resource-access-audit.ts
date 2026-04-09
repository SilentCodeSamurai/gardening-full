import type {
	ResourceAccessAuditPort,
	ResourceAccessRoleAssignedAuditEvent,
	ResourceAccessRoleRevokedAuditEvent,
} from "@backend/core/application/ports/audit/resource-access-audit.port";

export class NoopResourceAccessAudit implements ResourceAccessAuditPort {
	recordRoleAssigned(_event: ResourceAccessRoleAssignedAuditEvent): void {}
	recordRoleRevoked(_event: ResourceAccessRoleRevokedAuditEvent): void {}
}
