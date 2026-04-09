import { IdentityRef } from "@backend/core/domain/resource-access";
import { defaultWorkspaceRef } from "#/backend/core/application/resource-refs";
import type { UseCaseContext } from "#/backend/core/application/use-cases/use-case-context";

import type { OrpcContext } from "./orpc-procedure";

/**
 * Maps Better Auth `getSession` result to {@link UseCaseContext} for use cases.
 * Unauthenticated callers use `anonymous` service account (access still enforced per resource).
 */
export function createUseCaseContextFromOrpc(context: OrpcContext): UseCaseContext {
	return createUseCaseContextFromAuthSession(context.authSession);
}

export function createUseCaseContextFromAuthSession(authSession: OrpcContext["authSession"]): UseCaseContext {
	const id = authSession?.user?.id;
	const actorRef =
		id != null && String(id) !== "" ? IdentityRef.user(String(id)) : IdentityRef.serviceAccount("anonymous");
	return {
		actorRef,
		workspaceRef: defaultWorkspaceRef(),
	};
}

/** @deprecated Prefer {@link createUseCaseContextFromOrpc} in transport; tests may still use this. */
export function createUseCaseContext(): UseCaseContext {
	return {
		actorRef: IdentityRef.serviceAccount("dev-local"),
		workspaceRef: defaultWorkspaceRef(),
	};
}
