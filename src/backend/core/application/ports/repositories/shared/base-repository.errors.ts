/**
 * Shared helpers for repository adapters to report missing rows and constraint failures.
 */
import { BaseRepositoryError } from "./errors";

export type RepositoryParticipant = {
	entity: string;
	role?: string;
	id?: unknown;
};

export class RepositoryNotFoundError extends BaseRepositoryError {
	public readonly resource: string;

	constructor(params: { resource: string; context?: Record<string, unknown> }) {
		super({
			code: "NOT_FOUND",
			message: `Not found: ${params.resource} ${JSON.stringify(params.context ?? {})}`,
			context: params.context,
		});
		this.resource = params.resource;
	}
}

export class RepositoryConflictError extends BaseRepositoryError {
	public readonly operation: string;
	public readonly reason: string;
	public readonly participants: RepositoryParticipant[];

	constructor(params: {
		operation: string;
		reason: string;
		participants?: RepositoryParticipant[];
		context?: Record<string, unknown>;
		message?: string;
		cause?: unknown;
	}) {
		super({
			code: "CONFLICT",
			message:
				params.message ??
				`Conflict: ${params.operation} ${params.reason} ${JSON.stringify(params.context ?? {})}`,
			context: params.context,
			cause: params.cause,
		});
		this.operation = params.operation;
		this.reason = params.reason;
		this.participants = params.participants ?? [];
	}
}

export class RepositoryValidationError extends BaseRepositoryError {
	public readonly operation: string;
	public readonly validationCode: string;
	public readonly details: Record<string, unknown> | undefined;

	constructor(params: {
		operation: string;
		validationCode: string;
		context?: Record<string, unknown>;
		details?: Record<string, unknown>;
		message?: string;
		cause?: unknown;
	}) {
		super({
			code: "VALIDATION",
			message:
				params.message ??
				`Validation failed: ${params.operation} ${params.validationCode} ${JSON.stringify(
					params.context ?? {},
				)}`,
			context: params.context,
			cause: params.cause,
		});
		this.operation = params.operation;
		this.validationCode = params.validationCode;
		this.details = params.details;
	}
}

export abstract class BaseRepositoryErrors {
	protected throwNotFoundError(resource: string, id: unknown): never {
		throw new RepositoryNotFoundError({
			resource,
			context: { id },
		});
	}

	protected throwConflictError(params: {
		operation: string;
		reason: string;
		participants?: RepositoryParticipant[];
		context?: Record<string, unknown>;
		message?: string;
		cause?: unknown;
	}): never {
		throw new RepositoryConflictError(params);
	}

	protected throwValidationError(params: {
		operation: string;
		validationCode: string;
		context?: Record<string, unknown>;
		details?: Record<string, unknown>;
		message?: string;
		cause?: unknown;
	}): never {
		throw new RepositoryValidationError(params);
	}
}
