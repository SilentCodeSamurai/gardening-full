import type { LocationEntity, LocationEntityId } from "@backend/core/domain/gardening/entities";
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

export type LocationRepositoryCreateInputDTO = BaseRepositoryCreateInputDTO<LocationEntity>;
export type LocationRepositoryCreateOutputDTO = LocationEntity;

export type LocationRepositoryCreateManyInputDTO = {
	items: readonly LocationRepositoryCreateInputDTO[];
};
export type LocationRepositoryCreateManyOutputDTO = { count: number };

export type LocationRepositoryGetOneOutputDTO = LocationEntity;

export type LocationRepositoryFilterClause = RepositoryEntityFilterClause<LocationEntity, "createdAt" | "updatedAt">;

export type LocationRepositoryGetManyOutputDTO = ItemsContainer<LocationEntity>;

export type LocationRepositoryUpdatePatchDTO = RepositoryUpdatePatchDto<LocationEntity>;
export type LocationRepositoryUpdateOutputDTO = LocationEntity;

export type LocationRepositoryUpdateManyOutputDTO = { count: number };

export type LocationRepositoryDeleteOutputDTO = LocationEntityId;

export type LocationRepositoryDeleteManyOutputDTO = { count: number };

/**
 * Location persistence (v2): segregated operation ports; {@link RepositoryGetManyPort#getMany} allows omitted `filters` per shared semantics.
 */
export interface LocationRepositoryPort
	extends RepositoryCreateOnePort<LocationRepositoryCreateInputDTO, LocationRepositoryCreateOutputDTO>,
		RepositoryCreateManyPort<LocationRepositoryCreateManyInputDTO, LocationRepositoryCreateManyOutputDTO>,
		RepositoryGetOnePort<LocationRepositoryFilterClause, LocationRepositoryGetOneOutputDTO>,
		RepositoryGetManyPort<LocationRepositoryFilterClause, LocationRepositoryGetManyOutputDTO>,
		RepositoryUpdateOnePort<
			LocationRepositoryFilterClause,
			LocationRepositoryUpdatePatchDTO,
			LocationRepositoryUpdateOutputDTO
		>,
		RepositoryUpdateManyPort<
			LocationRepositoryFilterClause,
			LocationRepositoryUpdatePatchDTO,
			LocationRepositoryUpdateManyOutputDTO
		>,
		RepositoryDeleteOnePort<LocationRepositoryFilterClause, LocationRepositoryDeleteOutputDTO>,
		RepositoryDeleteManyPort<LocationRepositoryFilterClause, LocationRepositoryDeleteManyOutputDTO> {}

export const LocationRepositoryPortToken: InjectionToken<LocationRepositoryPort> = Symbol.for("LocationRepositoryPort");
