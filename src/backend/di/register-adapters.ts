import type { DependencyContainer } from "tsyringe";
import { Lifecycle } from "tsyringe";
import { AccessAuditPortToken } from "../core/application/ports/access/access-audit.port";
import { TransactionManagerPortToken } from "../core/application/ports/transaction/transaction-manager.port";
import { NoopResourceAccessAudit } from "../infrastructure/adapters/audit/noop-resource-access-audit";
import { InMemoryTransactionManagerAdapter } from "../infrastructure/adapters/transaction/in-memory-transaction-manager.adapter";

/** Registers infrastructure adapters on DI tokens. */
export function registerAdapters(c: DependencyContainer): void {
	c.register(AccessAuditPortToken, {
		useValue: new NoopResourceAccessAudit(),
	});
	c.register(
		InMemoryTransactionManagerAdapter,
		{ useClass: InMemoryTransactionManagerAdapter },
		{ lifecycle: Lifecycle.ContainerScoped },
	);
	c.register(
		TransactionManagerPortToken,
		{ useToken: InMemoryTransactionManagerAdapter },
		{ lifecycle: Lifecycle.ContainerScoped },
	);
}
