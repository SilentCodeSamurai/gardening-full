import type {
	PlantEntity,
	PlantEntityId,
	CultivarEntityId,
	HydratedPlantEntity,
} from "@backend/core/domain/gardening/entities";
import type { ItemsContainer } from "@backend/shared/types";
import type { BaseCRUDRepositoryPort } from "../shared/base.crud-repository.port";
import type { BaseRepositoryIdActionInputDTO, BaseRepositoryUpdateInputDTO } from "../shared/types";

export type PlantRepositoryCreateInputDTO = {
	title: PlantEntity["title"];
	description: PlantEntity["description"];
	cultivarId: PlantEntity["cultivarId"];
};
export type PlantRepositoryCreateOutputDTO = HydratedPlantEntity;

export type PlantRepositoryCreateManyInputDTO = PlantRepositoryCreateInputDTO[];
export type PlantRepositoryCreateManyOutputDTO = ItemsContainer<HydratedPlantEntity>;

export type PlantRepositoryGetByIdInputDTO = BaseRepositoryIdActionInputDTO<PlantEntity>;
export type PlantRepositoryGetByIdOutputDTO = HydratedPlantEntity;

export type PlantRepositoryGetListByIdsInputDTO = {
	ids: PlantEntityId[];
};
export type PlantRepositoryGetListByIdsOutputDTO = ItemsContainer<HydratedPlantEntity>;

// biome-ignore lint/suspicious/noConfusingVoidType: <This dto is a type parameter used as generic parameter for the BaseCRUDRepositoryPort so it's declared separately for better readability>
export type PlantRepositoryGetAllInputDTO = void;
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
	extends BaseCRUDRepositoryPort<
		PlantRepositoryCreateInputDTO,
		PlantRepositoryCreateOutputDTO,
		PlantRepositoryGetByIdInputDTO,
		PlantRepositoryGetByIdOutputDTO,
		PlantRepositoryGetAllInputDTO,
		PlantRepositoryGetAllOutputDTO,
		PlantRepositoryUpdateInputDTO,
		PlantRepositoryUpdateOutputDTO,
		PlantRepositoryDeleteInputDTO,
		PlantRepositoryDeleteOutputDTO
	> {
	createMany(rows: PlantRepositoryCreateManyInputDTO): Promise<PlantRepositoryCreateManyOutputDTO>;
	getByCultivarId(dto: PlantRepositoryGetByCultivarIdInputDTO): Promise<PlantRepositoryGetByCultivarIdOutputDTO>;
	getListByIds(dto: PlantRepositoryGetListByIdsInputDTO): Promise<PlantRepositoryGetListByIdsOutputDTO>;
	deleteMany(dto: PlantRepositoryDeleteManyInputDTO): Promise<PlantRepositoryDeleteManyOutputDTO>;
}
