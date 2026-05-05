import { appContainer } from "@backend/di/app-container";
import { MongoDBClient } from "@backend/infrastructure/integrations/mongodb/client";
import { bootstrapServiceAccount } from "../core/application/service-accounts";
import { populateData } from "./populate-data";

let bootstrapOnce: Promise<void> | undefined;
let backendBootstrapped = false;

/**
 * Runs {@link bootstrap} once per server process before RPC and pages are served.
 * Subsequent calls return the same settled promise.
 */
export function ensureBackendBootstrap(): Promise<void> {
	bootstrapOnce ??= (async () => {
		try {
			console.info("[bootstrap] Starting backend bootstrap...");

			console.info("[bootstrap] Resolving MongoDB client from DI container(connecting to MongoDB)...");
			appContainer.resolve(MongoDBClient);
			console.info("[bootstrap] MongoDB client resolved(connected to MongoDB).");

			const result = await populateData({
				actorSubject: bootstrapServiceAccount,
			});

			if (result.status === "reconciled") {
				console.info(
					`[bootstrap] Default catalog reconciled (${result.createdCategories} created categories, ${result.updatedCategories} updated categories, ${result.createdSpecies} created species, ${result.updatedSpecies} updated species).`,
				);
			} else {
				console.info("[bootstrap] Default catalog already up to date.");
			}

			backendBootstrapped = true;
			console.info("[bootstrap] Backend bootstrap completed.");
		} catch (error) {
			bootstrapOnce = undefined;
			backendBootstrapped = false;
			console.error("[bootstrap] Backend bootstrap failed:", error);
			throw error;
		}
	})();
	return bootstrapOnce;
}

export function isBackendBootstrapped(): boolean {
	return backendBootstrapped;
}
