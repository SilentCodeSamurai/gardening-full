import type { IdentityRef, ResourceRef } from "@backend/core/domain/resource-access";

/**
 * Per use-case invocation: who is acting and which workspace (or equivalent scope) the request targets.
 * Use cases pass `workspaceRef` into `assertCanCreate` for creates under that scope.
 */
export type UseCaseContext = {
	readonly actorRef: IdentityRef;
	readonly workspaceRef: ResourceRef;
};

/**
 * Standardized use-case request envelope.
 * Every use case receives `context` + optional `dto`.
 */
export type UseCaseRequest<TInput = undefined> = [TInput] extends [undefined]
	? { readonly context: UseCaseContext }
	: { readonly context: UseCaseContext; readonly dto: TInput };
