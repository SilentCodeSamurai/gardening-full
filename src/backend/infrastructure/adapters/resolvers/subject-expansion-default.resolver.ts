import type { SubjectExpansionResolverPort } from "@backend/core/application/ports/resolvers/subject-expansion-resolver.port";
import type { IdentityRef } from "@backend/core/domain/resource-access";

/**
 * v1: no expansion; only the actor ref is used as subject.
 */
export class SubjectExpansionPassthroughResolver implements SubjectExpansionResolverPort {
	async expandSubjects(ref: IdentityRef): Promise<IdentityRef[]> {
		return [ref];
	}
}
