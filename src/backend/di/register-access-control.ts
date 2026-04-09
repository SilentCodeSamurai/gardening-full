import type { DependencyContainer } from "tsyringe";
import { defaultWorkspaceRef, gardeningCatalogRootRef } from "../core/application/resource-refs";
import { AccessControlApplicationService } from "../core/application/services/access-control/access-control.application-service";
import { catalogPopulateServiceAccount } from "../core/application/service-accounts";
import { NoopResourceAccessAudit } from "../infrastructure/adapters/audit/noop-resource-access-audit";
import { ResoursePermissionInMemoryRepository } from "../infrastructure/adapters/repositories/resource-access/in-memory/resourse-permission.repository.in-memory";
import { SubjectExpansionPassthroughResolver } from "../infrastructure/adapters/resolvers/subject-expansion-default.resolver";
import { StewardAdminGlobalSharedResourcePolicy } from "../infrastructure/adapters/resource-access/steward-admin-global-shared-resource.policy";
import { TOKENS } from "./tokens";

/**
 * Registers resource-access infrastructure ports (DI tokens only).
 * Seeds catalog-populate steward assignments on the in-memory permission repository (workspace + catalog root).
 */
export function registerAccessControlPorts(c: DependencyContainer): void {
	c.register(TOKENS.SubjectExpansionResolverPort, {
		useValue: new SubjectExpansionPassthroughResolver(),
	});
	c.register(TOKENS.ResourceAccessAuditPort, {
		useValue: new NoopResourceAccessAudit(),
	});

	c.register(TOKENS.ResoursePermissionRepositoryPort, {
		useFactory: (cx) => {
			const repo = new ResoursePermissionInMemoryRepository(cx.resolve(TOKENS.InMemoryStore));
			repo.putRoleAssignmentSync({
				subjectRef: catalogPopulateServiceAccount,
				resourceRef: defaultWorkspaceRef(),
				role: "admin",
				grantSource: "seed-catalog-populate",
			});
			repo.putRoleAssignmentSync({
				subjectRef: catalogPopulateServiceAccount,
				resourceRef: gardeningCatalogRootRef(),
				role: "admin",
				grantSource: "seed-catalog-populate",
			});
			return repo;
		},
	});

	c.register(TOKENS.GlobalSharedResourcePolicyPort, {
		useFactory: (cx) =>
			new StewardAdminGlobalSharedResourcePolicy(
				cx.resolve(TOKENS.ResoursePermissionRepositoryPort),
				catalogPopulateServiceAccount,
			),
	});
}

/** Registers access-control application services (no explicit DI token). */
export function registerAccessControlApplicationServices(c: DependencyContainer): void {
	c.register(AccessControlApplicationService, {
		useFactory: (cx) =>
			new AccessControlApplicationService(
				cx.resolve(TOKENS.ResoursePermissionRepositoryPort),
				cx.resolve(TOKENS.SubjectExpansionResolverPort),
				cx.resolve(TOKENS.GlobalSharedResourcePolicyPort),
				cx.resolve(TOKENS.ResourceAccessAuditPort),
			),
	});
}
