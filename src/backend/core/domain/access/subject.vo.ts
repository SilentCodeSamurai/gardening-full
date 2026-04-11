import { ApplicationError } from "@backend/core/application/shared/errors";

/**
 * Version of the subject key format.
 */
export const SUBJECT_KEY_VERSION = "v1";

/**
 * Error thrown when a subject key is invalid.
 */
export class SubjectKeyValidationError extends ApplicationError {
	constructor(message: string) {
		super({
			code: "VALIDATION",
			message: message,
			source: "SubjectKeyValidationError",
		});
	}
}

/**
 * Type of the subject.
 */
export type SubjectType = "user" | "organization" | "serviceAccount";

/**
 * Key identifier for a subject. Format: `version:type:externalId`
 * - `version`: Version of the subject key format.
 * - `type`: Type of the subject.
 * - `externalId`: External ID of the subject.
 * 
 * @example
 * - 'v1:user:123'
 * - 'v1:organization:456'
 * - 'v1:serviceAccount:789'
 */
export type SubjectKey = `${string}:${SubjectType}:${string}` & { __brand: "SubjectKey" };

/**
 * Value object that represents a subject.
 * - `version`: Version of the subject key format.
 * - `type`: Type of the subject.
 * - `externalId`: External ID of the subject.
 * 
 * Has static factory methods for each subject type.
 * Has a method to convert to a key.
 * Has a method to convert from a key.
 * 
 * @example
 * SubjectVO.user("v1", "123")
 * SubjectVO.organization("v1", "456")
 * SubjectVO.serviceAccount("v1", "789")
 * SubjectVO.fromKey("v1:user:123")
 */
export class SubjectVO {
	public readonly version: string;
	public readonly type: SubjectType;
	public readonly externalId: string;

	private constructor(params: {
		type: SubjectType;
		externalId: string;
	}) {
		this.version = SUBJECT_KEY_VERSION;
		this.type = params.type;
		this.externalId = params.externalId;
	}

	public static user(externalId: string): SubjectVO {
		return new SubjectVO({
			type: "user",
			externalId,
		});
	}
	public static organization(externalId: string): SubjectVO {
		return new SubjectVO({
			type: "organization",
			externalId,
		});
	}

	public static serviceAccount(externalId: string): SubjectVO {
		return new SubjectVO({
			type: "serviceAccount",
			externalId,
		});
	}

	public static fromKey(key: SubjectKey): SubjectVO {
		const parts = key.split(":");
		if (parts.length !== 3) {
			throw new SubjectKeyValidationError(`Invalid subject key: ${key}`);
		}
		const [version, type, externalId] = parts;
		if (version !== SUBJECT_KEY_VERSION) {
			throw new SubjectKeyValidationError(`Invalid subject key version: ${version}`);
		}
		switch (type) {
			case "user":
				return SubjectVO.user(externalId);
			case "organization":
				return SubjectVO.organization(externalId);
			case "serviceAccount":
				return SubjectVO.serviceAccount(externalId);
			default:
				throw new SubjectKeyValidationError(`Invalid subject type: ${type}`);
			}
	}
	
	public toKey(): SubjectKey {
		return `${this.version}:${this.type}:${this.externalId}` as SubjectKey;
	}
}
