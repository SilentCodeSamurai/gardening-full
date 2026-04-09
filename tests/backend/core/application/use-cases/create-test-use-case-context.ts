import { defaultWorkspaceRef } from "#/backend/core/application/resource-refs";
import type { UseCaseContext } from "#/backend/core/application/use-cases/use-case-context";

import { testsLocalServiceAccount } from "./service-accounts";

/** Test-only context aligned with {@link testsLocalServiceAccount}. */
export function createTestUseCaseContext(): UseCaseContext {
	return {
		actorRef: testsLocalServiceAccount,
		workspaceRef: defaultWorkspaceRef(),
	};
}
