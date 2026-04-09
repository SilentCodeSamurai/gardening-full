import type { AccessRole, IdentityRef, ResourceRef } from "@backend/core/domain/resource-access";

export type ResourceAccessRoleAssignedAuditEvent = {
	readonly actorRef: IdentityRef;
	readonly subjectRef: IdentityRef;
	readonly resourceRef: ResourceRef;
	readonly role: AccessRole;
	readonly grantSource?: string;
};

export type ResourceAccessRoleRevokedAuditEvent = {
	readonly actorRef: IdentityRef;
	readonly subjectRef: IdentityRef;
	readonly resourceRef: ResourceRef;
	readonly role: AccessRole;
};

export interface ResourceAccessAuditPort {
	recordRoleAssigned(event: ResourceAccessRoleAssignedAuditEvent): void;
	recordRoleRevoked(event: ResourceAccessRoleRevokedAuditEvent): void;
}
