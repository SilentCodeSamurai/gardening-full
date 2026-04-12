import type { CultivarEntity, CultivarEntityId, SpeciesEntity } from "@backend/core/domain/gardening/entities.v2";
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

export type CultivarRepositoryV2CreateInputDTO = BaseRepositoryCreateInputDTO<CultivarEntity>;
export type CultivarRepositoryV2CreateOutputDTO = CultivarEntity;

export type CultivarRepositoryV2CreateManyInputDTO = {
	items: readonly CultivarRepositoryV2CreateInputDTO[];
};
export type CultivarRepositoryV2CreateManyOutputDTO = { count: number };

export type CultivarRepositoryV2GetOneOutputDTO = CultivarEntity;

export type CultivarRepositoryV2FilterClause = RepositoryEntityFilterClause<
	CultivarEntity,
	"createdAt" | "updatedAt"
>;

export type CultivarRepositoryV2GetManyOutputDTO = ItemsContainer<CultivarEntity>;

export type CultivarRepositoryV2UpdatePatchDTO = RepositoryUpdatePatchDto<CultivarEntity>;
export type CultivarRepositoryV2UpdateOutputDTO = CultivarEntity;

export type CultivarRepositoryV2UpdateManyOutputDTO = { count: number };

export type CultivarRepositoryV2DeleteOutputDTO = CultivarEntityId;

export type CultivarRepositoryV2DeleteManyOutputDTO = { count: number };

export type CultivarRepositoryV2GetFullOutputDTO = CultivarEntity & {
	species: SpeciesEntity;
};

/**
 * Cultivar persistence (v2): standard segregated ports plus {@link CultivarRepositoryPortV2#getFullOne} for species-hydrated reads.
 */
export interface CultivarRepositoryPortV2
	extends RepositoryCreateOnePort<CultivarRepositoryV2CreateInputDTO, CultivarRepositoryV2CreateOutputDTO>,
		RepositoryCreateManyPort<CultivarRepositoryV2CreateManyInputDTO, CultivarRepositoryV2CreateManyOutputDTO>,
		RepositoryGetOnePort<CultivarRepositoryV2FilterClause, CultivarRepositoryV2GetOneOutputDTO>,
		RepositoryGetManyPort<CultivarRepositoryV2FilterClause, CultivarRepositoryV2GetManyOutputDTO>,
		RepositoryUpdateOnePort<
			CultivarRepositoryV2FilterClause,
			CultivarRepositoryV2UpdatePatchDTO,
			CultivarRepositoryV2UpdateOutputDTO
		>,
		RepositoryUpdateManyPort<
			CultivarRepositoryV2FilterClause,
			CultivarRepositoryV2UpdatePatchDTO,
			CultivarRepositoryV2UpdateManyOutputDTO
		>,
		RepositoryDeleteOnePort<CultivarRepositoryV2FilterClause, CultivarRepositoryV2DeleteOutputDTO>,
		RepositoryDeleteManyPort<CultivarRepositoryV2FilterClause, CultivarRepositoryV2DeleteManyOutputDTO> {
	/**
	 * Same targeting as {@link RepositoryGetOnePort#getOne} (OR `filters` on {@link CultivarRepositoryV2FilterClause}) but returns the cultivar with nested `species`.
	 *
	 * @param input - {@link WithRequiredRepositoryFilters} over {@link CultivarRepositoryV2FilterClause}.
	 * @returns output {@link CultivarRepositoryV2GetFullOutputDTO}.
	 */
	getFullOne(
		input: WithRequiredRepositoryFilters<CultivarRepositoryV2FilterClause>,
	): Promise<CultivarRepositoryV2GetFullOutputDTO>;
}
