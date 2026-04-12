import type {
	WorkspaceRoleAssignmentEntity,
	WorkspaceRoleAssignmentEntityId,
} from "@backend/core/domain/access/entities";
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

export type WorkspaceRoleAssignmentRepositoryV2CreateInputDTO =
	BaseRepositoryCreateInputDTO<WorkspaceRoleAssignmentEntity>;
export type WorkspaceRoleAssignmentRepositoryV2CreateOutputDTO = WorkspaceRoleAssignmentEntity;

export type WorkspaceRoleAssignmentRepositoryV2CreateManyInputDTO = {
	items: readonly WorkspaceRoleAssignmentRepositoryV2CreateInputDTO[];
};
export type WorkspaceRoleAssignmentRepositoryV2CreateManyOutputDTO = { count: number };

export type WorkspaceRoleAssignmentRepositoryV2GetOneOutputDTO = WorkspaceRoleAssignmentEntity;

export type WorkspaceRoleAssignmentRepositoryV2FilterClause = RepositoryEntityFilterClause<
	WorkspaceRoleAssignmentEntity,
	"createdAt" | "updatedAt"
>;

export type WorkspaceRoleAssignmentRepositoryV2GetManyOutputDTO = ItemsContainer<WorkspaceRoleAssignmentEntity>;

export type WorkspaceRoleAssignmentRepositoryV2UpdatePatchDTO = RepositoryUpdatePatchDto<WorkspaceRoleAssignmentEntity>;
export type WorkspaceRoleAssignmentRepositoryV2UpdateOutputDTO = WorkspaceRoleAssignmentEntity;

export type WorkspaceRoleAssignmentRepositoryV2UpdateManyOutputDTO = { count: number };

export type WorkspaceRoleAssignmentRepositoryV2DeleteOutputDTO = WorkspaceRoleAssignmentEntityId;

export type WorkspaceRoleAssignmentRepositoryV2DeleteManyOutputDTO = { count: number };

/**
 * Workspace role assignment persistence (v2): same CRUD contract as gardening v2 repositories;
 * rows are unique per `(subjectKey, workspaceKey)` in the in-memory adapter.
 */
export interface WorkspaceRoleAssignmentRepositoryPortV2
	extends RepositoryCreateOnePort<
			WorkspaceRoleAssignmentRepositoryV2CreateInputDTO,
			WorkspaceRoleAssignmentRepositoryV2CreateOutputDTO
		>,
		RepositoryCreateManyPort<
			WorkspaceRoleAssignmentRepositoryV2CreateManyInputDTO,
			WorkspaceRoleAssignmentRepositoryV2CreateManyOutputDTO
		>,
		RepositoryGetOnePort<
			WorkspaceRoleAssignmentRepositoryV2FilterClause,
			WorkspaceRoleAssignmentRepositoryV2GetOneOutputDTO
		>,
		RepositoryGetManyPort<
			WorkspaceRoleAssignmentRepositoryV2FilterClause,
			WorkspaceRoleAssignmentRepositoryV2GetManyOutputDTO
		>,
		RepositoryUpdateOnePort<
			WorkspaceRoleAssignmentRepositoryV2FilterClause,
			WorkspaceRoleAssignmentRepositoryV2UpdatePatchDTO,
			WorkspaceRoleAssignmentRepositoryV2UpdateOutputDTO
		>,
		RepositoryUpdateManyPort<
			WorkspaceRoleAssignmentRepositoryV2FilterClause,
			WorkspaceRoleAssignmentRepositoryV2UpdatePatchDTO,
			WorkspaceRoleAssignmentRepositoryV2UpdateManyOutputDTO
		>,
		RepositoryDeleteOnePort<
			WorkspaceRoleAssignmentRepositoryV2FilterClause,
			WorkspaceRoleAssignmentRepositoryV2DeleteOutputDTO
		>,
		RepositoryDeleteManyPort<
			WorkspaceRoleAssignmentRepositoryV2FilterClause,
			WorkspaceRoleAssignmentRepositoryV2DeleteManyOutputDTO
		> {}
