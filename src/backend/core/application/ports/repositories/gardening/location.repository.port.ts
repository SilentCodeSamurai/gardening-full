import type { LocationEntity, LocationEntityId } from "@backend/core/domain/gardening/entities";
import type { ItemPresentationValueObject } from "@backend/core/domain/gardening/value-objects";
import type { ItemsContainer } from "@backend/shared/types";
import type {
	BaseScopedCRUDRepositoryPort,
	NoScopedInnerRepositoryDto,
	RepositoryMultiScopedInput,
} from "../shared/base.scoped-crud-repository-port";
import type { BaseRepositoryIdActionInputDTO, BaseRepositoryUpdateInputDTO } from "../shared/types";

export type LocationRepositoryCreateInputDTO = {
	workspaceKey: LocationEntity["workspaceKey"];
	name: string;
	presentation?: ItemPresentationValueObject;
};
export type LocationRepositoryCreateOutputDTO = LocationEntity;

export type LocationRepositoryGetByIdInputDTO = BaseRepositoryIdActionInputDTO<LocationEntity>;
export type LocationRepositoryGetByIdOutputDTO = LocationEntity;

export type LocationRepositoryGetAllOutputDTO = ItemsContainer<LocationEntity>;

export type LocationRepositoryUpdateInputDTO = BaseRepositoryUpdateInputDTO<LocationEntity, never>;
export type LocationRepositoryUpdateOutputDTO = LocationEntity;

export type LocationRepositoryDeleteInputDTO = BaseRepositoryIdActionInputDTO<LocationEntity>;
export type LocationRepositoryDeleteOutputDTO = LocationEntityId;

export type LocationRepositoryDeleteManyInputDTO = {
	ids: LocationEntityId[];
};
export type LocationRepositoryDeleteManyOutputDTO = {
	/** Ids removed, in request order; missing ids are skipped (no error). */
	deletedIds: LocationEntityId[];
};

export interface LocationRepositoryPort
	extends BaseScopedCRUDRepositoryPort<
		LocationRepositoryCreateInputDTO,
		LocationRepositoryCreateOutputDTO,
		NoScopedInnerRepositoryDto,
		LocationRepositoryGetAllOutputDTO,
		LocationRepositoryGetByIdInputDTO,
		LocationRepositoryGetByIdOutputDTO,
		LocationRepositoryUpdateInputDTO,
		LocationRepositoryUpdateOutputDTO,
		LocationRepositoryDeleteInputDTO,
		LocationRepositoryDeleteOutputDTO
	> {
	deleteManyScoped(
		input: RepositoryMultiScopedInput<LocationRepositoryDeleteManyInputDTO>,
	): Promise<LocationRepositoryDeleteManyOutputDTO>;
}
