import { appContainer } from "@backend/di/app-container";
import type { InjectionToken } from "tsyringe";

type UseCaseRun<TUseCaseCtor> = TUseCaseCtor extends {
	prototype: {
		run: (...args: infer A) => infer R;
	};
}
	? { args: A; result: Awaited<R> }
	: never;

export type UseCaseArgs<TUseCaseCtor> =
	UseCaseRun<TUseCaseCtor> extends { args: infer A extends unknown[] } ? A : never;

export type UseCaseOutput<TUseCaseCtor> = UseCaseRun<TUseCaseCtor> extends { result: infer R } ? R : never;

export async function resolveAndRunUseCase<TUseCaseCtor>(
	useCaseCtor: TUseCaseCtor,
	...args: UseCaseArgs<TUseCaseCtor>
): Promise<UseCaseOutput<TUseCaseCtor>> {
	const scopedContainer = appContainer.createChildContainer();
	const useCase = scopedContainer.resolve(useCaseCtor as InjectionToken<unknown>) as {
		run: (...a: UseCaseArgs<TUseCaseCtor>) => Promise<UseCaseOutput<TUseCaseCtor>>;
	};
	try {
		return await useCase.run(...args);
	} finally {
		scopedContainer.dispose();
	}
}
