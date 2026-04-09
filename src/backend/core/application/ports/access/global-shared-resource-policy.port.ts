import type { ResourceRef } from "@backend/core/domain/resource-access";

/**
 * Identifies resources that qualify for `ALLOW_GLOBAL_SHARED_READ` (readable without a role on the actor).
 * Implementations encode product rules (e.g. a steward principal holds admin on the resource).
 */
export interface GlobalSharedResourcePolicyPort {
	flagsForResourceRefs(resourceRefs: readonly ResourceRef[]): Promise<readonly boolean[]>;
}
