import { ApplicationError } from "@backend/core/application/shared/errors";

/**
 * Version of the workspace key format.
 */
export const WORKSPACE_KEY_VERSION = "v1";

/**
 * Error thrown when a workspace key is invalid.
 */
export class WorkspaceKeyValidationError extends ApplicationError {
	constructor(message: string) {
		super({
			code: "VALIDATION",
			message: message,
			source: "WorkspaceKeyValidationError",
		});
	}
}

/**
 * Type of the workspace.
 */
export type WorkspaceType = "globalShared" | "user" | "org";

/**
 * Key identifier for a workspace. Format: `version:type:externalId`
 * - `version`: Version of the workspace key format.
 * - `type`: Type of the workspace.
 * - `externalId`: External ID of the workspace.
 *
 * @example
 * - 'v1:globalShared'
 * - 'v1:user:123'
 * - 'v1:org:456'
 */
export type WorkspaceKey = `${string}:${WorkspaceType}:${string}` & { __brand: "WorkspaceKey" };

/**
 * Value object that represents a workspace.
 * - `version`: Version of the workspace key format.
 * - `type`: Type of the workspace.
 * - `externalId`: External ID of the workspace.
 *
 * Has static factory methods for each workspace type.
 * Has a method to convert to a key.
 * Has a method to convert from a key.
 *
 * @example
 * WorkspaceVO.globalShared("v1")
 * WorkspaceVO.user("v1", "123")
 * WorkspaceVO.org("v1", "456")
 * WorkspaceVO.fromKey("v1:globalShared:")
 * WorkspaceVO.fromKey("v1:user:123")
 * WorkspaceVO.fromKey("v1:org:456")
 */
export class WorkspaceVO {
	public readonly version: string;
	public readonly type: WorkspaceType;
	public readonly externalId: string;

	private constructor(type: WorkspaceType, externalId: string) {
		this.version = WORKSPACE_KEY_VERSION;
		this.type = type;
		this.externalId = externalId;
	}

	public static isGlobalSharedKey(key: WorkspaceKey): boolean {
		return WorkspaceVO.fromKey(key).type === "globalShared";
	}

	public static globalShared(): WorkspaceVO {
		return new WorkspaceVO("globalShared", "");
	}

	public static user(externalId: string): WorkspaceVO {
		return new WorkspaceVO("user", externalId);
	}

	public static org(externalId: string): WorkspaceVO {
		return new WorkspaceVO("org", externalId);
	}

	public static fromKey(key: WorkspaceKey): WorkspaceVO {
		const parts = key.split(":");
		if (parts.length !== 3) {
			throw new WorkspaceKeyValidationError(`Invalid workspace key: ${key}`);
		}
		const [version, type, externalId] = parts;
		if (version !== WORKSPACE_KEY_VERSION) {
			throw new WorkspaceKeyValidationError(`Invalid workspace key version: ${version}`);
		}
		switch (type) {
			case "globalShared":
				return WorkspaceVO.globalShared();
			case "user":
				return WorkspaceVO.user(externalId);
			case "org":
				return WorkspaceVO.org(externalId);
		}
		throw new WorkspaceKeyValidationError(`Invalid workspace type: ${type}`);
	}

	public toKey(): WorkspaceKey {
		return `${this.version}:${this.type}:${this.externalId}` as WorkspaceKey;
	}

	public equals(other: WorkspaceVO): boolean {
		return this.version === other.version && this.type === other.type && this.externalId === other.externalId;
	}

	/** True when this workspace is the global shared catalog scope (not keyed by org/user id). */
	public static isGlobalShared(workspace: WorkspaceVO): boolean {
		return workspace.type === "globalShared";
	}
}
