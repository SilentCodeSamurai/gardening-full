import { SubjectVO } from "@backend/core/domain/access/subject.vo";
import type { UseCaseContext } from "#/backend/core/application/use-cases/use-case-context";
import { WorkspaceVO } from "#/backend/core/domain/access/workspace.vo";
import type { AuthenticatedOrpcContext } from "./orpc-procedure";

/**
 * Maps Better Auth `getSession` result to {@link UseCaseContext} for use cases.
 */
export function createUseCaseContextFromOrpc(context: AuthenticatedOrpcContext): UseCaseContext {
	const userId = context.authSession.user.id;
	const actorSubject = SubjectVO.user(userId);
	const activeWorkspaceScope = WorkspaceVO.user(userId);
	return {
		actorSubject,
		activeWorkspaceScope,
	};
}
