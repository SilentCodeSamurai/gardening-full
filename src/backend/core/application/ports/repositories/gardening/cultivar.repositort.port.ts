import type { CultivarEntity, CultivarEntityId, SpeciesEntity } from "@backend/core/domain/gardening/entities";
import type { ItemsContainer } from "@backend/shared/types";
import type {
	BaseScopedCRUDRepositoryPort,
	NoScopedInnerRepositoryDto,
	RepositorySingleScopedInput,
} from "../shared/base.scoped-crud-repository-port";
import type {
	BaseRepositoryCreateInputDTO,
	BaseRepositoryIdActionInputDTO,
	BaseRepositoryUpdateInputDTO,
} from "../shared/types";

export type CultivarRepositoryCreateInputDTO = BaseRepositoryCreateInputDTO<CultivarEntity>;
export type CultivarRepositoryCreateOutputDTO = CultivarEntity;

export type CultivarRepositoryGetByIdInputDTO = BaseRepositoryIdActionInputDTO<CultivarEntity>;
export type CultivarRepositoryGetByIdOutputDTO = CultivarEntity;

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
	extends BaseScopedCRUDRepositoryPort<
		CultivarRepositoryCreateInputDTO,
		CultivarRepositoryCreateOutputDTO,
		NoScopedInnerRepositoryDto,
		CultivarRepositoryGetAllOutputDTO,
		CultivarRepositoryGetByIdInputDTO,
		CultivarRepositoryGetByIdOutputDTO,
		CultivarRepositoryUpdateInputDTO,
		CultivarRepositoryUpdateOutputDTO,
		CultivarRepositoryDeleteInputDTO,
		CultivarRepositoryDeleteOutputDTO
	> {
	getFullByIdScoped(
		input: RepositorySingleScopedInput<CultivarRepositoryGetFullByIdInputDTO>,
	): Promise<CultivarRepositoryGetFullByIdOutputDTO>;
}

export const CultivarRepositoryToken = Symbol("CultivarRepositoryToken");
