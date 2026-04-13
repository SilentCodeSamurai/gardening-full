import type { TransactionManagerPort } from "@backend/core/application/ports/transaction/transaction-manager.port";
import { BaseUseCase } from "./base.use-case";

export abstract class TransactionalUseCase<TInput = void, TOutput = void> extends BaseUseCase<TInput, TOutput> {
	constructor(private readonly transactionManager: TransactionManagerPort) {
		super();
	}

	public override async run(...args: TInput extends void ? [] : [input: TInput]): Promise<TOutput> {
		await this.transactionManager.begin();
		try {
			const output = await this.execute(...args);
			await this.transactionManager.commit();
			return output;
		} catch (error) {
			await this.transactionManager.rollback();
			throw error;
		}
	}
}
