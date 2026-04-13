import "reflect-metadata";

import { registerAdapters } from "@backend/di/register-adapters";
import { registerApplicationServices } from "@backend/di/register-application-services";
import { registerInMemoryRepositories } from "@backend/di/register-in-memory-repositories";
import { container } from "tsyringe";
import type { DependencyContainer } from "tsyringe";

import { seedTestsLocalAccessPermissions } from "../../../../helpers/access-control/seed-tests-local-permissions";

/** Per-test child container with in-memory infra + access-control services wired. */
export function createAccessControlTestContainer(): DependencyContainer {
	const child = container.createChildContainer();
	registerInMemoryRepositories(child);
	registerAdapters(child);
	seedTestsLocalAccessPermissions(child);
	registerApplicationServices(child);
	return child;
}
