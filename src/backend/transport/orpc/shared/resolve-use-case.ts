import { ApplicationError } from "@backend/core/application/shared/errors";
import { appContainer } from "@backend/di/app-container";
import { ORPCError } from "@orpc/server";
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

	return useCase.execute(...args).catch((error: unknown) => {
		if (error instanceof ApplicationError) {
			const code =
				error.code === "ACCESS_DENIED"
					? "FORBIDDEN"
					: error.code === "NOT_FOUND"
						? "NOT_FOUND"
						: error.code === "CONFLICT"
							? "CONFLICT"
							: error.code === "VALIDATION"
								? "UNPROCESSABLE_CONTENT"
								: error.code === "UNAUTHORIZED"
									? "UNAUTHORIZED"
									: error.code === "INTERNAL"
										? "INTERNAL_SERVER_ERROR"
										: "BAD_REQUEST";
			throw new ORPCError(code, {
				defined: true,
				message: error.message,
				data: {
					applicationCode: error.code,
					source: error.source,
					data: error.data,
				},
				cause: error,
			});
		}
		throw error;
	});
}
