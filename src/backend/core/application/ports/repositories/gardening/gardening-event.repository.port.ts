import type {
	GardeningEventEntity,
	GardeningEventEntityId,
	LocationEntityId,
	PlantEntityId,
} from "@backend/core/domain/gardening/entities";
import type { ItemsContainer } from "@backend/shared/types";
import type { BaseCRUDRepositoryPort } from "../shared/base.crud-repository.port";
import type {
	BaseRepositoryCreateInputDTO,
	BaseRepositoryIdActionInputDTO,
	BaseRepositoryUpdateInputDTO,
} from "../shared/types";

export type GardeningEventRepositoryCreateInputDTO = BaseRepositoryCreateInputDTO<GardeningEventEntity>;
export type GardeningEventRepositoryCreateOutputDTO = GardeningEventEntity;

export type GardeningEventRepositoryGetByIdInputDTO = BaseRepositoryIdActionInputDTO<GardeningEventEntity>;
export type GardeningEventRepositoryGetByIdOutputDTO = GardeningEventEntity;

// biome-ignore lint/suspicious/noConfusingVoidType: <This dto is a type parameter used as generic parameter for the BaseCRUDRepositoryPort so it's declared separately for better readability>
export type GardeningEventRepositoryGetAllInputDTO = void;
export type GardeningEventRepositoryGetAllOutputDTO = ItemsContainer<GardeningEventEntity>;

export type GardeningEventRepositoryUpdateInputDTO = BaseRepositoryUpdateInputDTO<GardeningEventEntity>;
export type GardeningEventRepositoryUpdateOutputDTO = GardeningEventEntity;

export type GardeningEventRepositoryBindToPlantInputDTO = BaseRepositoryIdActionInputDTO<GardeningEventEntity> & {
	plantId: PlantEntityId;
};
export type GardeningEventRepositoryBindToPlantOutputDTO = GardeningEventEntity;

export type GardeningEventRepositoryBindToLocationInputDTO = BaseRepositoryIdActionInputDTO<GardeningEventEntity> & {
	locationId: LocationEntityId;
};
export type GardeningEventRepositoryBindToLocationOutputDTO = GardeningEventEntity;

export type GardeningEventRepositoryDeleteInputDTO = BaseRepositoryIdActionInputDTO<GardeningEventEntity>;
export type GardeningEventRepositoryDeleteOutputDTO = GardeningEventEntityId;

export type GardeningEventRepositoryGetForPlantInputDTO = {
	plantId: PlantEntityId;
};
export type GardeningEventRepositoryGetForPlantOutputDTO = ItemsContainer<GardeningEventEntity>;

export type GardeningEventRepositoryGetForLocationInputDTO = {
	locationId: LocationEntityId;
};
export type GardeningEventRepositoryGetForLocationOutputDTO = ItemsContainer<GardeningEventEntity>;

export type GardeningEventRepositoryGetBindingsForEventInputDTO = BaseRepositoryIdActionInputDTO<GardeningEventEntity>;
export type GardeningEventRepositoryGetBindingsForEventOutputDTO = {
	plantIds: PlantEntityId[];
	locationIds: LocationEntityId[];
};

export interface GardeningEventRepositoryPort
	extends BaseCRUDRepositoryPort<
		GardeningEventRepositoryCreateInputDTO,
		GardeningEventRepositoryCreateOutputDTO,
		GardeningEventRepositoryGetByIdInputDTO,
		GardeningEventRepositoryGetByIdOutputDTO,
		GardeningEventRepositoryGetAllInputDTO,
		GardeningEventRepositoryGetAllOutputDTO,
		GardeningEventRepositoryUpdateInputDTO,
		GardeningEventRepositoryUpdateOutputDTO,
		GardeningEventRepositoryDeleteInputDTO,
		GardeningEventRepositoryDeleteOutputDTO
	> {
	getForPlant(
		input: GardeningEventRepositoryGetForPlantInputDTO,
	): Promise<GardeningEventRepositoryGetForPlantOutputDTO>;
	getForLocation(
		input: GardeningEventRepositoryGetForLocationInputDTO,
	): Promise<GardeningEventRepositoryGetForLocationOutputDTO>;
	bindToPlant(
		input: GardeningEventRepositoryBindToPlantInputDTO,
	): Promise<GardeningEventRepositoryBindToPlantOutputDTO>;
	bindToLocation(
		input: GardeningEventRepositoryBindToLocationInputDTO,
	): Promise<GardeningEventRepositoryBindToLocationOutputDTO>;
	getBindingsForEvent(
		input: GardeningEventRepositoryGetBindingsForEventInputDTO,
	): Promise<GardeningEventRepositoryGetBindingsForEventOutputDTO>;
}
