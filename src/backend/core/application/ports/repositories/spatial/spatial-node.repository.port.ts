import type {
	SpatialNodeEntity,
	SpatialNodeEntityId,
	SpatialNodeEntityRef,
	SpatialNodeTreeNode,
} from "@backend/core/domain/spatial/entities";
import type { ItemsContainer } from "@backend/shared/types";

export type SpatialNodeRepositoryCreateInputDTO = {
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

export type SpatialNodeRepositoryRestoreInputDTO = {
	id: SpatialNodeEntityId;
	parentId: SpatialNodeEntityId | null;
	rect: SpatialNodeEntity["rect"];
	kind: SpatialNodeEntity["kind"];
	ref: SpatialNodeEntityRef;
};
export type SpatialNodeRepositoryRestoreOutputDTO = SpatialNodeEntity;

export type SpatialNodeRepositoryGetTreeForRootIdInputDTO = { id: SpatialNodeEntityId };
export type SpatialNodeRepositoryGetTreeForRootIdOutputDTO = SpatialNodeTreeNode;

export interface SpatialNodeRepositoryPort {
	create(dto: SpatialNodeRepositoryCreateInputDTO): Promise<SpatialNodeRepositoryCreateOutputDTO>;
	getById(dto: SpatialNodeRepositoryGetByIdInputDTO): Promise<SpatialNodeRepositoryGetByIdOutputDTO>;
	getByRef(dto: SpatialNodeRepositoryGetByRefInputDTO): Promise<SpatialNodeRepositoryGetByRefOutputDTO>;
	getAll(): Promise<SpatialNodeRepositoryGetAllOutputDTO>;
	update(dto: SpatialNodeRepositoryUpdateInputDTO): Promise<SpatialNodeRepositoryUpdateOutputDTO>;
	delete(dto: SpatialNodeRepositoryDeleteInputDTO): Promise<SpatialNodeRepositoryDeleteOutputDTO>;
	restore(dto: SpatialNodeRepositoryRestoreInputDTO): Promise<SpatialNodeRepositoryRestoreOutputDTO>;
	getTreeForRootId(
		dto: SpatialNodeRepositoryGetTreeForRootIdInputDTO,
	): Promise<SpatialNodeRepositoryGetTreeForRootIdOutputDTO>;
}
