import type {
	GardeningEventEntity,
	GardeningEventEntityId,
	LocationEntityId,
	PlantEntityId,
} from "@backend/core/domain/gardening/entities.v2";
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
	WithRequiredRepositoryFilters,
} from "../shared/repository-operation-ports";
import type { BaseRepositoryCreateInputDTO } from "../shared/types";

export type GardeningEventRepositoryV2CreateInputDTO = BaseRepositoryCreateInputDTO<GardeningEventEntity>;
export type GardeningEventRepositoryV2CreateOutputDTO = GardeningEventEntity;

export type GardeningEventRepositoryV2CreateManyInputDTO = {
	items: readonly GardeningEventRepositoryV2CreateInputDTO[];
};
export type GardeningEventRepositoryV2CreateManyOutputDTO = { count: number };

export type GardeningEventRepositoryV2GetOneOutputDTO = GardeningEventEntity;

export type GardeningEventRepositoryV2FilterClause = RepositoryEntityFilterClause<
	GardeningEventEntity,
	"createdAt" | "updatedAt"
>;

export type GardeningEventRepositoryV2GetManyOutputDTO = ItemsContainer<GardeningEventEntity>;

export type GardeningEventRepositoryV2UpdatePatchDTO = RepositoryUpdatePatchDto<GardeningEventEntity>;
export type GardeningEventRepositoryV2UpdateOutputDTO = GardeningEventEntity;

export type GardeningEventRepositoryV2UpdateManyOutputDTO = { count: number };

export type GardeningEventRepositoryV2DeleteOutputDTO = GardeningEventEntityId;

export type GardeningEventRepositoryV2DeleteManyOutputDTO = { count: number };

/** OR branch for events linked to a plant (junction semantics; adapter resolves). */
export type GardeningEventRepositoryV2ForPlantFilterClause = {
	plantId: PlantEntityId;
};

/** OR branch for events linked to a location (junction semantics; adapter resolves). */
export type GardeningEventRepositoryV2ForLocationFilterClause = {
	locationId: LocationEntityId;
};

export type GardeningEventRepositoryV2GetBindingsOutputDTO = {
	plantIds: PlantEntityId[];
	locationIds: LocationEntityId[];
};

/**
 * Gardening event persistence (v2): core CRUD via segregated ports; linkage queries and binds are extra methods
 * because `plantId` / `locationId` are not on {@link GardeningEventEntity}.
 */
export interface GardeningEventRepositoryPortV2
	extends RepositoryCreateOnePort<
			GardeningEventRepositoryV2CreateInputDTO,
			GardeningEventRepositoryV2CreateOutputDTO
		>,
		RepositoryCreateManyPort<
			GardeningEventRepositoryV2CreateManyInputDTO,
			GardeningEventRepositoryV2CreateManyOutputDTO
		>,
		RepositoryGetOnePort<GardeningEventRepositoryV2FilterClause, GardeningEventRepositoryV2GetOneOutputDTO>,
		RepositoryGetManyPort<GardeningEventRepositoryV2FilterClause, GardeningEventRepositoryV2GetManyOutputDTO>,
		RepositoryUpdateOnePort<
			GardeningEventRepositoryV2FilterClause,
			GardeningEventRepositoryV2UpdatePatchDTO,
			GardeningEventRepositoryV2UpdateOutputDTO
		>,
		RepositoryUpdateManyPort<
			GardeningEventRepositoryV2FilterClause,
			GardeningEventRepositoryV2UpdatePatchDTO,
			GardeningEventRepositoryV2UpdateManyOutputDTO
		>,
		RepositoryDeleteOnePort<GardeningEventRepositoryV2FilterClause, GardeningEventRepositoryV2DeleteOutputDTO>,
		RepositoryDeleteManyPort<
			GardeningEventRepositoryV2FilterClause,
			GardeningEventRepositoryV2DeleteManyOutputDTO
		> {
	/**
	 * List events linked to a plant (within adapter scope).
	 *
	 * @param input - {@link WithRequiredRepositoryFilters} over {@link GardeningEventRepositoryV2ForPlantFilterClause}.
	 * @returns output {@link GardeningEventRepositoryV2GetManyOutputDTO}.
	 */
	getManyForPlant(
		input: WithRequiredRepositoryFilters<GardeningEventRepositoryV2ForPlantFilterClause>,
	): Promise<GardeningEventRepositoryV2GetManyOutputDTO>;

	/**
	 * List events linked to a location (within adapter scope).
	 *
	 * @param input - {@link WithRequiredRepositoryFilters} over {@link GardeningEventRepositoryV2ForLocationFilterClause}.
	 * @returns output {@link GardeningEventRepositoryV2GetManyOutputDTO}.
	 */
	getManyForLocation(
		input: WithRequiredRepositoryFilters<GardeningEventRepositoryV2ForLocationFilterClause>,
	): Promise<GardeningEventRepositoryV2GetManyOutputDTO>;

	/**
	 * Attach an existing event to a plant (junction row).
	 *
	 * @param input - {@link WithRequiredRepositoryFilters} identifying the event, plus `plantId`.
	 * @returns output updated {@link GardeningEventEntity}.
	 */
	bindToPlantOne(
		input: WithRequiredRepositoryFilters<GardeningEventRepositoryV2FilterClause> & {
			plantId: PlantEntityId;
		},
	): Promise<GardeningEventEntity>;

	/**
	 * Attach an existing event to a location (junction row).
	 *
	 * @param input - {@link WithRequiredRepositoryFilters} identifying the event, plus `locationId`.
	 * @returns output updated {@link GardeningEventEntity}.
	 */
	bindToLocationOne(
		input: WithRequiredRepositoryFilters<GardeningEventRepositoryV2FilterClause> & {
			locationId: LocationEntityId;
		},
	): Promise<GardeningEventEntity>;

	/**
	 * Read plant and location binding ids for an event.
	 *
	 * @param input - {@link WithRequiredRepositoryFilters} over {@link GardeningEventRepositoryV2FilterClause}.
	 * @returns output {@link GardeningEventRepositoryV2GetBindingsOutputDTO}.
	 */
	getBindingsOne(
		input: WithRequiredRepositoryFilters<GardeningEventRepositoryV2FilterClause>,
	): Promise<GardeningEventRepositoryV2GetBindingsOutputDTO>;
}
