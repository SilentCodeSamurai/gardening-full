import type { CultivarEntity, CultivarEntityId, SpeciesEntity } from "@backend/core/domain/gardening/entities";
import type { ItemsContainer } from "@backend/shared/types";
import type { InjectionToken } from "tsyringe";
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

export type CultivarRepositoryCreateInputDTO = BaseRepositoryCreateInputDTO<CultivarEntity>;
export type CultivarRepositoryCreateOutputDTO = CultivarEntity;

export type CultivarRepositoryCreateManyInputDTO = {
	items: readonly CultivarRepositoryCreateInputDTO[];
};
export type CultivarRepositoryCreateManyOutputDTO = { count: number };

export type CultivarRepositoryGetOneOutputDTO = CultivarEntity;

export type CultivarRepositoryFilterClause = RepositoryEntityFilterClause<CultivarEntity, "createdAt" | "updatedAt">;

export type CultivarRepositoryGetManyOutputDTO = ItemsContainer<CultivarEntity>;

export type CultivarRepositoryUpdatePatchDTO = RepositoryUpdatePatchDto<CultivarEntity>;
export type CultivarRepositoryUpdateOutputDTO = CultivarEntity;

export type CultivarRepositoryUpdateManyOutputDTO = { count: number };

export type CultivarRepositoryDeleteOutputDTO = CultivarEntityId;

export type CultivarRepositoryDeleteManyOutputDTO = { count: number };

export type CultivarRepositoryGetFullOutputDTO = CultivarEntity & {
	species: SpeciesEntity;
};

/**
 * Cultivar persistence (v2): standard segregated ports plus {@link CultivarRepositoryPort#getFullOne} for species-hydrated reads.
 */
export interface CultivarRepositoryPort
	extends RepositoryCreateOnePort<CultivarRepositoryCreateInputDTO, CultivarRepositoryCreateOutputDTO>,
		RepositoryCreateManyPort<CultivarRepositoryCreateManyInputDTO, CultivarRepositoryCreateManyOutputDTO>,
		RepositoryGetOnePort<CultivarRepositoryFilterClause, CultivarRepositoryGetOneOutputDTO>,
		RepositoryGetManyPort<CultivarRepositoryFilterClause, CultivarRepositoryGetManyOutputDTO>,
		RepositoryUpdateOnePort<
			CultivarRepositoryFilterClause,
			CultivarRepositoryUpdatePatchDTO,
			CultivarRepositoryUpdateOutputDTO
		>,
		RepositoryUpdateManyPort<
			CultivarRepositoryFilterClause,
			CultivarRepositoryUpdatePatchDTO,
			CultivarRepositoryUpdateManyOutputDTO
		>,
		RepositoryDeleteOnePort<CultivarRepositoryFilterClause, CultivarRepositoryDeleteOutputDTO>,
		RepositoryDeleteManyPort<CultivarRepositoryFilterClause, CultivarRepositoryDeleteManyOutputDTO> {
	/**
	 * Same targeting as {@link RepositoryGetOnePort#getOne} (OR `filters` on {@link CultivarRepositoryFilterClause}) but returns the cultivar with nested `species`.
	 *
	 * @param input - {@link WithRequiredRepositoryFilters} over {@link CultivarRepositoryFilterClause}.
	 * @returns output {@link CultivarRepositoryGetFullOutputDTO}.
	 */
	getFullOne(
		input: WithRequiredRepositoryFilters<CultivarRepositoryFilterClause>,
	): Promise<CultivarRepositoryGetFullOutputDTO>;
}

export const CultivarRepositoryPortToken: InjectionToken<CultivarRepositoryPort> = Symbol.for("CultivarRepositoryPort");
