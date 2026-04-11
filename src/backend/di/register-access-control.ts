import type { DependencyContainer } from "tsyringe";
import type { AccessAuditPort } from "../core/application/ports/access/access-audit.port";
import type { WorkspaceRoleAssignmentRepositoryPort } from "../core/application/ports/repositories/access/workspace-role-assignment.repository.port";
import { AccessControlApplicationService } from "../core/application/services/access-control/access-control.application-service";
import { NoopResourceAccessAudit } from "../infrastructure/adapters/audit/noop-resource-access-audit";
import { TOKENS } from "./tokens";

/** Registers resource-access infrastructure ports (DI tokens only). */
export function registerAccessControlPorts(c: DependencyContainer): void {
	c.register(TOKENS.AccessAuditPort, {
		useValue: new NoopResourceAccessAudit(),
	});
}

/** Registers access-control application services (no explicit DI token). */
export function registerAccessControlApplicationServices(c: DependencyContainer): void {
	c.register(AccessControlApplicationService, {
		useFactory: (cx) =>
			new AccessControlApplicationService(
				cx.resolve<WorkspaceRoleAssignmentRepositoryPort>(TOKENS.WorkspaceRoleAssignmentRepositoryPort),
				cx.resolve<AccessAuditPort>(TOKENS.AccessAuditPort),
			),
	});
}
