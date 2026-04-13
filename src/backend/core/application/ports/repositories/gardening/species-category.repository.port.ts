import type { SpeciesCategoryEntity, SpeciesCategoryEntityId } from "@backend/core/domain/gardening/entities";
import type { ItemsContainer } from "@backend/shared/types";
import type {
	RepositoryCreateManyPort,
	RepositoryCreateOnePort,
	RepositoryDeleteManyPort,
	RepositoryDeleteOnePort,
	RepositoryEntityFilterClause,
	RepositoryGetManyPort,
	RepositoryGetOnePort,
	RepositoryUpdateManyPort,
	RepositoryUpdateOnePort,
	RepositoryUpdatePatchDto,
} from "../shared/repository-operation-ports";
import type { BaseRepositoryCreateInputDTO } from "../shared/types";

export type SpeciesCategoryRepositoryCreateInputDTO = BaseRepositoryCreateInputDTO<SpeciesCategoryEntity>;
export type SpeciesCategoryRepositoryCreateOutputDTO = SpeciesCategoryEntity;

export type SpeciesCategoryRepositoryCreateManyInputDTO = {
	items: readonly SpeciesCategoryRepositoryCreateInputDTO[];
};
export type SpeciesCategoryRepositoryCreateManyOutputDTO = { count: number };

export type SpeciesCategoryRepositoryGetOneOutputDTO = SpeciesCategoryEntity;

/**
 * One OR branch for this aggregate: partial entity match (audit fields excluded).
 */
export type SpeciesCategoryRepositoryFilterClause = RepositoryEntityFilterClause<
	SpeciesCategoryEntity,
	"createdAt" | "updatedAt"
>;

export type SpeciesCategoryRepositoryGetManyOutputDTO = ItemsContainer<SpeciesCategoryEntity>;

export type SpeciesCategoryRepositoryUpdatePatchDTO = RepositoryUpdatePatchDto<SpeciesCategoryEntity>;
export type SpeciesCategoryRepositoryUpdateOutputDTO = SpeciesCategoryEntity;

export type SpeciesCategoryRepositoryUpdateManyOutputDTO = { count: number };

export type SpeciesCategoryRepositoryDeleteOutputDTO = SpeciesCategoryEntityId;

export type SpeciesCategoryRepositoryDeleteManyOutputDTO = { count: number };

/**
 * Species category persistence (v2): {@link RepositoryCreateManyPort#createMany} uses DTOs only;
 * {@link RepositoryGetManyPort#getMany} accepts optional `filters` (omit for all rows within adapter scope);
 * {@link RepositoryGetOnePort#getOne} and deletes use required OR `filters`; updates use required `filters` + patch `dto`.
 */
export interface SpeciesCategoryRepositoryPort
	extends RepositoryCreateOnePort<
			SpeciesCategoryRepositoryCreateInputDTO,
			SpeciesCategoryRepositoryCreateOutputDTO
		>,
		RepositoryCreateManyPort<
			SpeciesCategoryRepositoryCreateManyInputDTO,
			SpeciesCategoryRepositoryCreateManyOutputDTO
		>,
		RepositoryGetOnePort<SpeciesCategoryRepositoryFilterClause, SpeciesCategoryRepositoryGetOneOutputDTO>,
		RepositoryGetManyPort<SpeciesCategoryRepositoryFilterClause, SpeciesCategoryRepositoryGetManyOutputDTO>,
		RepositoryUpdateOnePort<
			SpeciesCategoryRepositoryFilterClause,
			SpeciesCategoryRepositoryUpdatePatchDTO,
			SpeciesCategoryRepositoryUpdateOutputDTO
		>,
		RepositoryUpdateManyPort<
			SpeciesCategoryRepositoryFilterClause,
			SpeciesCategoryRepositoryUpdatePatchDTO,
			SpeciesCategoryRepositoryUpdateManyOutputDTO
		>,
		RepositoryDeleteOnePort<SpeciesCategoryRepositoryFilterClause, SpeciesCategoryRepositoryDeleteOutputDTO>,
		RepositoryDeleteManyPort<
			SpeciesCategoryRepositoryFilterClause,
			SpeciesCategoryRepositoryDeleteManyOutputDTO
		> {}
