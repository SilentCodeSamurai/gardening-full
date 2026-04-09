import { os } from "@orpc/server";
import { betterAuthBackendClient } from "#/backend/infrastructure/integrations/better-auth/client";

/**
 * Initial context for every ORPC/Fetch handler (see {@link https://orpc.unnoq.com/docs/context}).
 * Pass `headers: request.headers` from `RPCHandler` / `OpenAPIHandler`.
 */
export type OrpcInitialContext = {
	readonly headers: Headers;
};

export type OrpcContext = OrpcInitialContext & {
	readonly authSession: Awaited<ReturnType<(typeof betterAuthBackendClient)["api"]["getSession"]>>;
};

const base = os.$context<OrpcInitialContext>();

const withBetterAuthSession = base.middleware(async ({ context, next }) => {
	const authSession = await betterAuthBackendClient.api.getSession({
		headers: context.headers,
	});
	return next({ context: { authSession } });
});

/**
 * Standard procedure: resolves Better Auth session via {@link betterAuthBackendClient.api.getSession} (see {@link https://www.better-auth.com/docs/concepts/api}).
 */
export const procedure = base.use(withBetterAuthSession);
