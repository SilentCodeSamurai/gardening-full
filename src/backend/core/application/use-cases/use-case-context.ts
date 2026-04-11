import type { SubjectVO } from "@backend/core/domain/access/subject.vo";
import type { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";

/**
 * Per use-case invocation: acting subject and active workspace scope.
 */
export type UseCaseContext = {
	/** Authenticated principal actor (user or service account). */
	readonly actorSubject: SubjectVO;
	/** Current active workspace scope. */
	readonly activeWorkspaceScope: WorkspaceVO;
};

/**
 * Standardized use-case request envelope.
 * Every use case receives `context` + optional `dto`.
 */
export type UseCaseRequest<TInput = undefined> = [TInput] extends [undefined]
	? { readonly context: UseCaseContext }
	: { readonly context: UseCaseContext; readonly dto: TInput };
