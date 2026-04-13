import type { TransactionManagerPort } from "@backend/core/application/ports/transaction/transaction-manager.port";
import {
	type InMemoryDatabaseClient,
	InMemoryDatabaseClientToken,
	type InMemoryStore,
} from "@backend/infrastructure/integrations/in-memory-database/client";
import { inject, injectable } from "tsyringe";

@injectable()
export class InMemoryTransactionManagerAdapter implements TransactionManagerPort {
	private depth = 0;
	private transactionStore: InMemoryStore | null = null;

	constructor(@inject(InMemoryDatabaseClientToken) private readonly dbClient: InMemoryDatabaseClient) {}

	get session(): InMemoryStore {
		return this.transactionStore ?? this.dbClient.getStore();
	}

	async begin(): Promise<void> {
		if (this.depth === 0) {
			const snapshot = this.dbClient.getStore().createSnapshot();
			this.transactionStore = this.dbClient.createStoreFromSnapshot(snapshot);
		}
		this.depth += 1;
	}

	async commit(): Promise<void> {
		if (this.depth < 1) return;
		this.depth -= 1;
		if (this.depth > 0 || this.transactionStore === null) return;
		this.dbClient.getStore().applySnapshot(this.transactionStore.createSnapshot());
		this.transactionStore = null;
	}

	async rollback(): Promise<void> {
		this.depth = 0;
		this.transactionStore = null;
	}
}
