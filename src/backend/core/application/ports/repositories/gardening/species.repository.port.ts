import type { SpeciesEntity, SpeciesEntityId } from "@backend/core/domain/gardening/entities";
import type { ItemsContainer } from "@backend/shared/types";
import type { BaseScopedCRUDRepositoryPort, NoScopedInnerRepositoryDto } from "../shared/base.scoped-crud-repository-port";
import type {
	BaseRepositoryCreateInputDTO,
	BaseRepositoryIdActionInputDTO,
	BaseRepositoryUpdateInputDTO,
} from "../shared/types";

export type SpeciesRepositoryCreateInputDTO = BaseRepositoryCreateInputDTO<SpeciesEntity>;
export type SpeciesRepositoryCreateOutputDTO = SpeciesEntity;

export type SpeciesRepositoryGetByIdInputDTO = BaseRepositoryIdActionInputDTO<SpeciesEntity>;
export type SpeciesRepositoryGetByIdOutputDTO = SpeciesEntity;

export type SpeciesRepositoryGetAllOutputDTO = ItemsContainer<SpeciesEntity>;

export type SpeciesRepositoryUpdateInputDTO = BaseRepositoryUpdateInputDTO<SpeciesEntity>;
export type SpeciesRepositoryUpdateOutputDTO = SpeciesEntity;

export type SpeciesRepositoryDeleteInputDTO = BaseRepositoryIdActionInputDTO<SpeciesEntity>;
export type SpeciesRepositoryDeleteOutputDTO = SpeciesEntityId;

export interface SpeciesRepositoryPort
	extends BaseScopedCRUDRepositoryPort<
		SpeciesRepositoryCreateInputDTO,
		SpeciesRepositoryCreateOutputDTO,
		NoScopedInnerRepositoryDto,
		SpeciesRepositoryGetAllOutputDTO,
		SpeciesRepositoryGetByIdInputDTO,
		SpeciesRepositoryGetByIdOutputDTO,
		SpeciesRepositoryUpdateInputDTO,
		SpeciesRepositoryUpdateOutputDTO,
		SpeciesRepositoryDeleteInputDTO,
		SpeciesRepositoryDeleteOutputDTO
	> {}
