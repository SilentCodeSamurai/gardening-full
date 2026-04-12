import type { LocationEntity, LocationEntityId } from "@backend/core/domain/gardening/entities";
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

export type LocationRepositoryV2CreateInputDTO = BaseRepositoryCreateInputDTO<LocationEntity>;
export type LocationRepositoryV2CreateOutputDTO = LocationEntity;

export type LocationRepositoryV2CreateManyInputDTO = {
	items: readonly LocationRepositoryV2CreateInputDTO[];
};
export type LocationRepositoryV2CreateManyOutputDTO = { count: number };

export type LocationRepositoryV2GetOneOutputDTO = LocationEntity;

export type LocationRepositoryV2FilterClause = RepositoryEntityFilterClause<
	LocationEntity,
	"createdAt" | "updatedAt"
>;

export type LocationRepositoryV2GetManyOutputDTO = ItemsContainer<LocationEntity>;

export type LocationRepositoryV2UpdatePatchDTO = RepositoryUpdatePatchDto<LocationEntity>;
export type LocationRepositoryV2UpdateOutputDTO = LocationEntity;

export type LocationRepositoryV2UpdateManyOutputDTO = { count: number };

export type LocationRepositoryV2DeleteOutputDTO = LocationEntityId;

export type LocationRepositoryV2DeleteManyOutputDTO = { count: number };

/**
 * Location persistence (v2): segregated operation ports; {@link RepositoryGetManyPort#getMany} allows omitted `filters` per shared semantics.
 */
export interface LocationRepositoryPortV2
	extends RepositoryCreateOnePort<LocationRepositoryV2CreateInputDTO, LocationRepositoryV2CreateOutputDTO>,
		RepositoryCreateManyPort<LocationRepositoryV2CreateManyInputDTO, LocationRepositoryV2CreateManyOutputDTO>,
		RepositoryGetOnePort<LocationRepositoryV2FilterClause, LocationRepositoryV2GetOneOutputDTO>,
		RepositoryGetManyPort<LocationRepositoryV2FilterClause, LocationRepositoryV2GetManyOutputDTO>,
		RepositoryUpdateOnePort<
			LocationRepositoryV2FilterClause,
			LocationRepositoryV2UpdatePatchDTO,
			LocationRepositoryV2UpdateOutputDTO
		>,
		RepositoryUpdateManyPort<
			LocationRepositoryV2FilterClause,
			LocationRepositoryV2UpdatePatchDTO,
			LocationRepositoryV2UpdateManyOutputDTO
		>,
		RepositoryDeleteOnePort<LocationRepositoryV2FilterClause, LocationRepositoryV2DeleteOutputDTO>,
		RepositoryDeleteManyPort<LocationRepositoryV2FilterClause, LocationRepositoryV2DeleteManyOutputDTO> {}
