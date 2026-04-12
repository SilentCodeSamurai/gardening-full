import type { SpeciesEntity, SpeciesEntityId } from "@backend/core/domain/gardening/entities.v2";
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

export type SpeciesRepositoryV2CreateInputDTO = BaseRepositoryCreateInputDTO<SpeciesEntity>;
export type SpeciesRepositoryV2CreateOutputDTO = SpeciesEntity;

export type SpeciesRepositoryV2CreateManyInputDTO = {
	items: readonly SpeciesRepositoryV2CreateInputDTO[];
};
export type SpeciesRepositoryV2CreateManyOutputDTO = { count: number };

export type SpeciesRepositoryV2GetOneOutputDTO = SpeciesEntity;

export type SpeciesRepositoryV2FilterClause = RepositoryEntityFilterClause<SpeciesEntity, "createdAt" | "updatedAt">;

export type SpeciesRepositoryV2GetManyOutputDTO = ItemsContainer<SpeciesEntity>;

export type SpeciesRepositoryV2UpdatePatchDTO = RepositoryUpdatePatchDto<SpeciesEntity>;
export type SpeciesRepositoryV2UpdateOutputDTO = SpeciesEntity;

export type SpeciesRepositoryV2UpdateManyOutputDTO = { count: number };

export type SpeciesRepositoryV2DeleteOutputDTO = SpeciesEntityId;

export type SpeciesRepositoryV2DeleteManyOutputDTO = { count: number };

/**
 * Species catalog persistence (v2): same operation layout as {@link SpeciesCategoryRepositoryPortV2}; {@link RepositoryGetManyPort#getMany} allows omitted `filters` for “all” within adapter scope.
 */
export interface SpeciesRepositoryPortV2
	extends RepositoryCreateOnePort<SpeciesRepositoryV2CreateInputDTO, SpeciesRepositoryV2CreateOutputDTO>,
		RepositoryCreateManyPort<SpeciesRepositoryV2CreateManyInputDTO, SpeciesRepositoryV2CreateManyOutputDTO>,
		RepositoryGetOnePort<SpeciesRepositoryV2FilterClause, SpeciesRepositoryV2GetOneOutputDTO>,
		RepositoryGetManyPort<SpeciesRepositoryV2FilterClause, SpeciesRepositoryV2GetManyOutputDTO>,
		RepositoryUpdateOnePort<
			SpeciesRepositoryV2FilterClause,
			SpeciesRepositoryV2UpdatePatchDTO,
			SpeciesRepositoryV2UpdateOutputDTO
		>,
		RepositoryUpdateManyPort<
			SpeciesRepositoryV2FilterClause,
			SpeciesRepositoryV2UpdatePatchDTO,
			SpeciesRepositoryV2UpdateManyOutputDTO
		>,
		RepositoryDeleteOnePort<SpeciesRepositoryV2FilterClause, SpeciesRepositoryV2DeleteOutputDTO>,
		RepositoryDeleteManyPort<SpeciesRepositoryV2FilterClause, SpeciesRepositoryV2DeleteManyOutputDTO> {}
