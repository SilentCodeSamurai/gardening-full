import type { SpeciesCategoryEntity, SpeciesCategoryEntityId } from "@backend/core/domain/gardening/entities";
import type { ItemsContainer } from "@backend/shared/types";
import type { BaseCRUDRepositoryPort } from "../shared/base.crud-repository.port";
import type {
	BaseRepositoryCreateInputDTO,
	BaseRepositoryIdActionInputDTO,
	BaseRepositoryUpdateInputDTO,
} from "../shared/types";

export type SpeciesCategoryRepositoryCreateInputDTO = Omit<
	BaseRepositoryCreateInputDTO<SpeciesCategoryEntity>,
	"isDefault"
> & { isDefault?: boolean };
export type SpeciesCategoryRepositoryCreateOutputDTO = SpeciesCategoryEntity;

export type SpeciesCategoryRepositoryGetByIdInputDTO = BaseRepositoryIdActionInputDTO<SpeciesCategoryEntity>;
export type SpeciesCategoryRepositoryGetByIdOutputDTO = SpeciesCategoryEntity;

// biome-ignore lint/suspicious/noConfusingVoidType: <This dto is a type parameter used as generic parameter for the BaseCRUDRepositoryPort so it's declared separately for better readability>
export type SpeciesCategoryRepositoryGetAllInputDTO = void;
export type SpeciesCategoryRepositoryGetAllOutputDTO = ItemsContainer<SpeciesCategoryEntity>;

export type SpeciesCategoryRepositoryUpdateInputDTO = BaseRepositoryUpdateInputDTO<SpeciesCategoryEntity>;
export type SpeciesCategoryRepositoryUpdateOutputDTO = SpeciesCategoryEntity;

export type SpeciesCategoryRepositoryDeleteInputDTO = BaseRepositoryIdActionInputDTO<SpeciesCategoryEntity>;
export type SpeciesCategoryRepositoryDeleteOutputDTO = SpeciesCategoryEntityId;

export interface SpeciesCategoryRepositoryPort
	extends BaseCRUDRepositoryPort<
		SpeciesCategoryRepositoryCreateInputDTO,
		SpeciesCategoryRepositoryCreateOutputDTO,
		SpeciesCategoryRepositoryGetByIdInputDTO,
		SpeciesCategoryRepositoryGetByIdOutputDTO,
		SpeciesCategoryRepositoryGetAllInputDTO,
		SpeciesCategoryRepositoryGetAllOutputDTO,
		SpeciesCategoryRepositoryUpdateInputDTO,
		SpeciesCategoryRepositoryUpdateOutputDTO,
		SpeciesCategoryRepositoryDeleteInputDTO,
		SpeciesCategoryRepositoryDeleteOutputDTO
	> {}
