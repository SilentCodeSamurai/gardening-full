import type {
	WorkspaceRoleAssignmentEntity,
	WorkspaceRoleAssignmentEntityId,
} from "@backend/core/domain/access/entities";
import type { SubjectKey } from "@backend/core/domain/access/subject.vo";
import type { AccessRole } from "@backend/core/domain/access/types";
import type { WorkspaceKey } from "@backend/core/domain/access/workspace.vo";
import type { ItemsContainer } from "@backend/shared/types";
import type {
	RepositoryCreateManyPort,
	RepositoryCreateOnePort,
	RepositoryDeleteManyPort,
	RepositoryDeleteOnePort,
	RepositoryEntityFilterClause,
	RepositoryGetManyPort,
	RepositoryGetOnePort,
	RepositoryUpdateManyPort,
	RepositoryUpdateOnePort,
	RepositoryUpdatePatchDto,
} from "../shared/repository-operation-ports";
import type { BaseRepositoryCreateInputDTO } from "../shared/types";

export type WorkspaceRoleAssignmentRepositoryCreateInputDTO =
	BaseRepositoryCreateInputDTO<WorkspaceRoleAssignmentEntity>;
export type WorkspaceRoleAssignmentRepositoryCreateOutputDTO = WorkspaceRoleAssignmentEntity;

export type WorkspaceRoleAssignmentRepositoryCreateManyInputDTO = {
	items: readonly WorkspaceRoleAssignmentRepositoryCreateInputDTO[];
};
export type WorkspaceRoleAssignmentRepositoryCreateManyOutputDTO = { count: number };

export type WorkspaceRoleAssignmentRepositoryGetOneOutputDTO = WorkspaceRoleAssignmentEntity;

export type WorkspaceRoleAssignmentRepositoryFilterClause = RepositoryEntityFilterClause<
	WorkspaceRoleAssignmentEntity,
	"createdAt" | "updatedAt"
>;

export type WorkspaceRoleAssignmentRepositoryGetManyOutputDTO = ItemsContainer<WorkspaceRoleAssignmentEntity>;

export type WorkspaceRoleAssignmentRepositoryUpdatePatchDTO = RepositoryUpdatePatchDto<WorkspaceRoleAssignmentEntity>;
export type WorkspaceRoleAssignmentRepositoryUpdateOutputDTO = WorkspaceRoleAssignmentEntity;

export type WorkspaceRoleAssignmentRepositoryUpdateManyOutputDTO = { count: number };

export type WorkspaceRoleAssignmentRepositoryDeleteOutputDTO = WorkspaceRoleAssignmentEntityId;

export type WorkspaceRoleAssignmentRepositoryDeleteManyOutputDTO = { count: number };

/** Insert or update the single row for `(subjectKey, workspaceKey)`. */
export type WorkspaceRoleAssignmentRepositoryUpsertInputDTO = {
	readonly subjectKey: SubjectKey;
	readonly workspaceKey: WorkspaceKey;
	readonly role: AccessRole;
	readonly grantSource?: string;
};

export type WorkspaceRoleAssignmentRepositoryUpsertOutputDTO = WorkspaceRoleAssignmentEntity;

/**
 * Workspace role assignment persistence (v2): same CRUD contract as gardening v2 repositories;
 * rows are unique per `(subjectKey, workspaceKey)` in the in-memory adapter.
 */
export interface WorkspaceRoleAssignmentRepositoryPort
	extends RepositoryCreateOnePort<
			WorkspaceRoleAssignmentRepositoryCreateInputDTO,
			WorkspaceRoleAssignmentRepositoryCreateOutputDTO
		>,
		RepositoryCreateManyPort<
			WorkspaceRoleAssignmentRepositoryCreateManyInputDTO,
			WorkspaceRoleAssignmentRepositoryCreateManyOutputDTO
		>,
		RepositoryGetOnePort<
			WorkspaceRoleAssignmentRepositoryFilterClause,
			WorkspaceRoleAssignmentRepositoryGetOneOutputDTO
		>,
		RepositoryGetManyPort<
			WorkspaceRoleAssignmentRepositoryFilterClause,
			WorkspaceRoleAssignmentRepositoryGetManyOutputDTO
		>,
		RepositoryUpdateOnePort<
			WorkspaceRoleAssignmentRepositoryFilterClause,
			WorkspaceRoleAssignmentRepositoryUpdatePatchDTO,
			WorkspaceRoleAssignmentRepositoryUpdateOutputDTO
		>,
		RepositoryUpdateManyPort<
			WorkspaceRoleAssignmentRepositoryFilterClause,
			WorkspaceRoleAssignmentRepositoryUpdatePatchDTO,
			WorkspaceRoleAssignmentRepositoryUpdateManyOutputDTO
		>,
		RepositoryDeleteOnePort<
			WorkspaceRoleAssignmentRepositoryFilterClause,
			WorkspaceRoleAssignmentRepositoryDeleteOutputDTO
		>,
		RepositoryDeleteManyPort<
			WorkspaceRoleAssignmentRepositoryFilterClause,
			WorkspaceRoleAssignmentRepositoryDeleteManyOutputDTO
		> {
	upsertOne(
		input: WorkspaceRoleAssignmentRepositoryUpsertInputDTO,
	): Promise<WorkspaceRoleAssignmentRepositoryUpsertOutputDTO>;
}
