import type { IUseCase } from "./use-case.interface";

export abstract class BaseUseCase<TInput = void, TOutput = void> implements IUseCase<TInput, TOutput> {
	public run(...args: TInput extends void ? [] : [input: TInput]): Promise<TOutput> {
		return this.execute(...args);
	}

	protected abstract execute(...args: TInput extends void ? [] : [input: TInput]): Promise<TOutput>;
}
