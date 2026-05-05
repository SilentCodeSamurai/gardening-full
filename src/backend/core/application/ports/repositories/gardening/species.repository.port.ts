import type { SpeciesEntity, SpeciesEntityId } from "@backend/core/domain/gardening/entities";
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
} from "../shared/repository-operation-ports";
import type { BaseRepositoryCreateInputDTO } from "../shared/types";

export type SpeciesRepositoryCreateInputDTO = BaseRepositoryCreateInputDTO<SpeciesEntity> & {
	id?: SpeciesEntityId;
};
export type SpeciesRepositoryCreateOutputDTO = SpeciesEntity;

export type SpeciesRepositoryCreateManyInputDTO = {
	items: readonly SpeciesRepositoryCreateInputDTO[];
};
export type SpeciesRepositoryCreateManyOutputDTO = { count: number };

export type SpeciesRepositoryGetOneOutputDTO = SpeciesEntity;

export type SpeciesRepositoryFilterClause = RepositoryEntityFilterClause<SpeciesEntity, "createdAt" | "updatedAt">;

export type SpeciesRepositoryGetManyOutputDTO = ItemsContainer<SpeciesEntity>;

export type SpeciesRepositoryUpdatePatchDTO = RepositoryUpdatePatchDto<SpeciesEntity>;
export type SpeciesRepositoryUpdateOutputDTO = SpeciesEntity;

export type SpeciesRepositoryUpdateManyOutputDTO = { count: number };

export type SpeciesRepositoryDeleteOutputDTO = SpeciesEntityId;

export type SpeciesRepositoryDeleteManyOutputDTO = { count: number };

/**
 * Species catalog persistence (v2): same operation layout as {@link SpeciesCategoryRepositoryPort}; {@link RepositoryGetManyPort#getMany} allows omitted `filters` for “all” within adapter scope.
 */
export interface SpeciesRepositoryPort
	extends RepositoryCreateOnePort<SpeciesRepositoryCreateInputDTO, SpeciesRepositoryCreateOutputDTO>,
		RepositoryCreateManyPort<SpeciesRepositoryCreateManyInputDTO, SpeciesRepositoryCreateManyOutputDTO>,
		RepositoryGetOnePort<SpeciesRepositoryFilterClause, SpeciesRepositoryGetOneOutputDTO>,
		RepositoryGetManyPort<SpeciesRepositoryFilterClause, SpeciesRepositoryGetManyOutputDTO>,
		RepositoryUpdateOnePort<
			SpeciesRepositoryFilterClause,
			SpeciesRepositoryUpdatePatchDTO,
			SpeciesRepositoryUpdateOutputDTO
		>,
		RepositoryUpdateManyPort<
			SpeciesRepositoryFilterClause,
			SpeciesRepositoryUpdatePatchDTO,
			SpeciesRepositoryUpdateManyOutputDTO
		>,
		RepositoryDeleteOnePort<SpeciesRepositoryFilterClause, SpeciesRepositoryDeleteOutputDTO>,
		RepositoryDeleteManyPort<SpeciesRepositoryFilterClause, SpeciesRepositoryDeleteManyOutputDTO> {}

export const SpeciesRepositoryPortToken: InjectionToken<SpeciesRepositoryPort> = Symbol.for("SpeciesRepositoryPort");
