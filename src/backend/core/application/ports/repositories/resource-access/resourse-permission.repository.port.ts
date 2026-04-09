import type {
	AccessRole,
	IdentityRef,
	ResourceRef,
	ResoursePermissionEntity,
} from "@backend/core/domain/resource-access";
import type { ItemsContainer } from "@backend/shared/types";

export type ResoursePermissionUpsertRoleAssignmentInputDTO = {
	readonly subjectRef: IdentityRef;
	readonly resourceRef: ResourceRef;
	readonly role: AccessRole;
	readonly grantSource?: string;
};
export type ResoursePermissionUpsertRoleAssignmentOutputDTO = ResoursePermissionEntity;

export type ResoursePermissionRevokeRoleAssignmentInputDTO = {
	readonly subjectRef: IdentityRef;
	readonly resourceRef: ResourceRef;
	readonly role: AccessRole;
};

export type ResoursePermissionListAssignmentsForSubjectInputDTO = {
	readonly subjectRef: IdentityRef;
};
export type ResoursePermissionListAssignmentsForSubjectOutputDTO = ItemsContainer<ResoursePermissionEntity>;

export type ResoursePermissionListAssignmentsForSubjectsInputDTO = {
	readonly subjectRefs: IdentityRef[];
};
export type ResoursePermissionListAssignmentsForSubjectsOutputDTO = ItemsContainer<ResoursePermissionEntity>;

export type ResoursePermissionListAssignmentsCoveringResourcesInputDTO = {
	readonly resourceRefs: readonly ResourceRef[];
};

/** For each input ref (same order), assignments whose pattern {@link ResourceRef.covers} that ref. */
export type ResoursePermissionListAssignmentsCoveringResourcesOutputDTO = {
	readonly coveringPerRef: ReadonlyArray<readonly ResoursePermissionEntity[]>;
};

/**
 * Persistence port for {@link ResoursePermissionEntity} role rows.
 */
export interface ResoursePermissionRepositoryPort {
	upsertRoleAssignment(
		input: ResoursePermissionUpsertRoleAssignmentInputDTO,
	): Promise<ResoursePermissionUpsertRoleAssignmentOutputDTO>;
	revokeRoleAssignment(input: ResoursePermissionRevokeRoleAssignmentInputDTO): Promise<void>;
	/** All role assignments where subject matches exactly (no expansion). */
	listAssignmentsForSubject(
		input: ResoursePermissionListAssignmentsForSubjectInputDTO,
	): Promise<ResoursePermissionListAssignmentsForSubjectOutputDTO>;
	/**
	 * All assignments for these subjects (identity keys) — used after expansion.
	 */
	listAssignmentsForSubjects(
		input: ResoursePermissionListAssignmentsForSubjectsInputDTO,
	): Promise<ResoursePermissionListAssignmentsForSubjectsOutputDTO>;

	/** All persisted assignments that apply to each concrete resource (via {@link ResourceRef.covers}). */
	listAssignmentsCoveringResources(
		input: ResoursePermissionListAssignmentsCoveringResourcesInputDTO,
	): Promise<ResoursePermissionListAssignmentsCoveringResourcesOutputDTO>;
}
