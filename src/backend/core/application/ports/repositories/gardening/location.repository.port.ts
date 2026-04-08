import type { LocationEntity, LocationEntityId } from "@backend/core/domain/gardening/entities";
import type { ItemPresentationValueObject } from "@backend/core/domain/gardening/value-objects";
import type { ItemsContainer } from "@backend/shared/types";
import type { BaseCRUDRepositoryPort } from "../shared/base.crud-repository.port";
import type { BaseRepositoryIdActionInputDTO, BaseRepositoryUpdateInputDTO } from "../shared/types";

export type LocationRepositoryCreateInputDTO = {
	name: string;
	presentation?: ItemPresentationValueObject;
};
export type LocationRepositoryCreateOutputDTO = LocationEntity;

export type LocationRepositoryGetByIdInputDTO = BaseRepositoryIdActionInputDTO<LocationEntity>;
export type LocationRepositoryGetByIdOutputDTO = LocationEntity;

// biome-ignore lint/suspicious/noConfusingVoidType: <This dto is a type parameter used as generic parameter for the BaseCRUDRepositoryPort so it's declared separately for better readability>
export type LocationRepositoryGetAllInputDTO = void;
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
	extends BaseCRUDRepositoryPort<
		LocationRepositoryCreateInputDTO,
		LocationRepositoryCreateOutputDTO,
		LocationRepositoryGetByIdInputDTO,
		LocationRepositoryGetByIdOutputDTO,
		LocationRepositoryGetAllInputDTO,
		LocationRepositoryGetAllOutputDTO,
		LocationRepositoryUpdateInputDTO,
		LocationRepositoryUpdateOutputDTO,
		LocationRepositoryDeleteInputDTO,
		LocationRepositoryDeleteOutputDTO
	> {
	deleteMany(dto: LocationRepositoryDeleteManyInputDTO): Promise<LocationRepositoryDeleteManyOutputDTO>;
}
