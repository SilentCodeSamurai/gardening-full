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

/**
 * Input or cross-aggregate rule failed before or instead of persistence.
 * Prefer this for application-level checks so repositories remain persistence-only.
 */
export class UseCaseValidationError extends BaseUseCaseError {
	public readonly validationCode: string;
	public readonly details: Record<string, unknown> | undefined;

	constructor(params: {
		useCaseName: string;
		validationCode: string;
		message: string;
		context?: Record<string, unknown>;
		details?: Record<string, unknown>;
		cause?: unknown;
	}) {
		super({
			code: "VALIDATION",
			message: params.message,
			useCaseName: params.useCaseName,
			context: params.context,
			cause: params.cause,
		});
		this.validationCode = params.validationCode;
		this.details = params.details;
	}
}
