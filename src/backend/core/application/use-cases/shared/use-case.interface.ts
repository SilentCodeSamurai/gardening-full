/**
 * Interface for a use case.
 *
 * @template TInput - The input type for the use case.
 * @template TOutput - The output type for the use case.
 */
export interface IUseCase<TInput = void, TOutput = void> {
	/**
	 * Executes the use case.
	 *
	 * @param input - The input for the use case.
	 * @returns The output of the use case.
	 */
	// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
	run(...args: TInput extends void ? [] : [input: TInput]): Promise<TOutput>;
}
