import type { UseCaseContext } from "#/backend/core/application/use-cases/use-case-context";
import { SubjectVO } from "@backend/core/domain/access/subject.vo";
import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";

/** User acting in their own user workspace (typical UI default). */
export function userUseCaseContext(externalUserId: string): UseCaseContext {
	return {
		actorSubject: SubjectVO.user(externalUserId),
		activeWorkspaceScope: WorkspaceVO.user(externalUserId),
	};
}
