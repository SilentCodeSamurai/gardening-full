import type { SpeciesEntity, SpeciesEntityId } from "@backend/core/domain/gardening/entities";
import type { ItemsContainer } from "@backend/shared/types";
import type { BaseCRUDRepositoryPort } from "../shared/base.crud-repository.port";
import type {
	BaseRepositoryCreateInputDTO,
	BaseRepositoryIdActionInputDTO,
	BaseRepositoryUpdateInputDTO,
} from "../shared/types";

export type SpeciesRepositoryCreateInputDTO = BaseRepositoryCreateInputDTO<SpeciesEntity>;
export type SpeciesRepositoryCreateOutputDTO = SpeciesEntity;

export type SpeciesRepositoryGetByIdInputDTO = BaseRepositoryIdActionInputDTO<SpeciesEntity>;
export type SpeciesRepositoryGetByIdOutputDTO = SpeciesEntity;

// biome-ignore lint/suspicious/noConfusingVoidType: <This dto is a type parameter used as generic parameter for the BaseCRUDRepositoryPort so it's declared separately for better readability>
export type SpeciesRepositoryGetAllInputDTO = void;
export type SpeciesRepositoryGetAllOutputDTO = ItemsContainer<SpeciesEntity>;

export type SpeciesRepositoryUpdateInputDTO = BaseRepositoryUpdateInputDTO<SpeciesEntity>;
export type SpeciesRepositoryUpdateOutputDTO = SpeciesEntity;

export type SpeciesRepositoryDeleteInputDTO = BaseRepositoryIdActionInputDTO<SpeciesEntity>;
export type SpeciesRepositoryDeleteOutputDTO = SpeciesEntityId;

export interface SpeciesRepositoryPort
	extends BaseCRUDRepositoryPort<
		SpeciesRepositoryCreateInputDTO,
		SpeciesRepositoryCreateOutputDTO,
		SpeciesRepositoryGetByIdInputDTO,
		SpeciesRepositoryGetByIdOutputDTO,
		SpeciesRepositoryGetAllInputDTO,
		SpeciesRepositoryGetAllOutputDTO,
		SpeciesRepositoryUpdateInputDTO,
		SpeciesRepositoryUpdateOutputDTO,
		SpeciesRepositoryDeleteInputDTO,
		SpeciesRepositoryDeleteOutputDTO
	> {}
