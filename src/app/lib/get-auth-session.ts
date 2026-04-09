import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { authClient } from "@/lib/auth-client";

export type AuthSessionUser = { id: string };

const resolveAuthSession = createIsomorphicFn()
	.server(async (): Promise<{ user: AuthSessionUser } | null> => {
		const { betterAuthBackendClient } = await import(
			"@backend/infrastructure/integrations/better-auth/client"
		);
		const headers = getRequestHeaders();
		const session = await betterAuthBackendClient.api.getSession({ headers });
		const user = session?.user;
		return user?.id != null ? { user: { id: String(user.id) } } : null;
	})
	.client(async (): Promise<{ user: AuthSessionUser } | null> => {
		const { data } = await authClient.getSession();
		const user = data?.user;
		return user?.id != null ? { user: { id: String(user.id) } } : null;
	});

/**
 * Session check for route guards: cookies + better-auth on the server, client session in the browser.
 */
export async function getAuthSession(): Promise<{ user: AuthSessionUser } | null> {
	return resolveAuthSession();
}
