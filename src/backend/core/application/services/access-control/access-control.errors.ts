import { BaseUseCaseError } from "../../use-cases/shared/errors";

export type AccessErrorCode = "ACCESS_DENIED" | "BAD_REQUEST";

export class AccessForbiddenApplicationError extends BaseUseCaseError {
	public readonly accessReason?: string;

	constructor(params: { message?: string; reason?: string; context?: Record<string, unknown> }) {
		super({
			code: "ACCESS_DENIED",
			message: params.message ?? "Access denied",
			useCaseName: "AccessControlApplicationService",
			context: { ...params.context, reason: params.reason },
		});
		this.accessReason = params.reason;
	}
}

export class AccessScopeMismatchApplicationError extends BaseUseCaseError {
	constructor(params: { context?: Record<string, unknown> }) {
		super({
			code: "BAD_REQUEST",
			message: "Tenant or scope mismatch",
			useCaseName: "AccessControlApplicationService",
			context: params.context,
		});
	}
}

export class AccessSubjectNotResolvedApplicationError extends BaseUseCaseError {
	constructor(params: { context?: Record<string, unknown> }) {
		super({
			code: "BAD_REQUEST",
			message: "Subject expansion could not be resolved",
			useCaseName: "AccessControlApplicationService",
			context: params.context,
		});
	}
}
