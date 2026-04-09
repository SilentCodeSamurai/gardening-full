import type { AccessRole } from "./access-role";
import type { IdentityRef } from "./identity-ref.vo";
import type { ResourceRef } from "./resource-ref.vo";

export type ResoursePermissionEntityId = string & { __brand: "ResoursePermissionId" };

/**
 * Persisted **role assignment** (v1: role-only, no direct ACEs).
 */
export type ResoursePermissionEntity = {
	readonly id: ResoursePermissionEntityId;
	readonly subjectRef: IdentityRef;
	readonly resourceRef: ResourceRef;
	readonly role: AccessRole;
	readonly createdAt: Date;
	readonly grantSource?: string;
};
