import { BaseUseCaseError } from "../../use-cases/shared/errors";

export type AccessErrorCode = "ACCESS_FORBIDDEN" | "ACCESS_SCOPE_MISMATCH" | "ACCESS_SUBJECT_NOT_RESOLVED";

export class AccessForbiddenApplicationError extends BaseUseCaseError {
	public readonly code: AccessErrorCode = "ACCESS_FORBIDDEN";
	public readonly accessReason?: string;

	constructor(params: { message?: string; reason?: string; context?: Record<string, unknown> }) {
		super({
			message: params.message ?? "Access denied",
			useCaseName: "AccessControlApplicationService",
			context: { ...params.context, reason: params.reason },
		});
		this.accessReason = params.reason;
	}
}

export class AccessScopeMismatchApplicationError extends BaseUseCaseError {
	public readonly code: AccessErrorCode = "ACCESS_SCOPE_MISMATCH";

	constructor(params: { context?: Record<string, unknown> }) {
		super({
			message: "Tenant or scope mismatch",
			useCaseName: "AccessControlApplicationService",
			context: params.context,
		});
	}
}

export class AccessSubjectNotResolvedApplicationError extends BaseUseCaseError {
	public readonly code: AccessErrorCode = "ACCESS_SUBJECT_NOT_RESOLVED";

	constructor(params: { context?: Record<string, unknown> }) {
		super({
			message: "Subject expansion could not be resolved",
			useCaseName: "AccessControlApplicationService",
			context: params.context,
		});
	}
}
