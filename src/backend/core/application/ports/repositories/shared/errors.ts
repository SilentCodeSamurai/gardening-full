import { ApplicationError, type ApplicationErrorCode } from "@backend/core/application/shared/errors";

export abstract class BaseRepositoryError extends ApplicationError {
	public readonly context: Record<string, unknown> | undefined;

	protected constructor(params: {
		code?: ApplicationErrorCode;
		message: string;
		context?: Record<string, unknown>;
		cause?: unknown;
	}) {
		super({
			code: params.code ?? "BAD_REQUEST",
			message: params.message,
			source: "Repository",
			data: params.context,
			cause: params.cause,
		});
		this.context = params.context;
	}
}
