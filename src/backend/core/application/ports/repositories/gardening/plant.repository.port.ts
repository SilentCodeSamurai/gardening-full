import type {
	CultivarEntityId,
	HydratedPlantEntity,
	PlantEntity,
	PlantEntityId,
} from "@backend/core/domain/gardening/entities";
import type { ItemsContainer } from "@backend/shared/types";
import type {
	BaseScopedCRUDRepositoryPort,
	NoScopedInnerRepositoryDto,
	RepositoryMultiScopedInput,
} from "../shared/base.scoped-crud-repository-port";
import type { BaseRepositoryIdActionInputDTO, BaseRepositoryUpdateInputDTO } from "../shared/types";

export type PlantRepositoryCreateInputDTO = {
	workspaceKey: PlantEntity["workspaceKey"];
	title: PlantEntity["title"];
	description: PlantEntity["description"];
	cultivarId: PlantEntity["cultivarId"];
};
export type PlantRepositoryCreateOutputDTO = HydratedPlantEntity;

export type PlantRepositoryCreateManyInputDTO = PlantRepositoryCreateInputDTO[];
export type PlantRepositoryCreateManyOutputDTO = ItemsContainer<HydratedPlantEntity>;

/** Each row carries `workspaceKey`; wrapper matches {@link RepositoryCreateScopedInput} shape without a duplicate outer key. */
export type PlantRepositoryCreateManyScopedInputDTO = {
	dto: { rows: PlantRepositoryCreateManyInputDTO };
};

export type PlantRepositoryGetByIdInputDTO = BaseRepositoryIdActionInputDTO<PlantEntity>;
export type PlantRepositoryGetByIdOutputDTO = HydratedPlantEntity;

export type PlantRepositoryGetListByIdsInputDTO = {
	ids: PlantEntityId[];
};
export type PlantRepositoryGetListByIdsOutputDTO = ItemsContainer<HydratedPlantEntity>;

export type PlantRepositoryGetAllOutputDTO = ItemsContainer<HydratedPlantEntity>;

export type PlantRepositoryUpdateInputDTO = BaseRepositoryUpdateInputDTO<PlantEntity, never>;
export type PlantRepositoryUpdateOutputDTO = HydratedPlantEntity;

export type PlantRepositoryGetByCultivarIdInputDTO = {
	cultivarId: CultivarEntityId;
};
export type PlantRepositoryGetByCultivarIdOutputDTO = ItemsContainer<HydratedPlantEntity>;

export type PlantRepositoryDeleteInputDTO = BaseRepositoryIdActionInputDTO<PlantEntity>;
export type PlantRepositoryDeleteOutputDTO = PlantEntityId;

export type PlantRepositoryDeleteManyInputDTO = {
	ids: PlantEntityId[];
};
export type PlantRepositoryDeleteManyOutputDTO = {
	/** Ids removed, in request order; missing ids are skipped (no error). */
	deletedIds: PlantEntityId[];
};

export interface PlantRepositoryPort
	extends BaseScopedCRUDRepositoryPort<
		PlantRepositoryCreateInputDTO,
		PlantRepositoryCreateOutputDTO,
		NoScopedInnerRepositoryDto,
		PlantRepositoryGetAllOutputDTO,
		PlantRepositoryGetByIdInputDTO,
		PlantRepositoryGetByIdOutputDTO,
		PlantRepositoryUpdateInputDTO,
		PlantRepositoryUpdateOutputDTO,
		PlantRepositoryDeleteInputDTO,
		PlantRepositoryDeleteOutputDTO
	> {
	createManyScoped(input: PlantRepositoryCreateManyScopedInputDTO): Promise<PlantRepositoryCreateManyOutputDTO>;
	getByCultivarIdScoped(
		input: RepositoryMultiScopedInput<PlantRepositoryGetByCultivarIdInputDTO>,
	): Promise<PlantRepositoryGetByCultivarIdOutputDTO>;
	getListByIdsScoped(
		input: RepositoryMultiScopedInput<PlantRepositoryGetListByIdsInputDTO>,
	): Promise<PlantRepositoryGetListByIdsOutputDTO>;
	deleteManyScoped(
		input: RepositoryMultiScopedInput<PlantRepositoryDeleteManyInputDTO>,
	): Promise<PlantRepositoryDeleteManyOutputDTO>;
}
