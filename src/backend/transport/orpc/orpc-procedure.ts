import { ORPCError, os } from "@orpc/server";
import { betterAuthBackendClient } from "#/backend/infrastructure/integrations/better-auth/client";

export type OrpcInitialContext = {
	readonly headers: Headers;
};

type BetterAuthSession = Awaited<ReturnType<(typeof betterAuthBackendClient)["api"]["getSession"]>>;

export type OrpcContext = OrpcInitialContext & {
	readonly authSession: BetterAuthSession;
};

export type AuthenticatedOrpcContext = OrpcContext & {
	readonly authSession: NonNullable<BetterAuthSession>;
};

const base = os.$context<OrpcInitialContext>();

// Middleware 1: Inject authSession. Declared on base (initial context).
export const withBetterAuthSession = base.middleware(async ({ context, next }) => {
	const authSession = await betterAuthBackendClient.api.getSession({
		headers: context.headers,
	});
	return next({ context: { authSession } });
});

// Middleware 2: Guard authSession. Declared on base.$context<OrpcContext>() (expects authSession).
const authContext = base.$context<OrpcContext>();
export const authenticatedMiddleware = authContext.middleware(async ({ context, next }) => {
	if (!context.authSession) {
		throw new ORPCError("UNAUTHORIZED", {
			defined: true,
			message: "Unauthorized",
		});
	}
	return next({ context: { authSession: context.authSession } });
});

export const authenticatedProcedure = base.use(withBetterAuthSession).use(authenticatedMiddleware);
