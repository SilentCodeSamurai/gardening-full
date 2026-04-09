import "reflect-metadata";

import type { SubjectExpansionResolverPort } from "@backend/core/application/ports/resolvers/subject-expansion-resolver.port";
import { registerAccessControlApplicationServices, registerAccessControlPorts } from "@backend/di/register-access-control";
import { registerInMemoryRepositories } from "@backend/di/register-in-memory-repositories";
import { TOKENS } from "@backend/di/tokens";
import { container } from "tsyringe";
import type { DependencyContainer } from "tsyringe";

import { seedTestsLocalAccessPermissions } from "../../../../helpers/access-control/seed-tests-local-permissions";

export type CreateAccessControlTestContainerOptions = {
	/** Overrides {@link registerAccessControlPorts} default (e.g. empty expansion). */
	readonly subjectExpansion?: SubjectExpansionResolverPort;
};

/** Per-test child container with in-memory infra + access-control services wired. */
export function createAccessControlTestContainer(
	options?: CreateAccessControlTestContainerOptions,
): DependencyContainer {
	const child = container.createChildContainer();
	registerInMemoryRepositories(child);
	registerAccessControlPorts(child);
	if (options?.subjectExpansion !== undefined) {
		child.register(TOKENS.SubjectExpansionResolverPort, {
			useValue: options.subjectExpansion,
		});
	}
	seedTestsLocalAccessPermissions(child);
	registerAccessControlApplicationServices(child);
	return child;
}
