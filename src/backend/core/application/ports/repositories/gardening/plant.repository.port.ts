import type { HydratedPlantEntity, PlantEntity, PlantEntityId } from "@backend/core/domain/gardening/entities";
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

export type PlantRepositoryCreateInputDTO = BaseRepositoryCreateInputDTO<PlantEntity>;
export type PlantRepositoryCreateOutputDTO = HydratedPlantEntity;

export type PlantRepositoryCreateManyInputDTO = {
	items: readonly PlantRepositoryCreateInputDTO[];
};
export type PlantRepositoryCreateManyOutputDTO = ItemsContainer<HydratedPlantEntity>;

export type PlantRepositoryGetOneOutputDTO = HydratedPlantEntity;

export type PlantRepositoryFilterClause = RepositoryEntityFilterClause<PlantEntity, "createdAt" | "updatedAt">;

export type PlantRepositoryGetManyOutputDTO = ItemsContainer<HydratedPlantEntity>;

export type PlantRepositoryUpdatePatchDTO = RepositoryUpdatePatchDto<PlantEntity>;
export type PlantRepositoryUpdateOutputDTO = HydratedPlantEntity;

export type PlantRepositoryUpdateManyOutputDTO = { count: number };

export type PlantRepositoryDeleteOutputDTO = PlantEntityId;

export type PlantRepositoryDeleteManyOutputDTO = { count: number };

/**
 * Plant persistence (v2): rows are hydrated with cultivar/species on reads and creates; filter clauses use {@link PlantEntity} shape.
 *
 * Legacy `getByCultivarId` / `getListByIds` map to {@link RepositoryGetManyPort#getMany} with OR `filters` (e.g. one clause per id, or a dedicated clause shape the adapter understands).
 */
export interface PlantRepositoryPort
	extends RepositoryCreateOnePort<PlantRepositoryCreateInputDTO, PlantRepositoryCreateOutputDTO>,
		RepositoryCreateManyPort<PlantRepositoryCreateManyInputDTO, PlantRepositoryCreateManyOutputDTO>,
		RepositoryGetOnePort<PlantRepositoryFilterClause, PlantRepositoryGetOneOutputDTO>,
		RepositoryGetManyPort<PlantRepositoryFilterClause, PlantRepositoryGetManyOutputDTO>,
		RepositoryUpdateOnePort<
			PlantRepositoryFilterClause,
			PlantRepositoryUpdatePatchDTO,
			PlantRepositoryUpdateOutputDTO
		>,
		RepositoryUpdateManyPort<
			PlantRepositoryFilterClause,
			PlantRepositoryUpdatePatchDTO,
			PlantRepositoryUpdateManyOutputDTO
		>,
		RepositoryDeleteOnePort<PlantRepositoryFilterClause, PlantRepositoryDeleteOutputDTO>,
		RepositoryDeleteManyPort<PlantRepositoryFilterClause, PlantRepositoryDeleteManyOutputDTO> {}

export const PlantRepositoryPortToken: InjectionToken<PlantRepositoryPort> = Symbol.for("PlantRepositoryPort");
