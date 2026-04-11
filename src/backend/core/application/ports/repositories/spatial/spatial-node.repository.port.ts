import type {
	SpatialNodeEntity,
	SpatialNodeEntityId,
	SpatialNodeEntityRef,
	SpatialNodeTreeNode,
} from "@backend/core/domain/spatial/entities";
import type { ItemsContainer } from "@backend/shared/types";
import type {
	BaseScopedCRUDRepositoryPort,
	NoScopedInnerRepositoryDto,
	RepositoryMultiScopedInput,
	RepositorySingleScopedInput,
} from "../shared/base.scoped-crud-repository-port";

export type SpatialNodeRepositoryCreateInputDTO = {
	workspaceKey: SpatialNodeEntity["workspaceKey"];
	parentId: SpatialNodeEntityId | null;
	rect: SpatialNodeEntity["rect"];
	kind: SpatialNodeEntity["kind"];
	ref: SpatialNodeEntityRef;
};
export type SpatialNodeRepositoryCreateOutputDTO = SpatialNodeEntity;

export type SpatialNodeRepositoryGetByIdInputDTO = { id: SpatialNodeEntityId };
export type SpatialNodeRepositoryGetByIdOutputDTO = SpatialNodeEntity;

export type SpatialNodeRepositoryGetByRefInputDTO = { ref: SpatialNodeEntityRef };
export type SpatialNodeRepositoryGetByRefOutputDTO = SpatialNodeEntity;

export type SpatialNodeRepositoryGetAllOutputDTO = ItemsContainer<SpatialNodeEntity>;

export type SpatialNodeRepositoryUpdateInputDTO = {
	id: SpatialNodeEntityId;
	parentId?: SpatialNodeEntityId | null;
	rect?: SpatialNodeEntity["rect"];
	kind?: SpatialNodeEntity["kind"];
	ref?: SpatialNodeEntityRef;
};
export type SpatialNodeRepositoryUpdateOutputDTO = SpatialNodeEntity;

export type SpatialNodeRepositoryDeleteInputDTO = { id: SpatialNodeEntityId };
export type SpatialNodeRepositoryDeleteOutputDTO = SpatialNodeEntityId;

export type SpatialNodeRepositoryRestoreInnerDTO = {
	id: SpatialNodeEntityId;
	parentId: SpatialNodeEntityId | null;
	rect: SpatialNodeEntity["rect"];
	kind: SpatialNodeEntity["kind"];
	ref: SpatialNodeEntityRef;
};
export type SpatialNodeRepositoryRestoreOutputDTO = SpatialNodeEntity;

export type SpatialNodeRepositoryGetTreeForRootIdInputDTO = { id: SpatialNodeEntityId };
export type SpatialNodeRepositoryGetTreeForRootIdOutputDTO = SpatialNodeTreeNode;

export interface SpatialNodeRepositoryPort
	extends BaseScopedCRUDRepositoryPort<
		SpatialNodeRepositoryCreateInputDTO,
		SpatialNodeRepositoryCreateOutputDTO,
		NoScopedInnerRepositoryDto,
		SpatialNodeRepositoryGetAllOutputDTO,
		SpatialNodeRepositoryGetByIdInputDTO,
		SpatialNodeRepositoryGetByIdOutputDTO,
		SpatialNodeRepositoryUpdateInputDTO,
		SpatialNodeRepositoryUpdateOutputDTO,
		SpatialNodeRepositoryDeleteInputDTO,
		SpatialNodeRepositoryDeleteOutputDTO
	> {
	getByRefScoped(
		input: RepositoryMultiScopedInput<SpatialNodeRepositoryGetByRefInputDTO>,
	): Promise<SpatialNodeRepositoryGetByRefOutputDTO>;
	restoreScoped(
		input: RepositorySingleScopedInput<SpatialNodeRepositoryRestoreInnerDTO>,
	): Promise<SpatialNodeRepositoryRestoreOutputDTO>;
	getTreeForRootIdScoped(
		input: RepositorySingleScopedInput<SpatialNodeRepositoryGetTreeForRootIdInputDTO>,
	): Promise<SpatialNodeRepositoryGetTreeForRootIdOutputDTO>;
}
