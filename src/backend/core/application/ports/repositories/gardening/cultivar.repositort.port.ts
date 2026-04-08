import type { CultivarEntity, CultivarEntityId, SpeciesEntity } from "@backend/core/domain/gardening/entities";
import type { ItemsContainer } from "@backend/shared/types";
import type { BaseCRUDRepositoryPort } from "../shared/base.crud-repository.port";
import type {
	BaseRepositoryCreateInputDTO,
	BaseRepositoryIdActionInputDTO,
	BaseRepositoryUpdateInputDTO,
} from "../shared/types";

export type CultivarRepositoryCreateInputDTO = BaseRepositoryCreateInputDTO<CultivarEntity>;
export type CultivarRepositoryCreateOutputDTO = CultivarEntity;

export type CultivarRepositoryGetByIdInputDTO = BaseRepositoryIdActionInputDTO<CultivarEntity>;
export type CultivarRepositoryGetByIdOutputDTO = CultivarEntity;

// biome-ignore lint/suspicious/noConfusingVoidType: <This dto is a type parameter used as generic parameter for the BaseCRUDRepositoryPort so it's declared separately for better readability>
export type CultivarRepositoryGetAllInputDTO = void;
export type CultivarRepositoryGetAllOutputDTO = ItemsContainer<CultivarEntity>;

export type CultivarRepositoryUpdateInputDTO = BaseRepositoryUpdateInputDTO<CultivarEntity>;
export type CultivarRepositoryUpdateOutputDTO = CultivarEntity;

export type CultivarRepositoryDeleteInputDTO = BaseRepositoryIdActionInputDTO<CultivarEntity>;
export type CultivarRepositoryDeleteOutputDTO = CultivarEntityId;

export type CultivarRepositoryGetFullByIdInputDTO = BaseRepositoryIdActionInputDTO<CultivarEntity>;
export type CultivarRepositoryGetFullByIdOutputDTO = CultivarEntity & {
	species: SpeciesEntity;
};

export interface CultivarRepositoryPort
	extends BaseCRUDRepositoryPort<
		CultivarRepositoryCreateInputDTO,
		CultivarRepositoryCreateOutputDTO,
		CultivarRepositoryGetByIdInputDTO,
		CultivarRepositoryGetByIdOutputDTO,
		CultivarRepositoryGetAllInputDTO,
		CultivarRepositoryGetAllOutputDTO,
		CultivarRepositoryUpdateInputDTO,
		CultivarRepositoryUpdateOutputDTO,
		CultivarRepositoryDeleteInputDTO,
		CultivarRepositoryDeleteOutputDTO
	> {
	getFullById(dto: CultivarRepositoryGetFullByIdInputDTO): Promise<CultivarRepositoryGetFullByIdOutputDTO>;
}

export const CultivarRepositoryToken = Symbol("CultivarRepositoryToken");
