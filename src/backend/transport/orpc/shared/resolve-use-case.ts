import { appContainer } from "@backend/di/app-container";
import type { InjectionToken } from "tsyringe";

type UseCaseExecute<TUseCaseCtor> = TUseCaseCtor extends {
	prototype: {
		execute: (...args: infer A) => infer R;
	};
}
	? { args: A; result: Awaited<R> }
	: never;

export type UseCaseArgs<TUseCaseCtor> =
	UseCaseExecute<TUseCaseCtor> extends { args: infer A extends unknown[] } ? A : never;

export type UseCaseOutput<TUseCaseCtor> = UseCaseExecute<TUseCaseCtor> extends { result: infer R } ? R : never;

export function resolveAndExecute<TUseCaseCtor>(
	useCaseCtor: TUseCaseCtor,
	...args: UseCaseArgs<TUseCaseCtor>
): Promise<UseCaseOutput<TUseCaseCtor>> {
	const useCase = appContainer.resolve(useCaseCtor as InjectionToken<unknown>) as {
		execute: (...a: UseCaseArgs<TUseCaseCtor>) => Promise<UseCaseOutput<TUseCaseCtor>>;
	};

	return useCase.execute(...args);
}
