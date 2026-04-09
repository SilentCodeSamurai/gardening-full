import type { IdentityRef } from "@backend/core/domain/resource-access";

/**
 * Optional expansion of a single identity reference into additional subject refs (e.g. org membership).
 */
export interface SubjectExpansionResolverPort {
	expandSubjects(ref: IdentityRef): Promise<IdentityRef[]>;
}
