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

export type SpeciesCategoryRepositoryV2CreateInputDTO = BaseRepositoryCreateInputDTO<SpeciesCategoryEntity>;
export type SpeciesCategoryRepositoryV2CreateOutputDTO = SpeciesCategoryEntity;

export type SpeciesCategoryRepositoryV2CreateManyInputDTO = {
	items: readonly SpeciesCategoryRepositoryV2CreateInputDTO[];
};
export type SpeciesCategoryRepositoryV2CreateManyOutputDTO = { count: number };

export type SpeciesCategoryRepositoryV2GetOneOutputDTO = SpeciesCategoryEntity;

/**
 * One OR branch for this aggregate: partial entity match (audit fields excluded).
 */
export type SpeciesCategoryRepositoryV2FilterClause = RepositoryEntityFilterClause<
	SpeciesCategoryEntity,
	"createdAt" | "updatedAt"
>;

export type SpeciesCategoryRepositoryV2GetManyOutputDTO = ItemsContainer<SpeciesCategoryEntity>;

export type SpeciesCategoryRepositoryV2UpdatePatchDTO = RepositoryUpdatePatchDto<SpeciesCategoryEntity>;
export type SpeciesCategoryRepositoryV2UpdateOutputDTO = SpeciesCategoryEntity;

export type SpeciesCategoryRepositoryV2UpdateManyOutputDTO = { count: number };

export type SpeciesCategoryRepositoryV2DeleteOutputDTO = SpeciesCategoryEntityId;

export type SpeciesCategoryRepositoryV2DeleteManyOutputDTO = { count: number };

/**
 * Species category persistence (v2): {@link RepositoryCreateManyPort#createMany} uses DTOs only;
 * {@link RepositoryGetManyPort#getMany} accepts optional `filters` (omit for all rows within adapter scope);
 * {@link RepositoryGetOnePort#getOne} and deletes use required OR `filters`; updates use required `filters` + patch `dto`.
 */
export interface SpeciesCategoryRepositoryPortV2
	extends RepositoryCreateOnePort<
			SpeciesCategoryRepositoryV2CreateInputDTO,
			SpeciesCategoryRepositoryV2CreateOutputDTO
		>,
		RepositoryCreateManyPort<
			SpeciesCategoryRepositoryV2CreateManyInputDTO,
			SpeciesCategoryRepositoryV2CreateManyOutputDTO
		>,
		RepositoryGetOnePort<SpeciesCategoryRepositoryV2FilterClause, SpeciesCategoryRepositoryV2GetOneOutputDTO>,
		RepositoryGetManyPort<SpeciesCategoryRepositoryV2FilterClause, SpeciesCategoryRepositoryV2GetManyOutputDTO>,
		RepositoryUpdateOnePort<
			SpeciesCategoryRepositoryV2FilterClause,
			SpeciesCategoryRepositoryV2UpdatePatchDTO,
			SpeciesCategoryRepositoryV2UpdateOutputDTO
		>,
		RepositoryUpdateManyPort<
			SpeciesCategoryRepositoryV2FilterClause,
			SpeciesCategoryRepositoryV2UpdatePatchDTO,
			SpeciesCategoryRepositoryV2UpdateManyOutputDTO
		>,
		RepositoryDeleteOnePort<SpeciesCategoryRepositoryV2FilterClause, SpeciesCategoryRepositoryV2DeleteOutputDTO>,
		RepositoryDeleteManyPort<
			SpeciesCategoryRepositoryV2FilterClause,
			SpeciesCategoryRepositoryV2DeleteManyOutputDTO
		> {}
