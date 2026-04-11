import "reflect-metadata";

import { registerAccessControlApplicationServices, registerAccessControlPorts } from "@backend/di/register-access-control";
import { registerInMemoryRepositories } from "@backend/di/register-in-memory-repositories";
import { container } from "tsyringe";
import type { DependencyContainer } from "tsyringe";

import { seedTestsLocalAccessPermissions } from "../../../../helpers/access-control/seed-tests-local-permissions";

/** Per-test child container with in-memory infra + access-control services wired. */
export function createAccessControlTestContainer(): DependencyContainer {
	const child = container.createChildContainer();
	registerInMemoryRepositories(child);
	registerAccessControlPorts(child);
	seedTestsLocalAccessPermissions(child);
	registerAccessControlApplicationServices(child);
	return child;
}
