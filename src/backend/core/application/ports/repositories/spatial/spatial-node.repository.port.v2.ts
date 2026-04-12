import type {
	SpatialNodeEntity,
	SpatialNodeEntityId,
	SpatialNodeEntityRef,
	SpatialNodeTreeNode,
} from "@backend/core/domain/spatial/entities.v2";
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
	WithRequiredRepositoryFilters,
} from "../shared/repository-operation-ports";

export type SpatialNodeRepositoryV2CreateInputDTO = {
	parentId: SpatialNodeEntityId | null;
	rect: SpatialNodeEntity["rect"];
	kind: SpatialNodeEntity["kind"];
	ref: SpatialNodeEntityRef;
};
export type SpatialNodeRepositoryV2CreateOutputDTO = SpatialNodeEntity;

export type SpatialNodeRepositoryV2CreateManyInputDTO = {
	items: readonly SpatialNodeRepositoryV2CreateInputDTO[];
};
export type SpatialNodeRepositoryV2CreateManyOutputDTO = { count: number };

export type SpatialNodeRepositoryV2GetOneOutputDTO = SpatialNodeEntity;

export type SpatialNodeRepositoryV2FilterClause = RepositoryEntityFilterClause<
	SpatialNodeEntity,
	"createdAt" | "updatedAt"
>;

export type SpatialNodeRepositoryV2GetManyOutputDTO = ItemsContainer<SpatialNodeEntity>;

export type SpatialNodeRepositoryV2UpdatePatchDTO = RepositoryUpdatePatchDto<SpatialNodeEntity>;
export type SpatialNodeRepositoryV2UpdateOutputDTO = SpatialNodeEntity;

export type SpatialNodeRepositoryV2UpdateManyOutputDTO = { count: number };

export type SpatialNodeRepositoryV2DeleteOutputDTO = SpatialNodeEntityId;

export type SpatialNodeRepositoryV2DeleteManyOutputDTO = { count: number };

/** OR branch to resolve a node by domain `ref` (within adapter scope). */
export type SpatialNodeRepositoryV2GetByRefFilterClause = {
	ref: SpatialNodeEntityRef;
};

/** Restore payload (includes `id` — not a pure filter-only API). */
export type SpatialNodeRepositoryV2RestoreInputDTO = {
	id: SpatialNodeEntityId;
	parentId: SpatialNodeEntityId | null;
	rect: SpatialNodeEntity["rect"];
	kind: SpatialNodeEntity["kind"];
	ref: SpatialNodeEntityRef;
};

/** OR branch: root id for tree materialization. */
export type SpatialNodeRepositoryV2TreeRootFilterClause = {
	id: SpatialNodeEntityId;
};

/**
 * Spatial node persistence (v2): standard segregated ports plus ref lookup, soft-restore, and tree read.
 */
export interface SpatialNodeRepositoryPortV2
	extends RepositoryCreateOnePort<SpatialNodeRepositoryV2CreateInputDTO, SpatialNodeRepositoryV2CreateOutputDTO>,
		RepositoryCreateManyPort<SpatialNodeRepositoryV2CreateManyInputDTO, SpatialNodeRepositoryV2CreateManyOutputDTO>,
		RepositoryGetOnePort<SpatialNodeRepositoryV2FilterClause, SpatialNodeRepositoryV2GetOneOutputDTO>,
		RepositoryGetManyPort<SpatialNodeRepositoryV2FilterClause, SpatialNodeRepositoryV2GetManyOutputDTO>,
		RepositoryUpdateOnePort<
			SpatialNodeRepositoryV2FilterClause,
			SpatialNodeRepositoryV2UpdatePatchDTO,
			SpatialNodeRepositoryV2UpdateOutputDTO
		>,
		RepositoryUpdateManyPort<
			SpatialNodeRepositoryV2FilterClause,
			SpatialNodeRepositoryV2UpdatePatchDTO,
			SpatialNodeRepositoryV2UpdateManyOutputDTO
		>,
		RepositoryDeleteOnePort<SpatialNodeRepositoryV2FilterClause, SpatialNodeRepositoryV2DeleteOutputDTO>,
		RepositoryDeleteManyPort<SpatialNodeRepositoryV2FilterClause, SpatialNodeRepositoryV2DeleteManyOutputDTO> {
	/**
	 * Load one node by domain {@link SpatialNodeEntityRef}.
	 *
	 * @param input - {@link WithRequiredRepositoryFilters} over {@link SpatialNodeRepositoryV2GetByRefFilterClause}.
	 * @returns output {@link SpatialNodeRepositoryV2GetOneOutputDTO}.
	 */
	getOneByRef(
		input: WithRequiredRepositoryFilters<SpatialNodeRepositoryV2GetByRefFilterClause>,
	): Promise<SpatialNodeRepositoryV2GetOneOutputDTO>;

	/**
	 * Restore / upsert a node from a full snapshot (includes `id`).
	 *
	 * @param input - {@link SpatialNodeRepositoryV2RestoreInputDTO}.
	 * @returns output {@link SpatialNodeEntity}.
	 */
	restoreOne(input: SpatialNodeRepositoryV2RestoreInputDTO): Promise<SpatialNodeEntity>;

	/**
	 * Load the spatial tree rooted at a node.
	 *
	 * @param input - {@link WithRequiredRepositoryFilters} over {@link SpatialNodeRepositoryV2TreeRootFilterClause}.
	 * @returns output {@link SpatialNodeTreeNode}.
	 */
	getTreeForRootOne(
		input: WithRequiredRepositoryFilters<SpatialNodeRepositoryV2TreeRootFilterClause>,
	): Promise<SpatialNodeTreeNode>;
}
