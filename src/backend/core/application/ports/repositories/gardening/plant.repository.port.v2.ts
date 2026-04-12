import type { HydratedPlantEntity, PlantEntity, PlantEntityId } from "@backend/core/domain/gardening/entities";
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

export type PlantRepositoryV2CreateInputDTO = BaseRepositoryCreateInputDTO<PlantEntity>;
export type PlantRepositoryV2CreateOutputDTO = HydratedPlantEntity;

export type PlantRepositoryV2CreateManyInputDTO = {
	items: readonly PlantRepositoryV2CreateInputDTO[];
};
export type PlantRepositoryV2CreateManyOutputDTO = ItemsContainer<HydratedPlantEntity>;

export type PlantRepositoryV2GetOneOutputDTO = HydratedPlantEntity;

export type PlantRepositoryV2FilterClause = RepositoryEntityFilterClause<
	PlantEntity,
	"createdAt" | "updatedAt"
>;

export type PlantRepositoryV2GetManyOutputDTO = ItemsContainer<HydratedPlantEntity>;

export type PlantRepositoryV2UpdatePatchDTO = RepositoryUpdatePatchDto<PlantEntity>;
export type PlantRepositoryV2UpdateOutputDTO = HydratedPlantEntity;

export type PlantRepositoryV2UpdateManyOutputDTO = { count: number };

export type PlantRepositoryV2DeleteOutputDTO = PlantEntityId;

export type PlantRepositoryV2DeleteManyOutputDTO = { count: number };

/**
 * Plant persistence (v2): rows are hydrated with cultivar/species on reads and creates; filter clauses use {@link PlantEntity} shape.
 *
 * Legacy `getByCultivarId` / `getListByIds` map to {@link RepositoryGetManyPort#getMany} with OR `filters` (e.g. one clause per id, or a dedicated clause shape the adapter understands).
 */
export interface PlantRepositoryPortV2
	extends RepositoryCreateOnePort<PlantRepositoryV2CreateInputDTO, PlantRepositoryV2CreateOutputDTO>,
		RepositoryCreateManyPort<PlantRepositoryV2CreateManyInputDTO, PlantRepositoryV2CreateManyOutputDTO>,
		RepositoryGetOnePort<PlantRepositoryV2FilterClause, PlantRepositoryV2GetOneOutputDTO>,
		RepositoryGetManyPort<PlantRepositoryV2FilterClause, PlantRepositoryV2GetManyOutputDTO>,
		RepositoryUpdateOnePort<
			PlantRepositoryV2FilterClause,
			PlantRepositoryV2UpdatePatchDTO,
			PlantRepositoryV2UpdateOutputDTO
		>,
		RepositoryUpdateManyPort<
			PlantRepositoryV2FilterClause,
			PlantRepositoryV2UpdatePatchDTO,
			PlantRepositoryV2UpdateManyOutputDTO
		>,
		RepositoryDeleteOnePort<PlantRepositoryV2FilterClause, PlantRepositoryV2DeleteOutputDTO>,
		RepositoryDeleteManyPort<PlantRepositoryV2FilterClause, PlantRepositoryV2DeleteManyOutputDTO> {}
