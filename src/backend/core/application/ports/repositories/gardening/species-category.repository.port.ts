import type { SpeciesCategoryEntity, SpeciesCategoryEntityId } from "@backend/core/domain/gardening/entities";
import type { ItemsContainer } from "@backend/shared/types";
import type { BaseScopedCRUDRepositoryPort, NoScopedInnerRepositoryDto } from "../shared/base.scoped-crud-repository-port";
import type {
	BaseRepositoryCreateInputDTO,
	BaseRepositoryIdActionInputDTO,
	BaseRepositoryUpdateInputDTO,
} from "../shared/types";

export type SpeciesCategoryRepositoryCreateInputDTO = BaseRepositoryCreateInputDTO<SpeciesCategoryEntity>;
export type SpeciesCategoryRepositoryCreateOutputDTO = SpeciesCategoryEntity;

export type SpeciesCategoryRepositoryGetByIdInputDTO = BaseRepositoryIdActionInputDTO<SpeciesCategoryEntity>;
export type SpeciesCategoryRepositoryGetByIdOutputDTO = SpeciesCategoryEntity;

export type SpeciesCategoryRepositoryGetAllOutputDTO = ItemsContainer<SpeciesCategoryEntity>;

export type SpeciesCategoryRepositoryUpdateInputDTO = BaseRepositoryUpdateInputDTO<SpeciesCategoryEntity>;
export type SpeciesCategoryRepositoryUpdateOutputDTO = SpeciesCategoryEntity;

export type SpeciesCategoryRepositoryDeleteInputDTO = BaseRepositoryIdActionInputDTO<SpeciesCategoryEntity>;
export type SpeciesCategoryRepositoryDeleteOutputDTO = SpeciesCategoryEntityId;

export interface SpeciesCategoryRepositoryPort
	extends BaseScopedCRUDRepositoryPort<
		SpeciesCategoryRepositoryCreateInputDTO,
		SpeciesCategoryRepositoryCreateOutputDTO,
		NoScopedInnerRepositoryDto,
		SpeciesCategoryRepositoryGetAllOutputDTO,
		SpeciesCategoryRepositoryGetByIdInputDTO,
		SpeciesCategoryRepositoryGetByIdOutputDTO,
		SpeciesCategoryRepositoryUpdateInputDTO,
		SpeciesCategoryRepositoryUpdateOutputDTO,
		SpeciesCategoryRepositoryDeleteInputDTO,
		SpeciesCategoryRepositoryDeleteOutputDTO
	> {}
