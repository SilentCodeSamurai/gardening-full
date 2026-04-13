import type { InjectionToken } from "tsyringe";

export interface TransactionManagerPort {
	begin(): Promise<void>;
	commit(): Promise<void>;
	rollback(): Promise<void>;
}

export const TransactionManagerPortToken: InjectionToken<TransactionManagerPort> = Symbol.for("TransactionManagerPort");
