import type { UseCaseContext } from "#/backend/core/application/use-cases/use-case-context";
import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";

import { testsLocalServiceAccount } from "./service-accounts";

/** Test-only context aligned with {@link testsLocalServiceAccount} (global shared scope). */
export function createTestUseCaseContext(): UseCaseContext {
	return {
		actorSubject: testsLocalServiceAccount,
		activeWorkspaceScope: WorkspaceVO.globalShared(),
	};
}
