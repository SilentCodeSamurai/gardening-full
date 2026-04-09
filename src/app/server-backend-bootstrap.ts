import { bootstrap } from "@backend/bootstrap/bootstrap-backend";

let bootstrapOnce: Promise<void> | undefined;

/**
 * Runs {@link bootstrap} once per server process before RPC and pages are served.
 * Subsequent calls return the same settled promise.
 */
export function ensureBackendBootstrap(): Promise<void> {
	bootstrapOnce ??= (async () => {
		try {
			await bootstrap();
		} catch (error) {
			bootstrapOnce = undefined;
			console.error("[bootstrap] Backend bootstrap failed:", error);
			throw error;
		}
	})();
	return bootstrapOnce;
}
