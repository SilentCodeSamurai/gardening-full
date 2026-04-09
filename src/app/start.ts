import "reflect-metadata";

import { createStart } from "@tanstack/react-start";

/**
 * TanStack Start loads this module for the server handler and calls
 * {@link startInstance.getOptions} while resolving each request (see Start server core).
 * {@link ensureBackendBootstrap} is cached, so after the first successful run this is a
 * no-op on later requests — unlike doing heavy work directly in `server.ts` `fetch`.
 */
export const startInstance = createStart(async () => {
	if (import.meta.env.SSR) {
		const { ensureBackendBootstrap } = await import("./server-backend-bootstrap");
		await ensureBackendBootstrap();
	}
	return {};
});
