import { resolveAndRunUseCase, type UseCaseArgs, type UseCaseOutput } from "@backend/transport/shared/resolve-use-case";
import { transformApplicationErrorToOrpc } from "./map-application-error-to-orpc";

export function runUseCaseOrpc<TUseCaseCtor>(
	useCaseCtor: TUseCaseCtor,
	...args: UseCaseArgs<TUseCaseCtor>
): Promise<UseCaseOutput<TUseCaseCtor>> {
	return resolveAndRunUseCase(useCaseCtor, ...args).catch(transformApplicationErrorToOrpc);
}
