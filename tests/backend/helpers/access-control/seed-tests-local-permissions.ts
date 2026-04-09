import { defaultWorkspaceRef, gardeningCatalogRootRef } from "#/backend/core/application/resource-refs";
import type { ResoursePermissionRepositoryPort } from "@backend/core/application/ports/repositories/resource-access/resourse-permission.repository.port";
import { testsLocalServiceAccount } from "../../core/application/use-cases/service-accounts";
import { TOKENS } from "@backend/di/tokens";
import { ResoursePermissionInMemoryRepository } from "@backend/infrastructure/adapters/repositories/resource-access/in-memory/resourse-permission.repository.in-memory";
import type { DependencyContainer } from "tsyringe";

/**
 * Extends the in-memory permission store with admin on workspace + catalog root for `tests-local`
 * (see `createTestUseCaseContext`). Call after `registerAccessControlPorts` from test composition roots only.
 */
export function seedTestsLocalAccessPermissions(c: DependencyContainer): void {
	const repo = c.resolve<ResoursePermissionRepositoryPort>(TOKENS.ResoursePermissionRepositoryPort);
	if (!(repo instanceof ResoursePermissionInMemoryRepository)) {
		throw new Error("seedTestsLocalAccessPermissions requires ResoursePermissionInMemoryRepository");
	}
	repo.putRoleAssignmentSync({
		subjectRef: testsLocalServiceAccount,
		resourceRef: defaultWorkspaceRef(),
		role: "admin",
		grantSource: "seed-tests-local",
	});
	repo.putRoleAssignmentSync({
		subjectRef: testsLocalServiceAccount,
		resourceRef: gardeningCatalogRootRef(),
		role: "admin",
		grantSource: "seed-tests-local",
	});
}
