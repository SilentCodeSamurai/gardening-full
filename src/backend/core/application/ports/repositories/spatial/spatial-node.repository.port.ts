import type {
	SpatialNodeEntity,
	SpatialNodeEntityId,
	SpatialNodeTreeNode,
} from "@backend/core/domain/spatial/entities";
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
import type { BaseRepositoryCreateInputDTO } from "../shared/types";

export type SpatialNodeRepositoryCreateInputDTO = BaseRepositoryCreateInputDTO<SpatialNodeEntity>;
export type SpatialNodeRepositoryCreateOutputDTO = SpatialNodeEntity;

export type SpatialNodeRepositoryCreateManyInputDTO = {
	items: readonly SpatialNodeRepositoryCreateInputDTO[];
};
export type SpatialNodeRepositoryCreateManyOutputDTO = { count: number };

export type SpatialNodeRepositoryGetOneOutputDTO = SpatialNodeEntity;

export type SpatialNodeRepositoryFilterClause = RepositoryEntityFilterClause<
	SpatialNodeEntity,
	"createdAt" | "updatedAt"
>;

export type SpatialNodeRepositoryGetManyOutputDTO = ItemsContainer<SpatialNodeEntity>;

export type SpatialNodeRepositoryUpdatePatchDTO = RepositoryUpdatePatchDto<SpatialNodeEntity>;
export type SpatialNodeRepositoryUpdateOutputDTO = SpatialNodeEntity;

export type SpatialNodeRepositoryUpdateManyOutputDTO = { count: number };

export type SpatialNodeRepositoryDeleteOutputDTO = SpatialNodeEntityId;

export type SpatialNodeRepositoryDeleteManyOutputDTO = { count: number };

/** OR branch to resolve a node by domain `ref` scoped to a workspace. */
export type SpatialNodeRepositoryGetByRefFilterClause = Pick<SpatialNodeEntity, "ref" | "workspaceKey">;

/** Restore payload (includes `id` — not a pure filter-only API). */
export type SpatialNodeRepositoryRestoreInputDTO = { id: SpatialNodeEntityId } & BaseRepositoryCreateInputDTO<SpatialNodeEntity>;

/** OR branch: root id and workspace for tree materialization. */
export type SpatialNodeRepositoryTreeRootFilterClause = Pick<SpatialNodeEntity, "id" | "workspaceKey">;

/**
 * Spatial node persistence (v2): standard segregated ports plus ref lookup, soft-restore, and tree read.
 */
export interface SpatialNodeRepositoryPort
	extends RepositoryCreateOnePort<SpatialNodeRepositoryCreateInputDTO, SpatialNodeRepositoryCreateOutputDTO>,
		RepositoryCreateManyPort<SpatialNodeRepositoryCreateManyInputDTO, SpatialNodeRepositoryCreateManyOutputDTO>,
		RepositoryGetOnePort<SpatialNodeRepositoryFilterClause, SpatialNodeRepositoryGetOneOutputDTO>,
		RepositoryGetManyPort<SpatialNodeRepositoryFilterClause, SpatialNodeRepositoryGetManyOutputDTO>,
		RepositoryUpdateOnePort<
			SpatialNodeRepositoryFilterClause,
			SpatialNodeRepositoryUpdatePatchDTO,
			SpatialNodeRepositoryUpdateOutputDTO
		>,
		RepositoryUpdateManyPort<
			SpatialNodeRepositoryFilterClause,
			SpatialNodeRepositoryUpdatePatchDTO,
			SpatialNodeRepositoryUpdateManyOutputDTO
		>,
		RepositoryDeleteOnePort<SpatialNodeRepositoryFilterClause, SpatialNodeRepositoryDeleteOutputDTO>,
		RepositoryDeleteManyPort<SpatialNodeRepositoryFilterClause, SpatialNodeRepositoryDeleteManyOutputDTO> {
	/**
	 * Load one node by domain {@link SpatialNodeEntityRef}.
	 *
	 * @param input - {@link WithRequiredRepositoryFilters} over {@link SpatialNodeRepositoryGetByRefFilterClause}.
	 * @returns output {@link SpatialNodeRepositoryGetOneOutputDTO}.
	 */
	getOneByRef(
		input: WithRequiredRepositoryFilters<SpatialNodeRepositoryGetByRefFilterClause>,
	): Promise<SpatialNodeRepositoryGetOneOutputDTO>;

	/**
	 * Restore / upsert a node from a full snapshot (includes `id`).
	 *
	 * @param input - {@link SpatialNodeRepositoryRestoreInputDTO}.
	 * @returns output {@link SpatialNodeEntity}.
	 */
	restoreOne(input: SpatialNodeRepositoryRestoreInputDTO): Promise<SpatialNodeEntity>;

	/**
	 * Load the spatial tree rooted at a node.
	 *
	 * @param input - {@link WithRequiredRepositoryFilters} over {@link SpatialNodeRepositoryTreeRootFilterClause}.
	 * @returns output {@link SpatialNodeTreeNode}.
	 */
	getTreeForRootOne(
		input: WithRequiredRepositoryFilters<SpatialNodeRepositoryTreeRootFilterClause>,
	): Promise<SpatialNodeTreeNode>;
}
