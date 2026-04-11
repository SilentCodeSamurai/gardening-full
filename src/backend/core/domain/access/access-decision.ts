import type { AccessAction } from "./access-action";
import type { AccessRole } from "./access-role";

export type AccessDecisionReasonCode =
	| "ALLOW_ROLE"
	| "DENY_NO_MATCHING_ASSIGNMENT"
	| "DENY_ROLE_MISSING_ACTION"
	| "ACCESS_SCOPE_MISMATCH"
	| "ACCESS_SUBJECT_NOT_RESOLVED";

export type AccessDecision = {
	readonly allowed: boolean;
	readonly action: AccessAction;
	readonly reasonCode: AccessDecisionReasonCode;
	readonly matchedRole?: AccessRole;
	/** Stable opaque key of the assignment row if applicable */
	readonly matchedAssignmentId?: string;
};
