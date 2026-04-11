import { ApplicationError, type ApplicationErrorCode } from "../../shared/errors";

export abstract class BaseUseCaseError extends ApplicationError {
	public readonly useCaseName: string;
	public readonly context: Record<string, unknown> | undefined;

	protected constructor(params: {
		code?: ApplicationErrorCode;
		message: string;
		useCaseName: string;
		context?: Record<string, unknown>;
		cause?: unknown;
	}) {
		super({
			code: params.code ?? "BAD_REQUEST",
			message: params.message,
			source: params.useCaseName,
			data: params.context,
			cause: params.cause,
		});
		this.useCaseName = params.useCaseName;
		this.context = params.context;
	}
}
