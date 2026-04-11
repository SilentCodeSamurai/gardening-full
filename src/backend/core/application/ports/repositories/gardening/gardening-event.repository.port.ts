import type {
	GardeningEventEntity,
	GardeningEventEntityId,
	LocationEntityId,
	PlantEntityId,
} from "@backend/core/domain/gardening/entities";
import type { ItemsContainer } from "@backend/shared/types";
import type {
	BaseScopedCRUDRepositoryPort,
	NoScopedInnerRepositoryDto,
	RepositoryMultiScopedInput,
	RepositorySingleScopedInput,
} from "../shared/base.scoped-crud-repository-port";
import type {
	BaseRepositoryCreateInputDTO,
	BaseRepositoryIdActionInputDTO,
	BaseRepositoryUpdateInputDTO,
} from "../shared/types";

export type GardeningEventRepositoryCreateInputDTO = BaseRepositoryCreateInputDTO<GardeningEventEntity>;
export type GardeningEventRepositoryCreateOutputDTO = GardeningEventEntity;

export type GardeningEventRepositoryGetByIdInputDTO = BaseRepositoryIdActionInputDTO<GardeningEventEntity>;
export type GardeningEventRepositoryGetByIdOutputDTO = GardeningEventEntity;

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
	extends BaseScopedCRUDRepositoryPort<
		GardeningEventRepositoryCreateInputDTO,
		GardeningEventRepositoryCreateOutputDTO,
		NoScopedInnerRepositoryDto,
		GardeningEventRepositoryGetAllOutputDTO,
		GardeningEventRepositoryGetByIdInputDTO,
		GardeningEventRepositoryGetByIdOutputDTO,
		GardeningEventRepositoryUpdateInputDTO,
		GardeningEventRepositoryUpdateOutputDTO,
		GardeningEventRepositoryDeleteInputDTO,
		GardeningEventRepositoryDeleteOutputDTO
	> {
	getForPlantScoped(
		input: RepositoryMultiScopedInput<GardeningEventRepositoryGetForPlantInputDTO>,
	): Promise<GardeningEventRepositoryGetForPlantOutputDTO>;
	getForLocationScoped(
		input: RepositoryMultiScopedInput<GardeningEventRepositoryGetForLocationInputDTO>,
	): Promise<GardeningEventRepositoryGetForLocationOutputDTO>;
	bindToPlantScoped(
		input: RepositorySingleScopedInput<GardeningEventRepositoryBindToPlantInputDTO>,
	): Promise<GardeningEventRepositoryBindToPlantOutputDTO>;
	bindToLocationScoped(
		input: RepositorySingleScopedInput<GardeningEventRepositoryBindToLocationInputDTO>,
	): Promise<GardeningEventRepositoryBindToLocationOutputDTO>;
	getBindingsForEventScoped(
		input: RepositorySingleScopedInput<GardeningEventRepositoryGetBindingsForEventInputDTO>,
	): Promise<GardeningEventRepositoryGetBindingsForEventOutputDTO>;
}
