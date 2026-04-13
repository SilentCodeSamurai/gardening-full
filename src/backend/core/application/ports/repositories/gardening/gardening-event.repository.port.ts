import type {
	GardeningEventEntity,
	GardeningEventEntityId,
	LocationEntity,
	LocationEntityId,
	PlantEntity,
	PlantEntityId,
} from "@backend/core/domain/gardening/entities";
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

export type GardeningEventRepositoryCreateInputDTO = BaseRepositoryCreateInputDTO<GardeningEventEntity>;
export type GardeningEventRepositoryCreateOutputDTO = GardeningEventEntity;

export type GardeningEventRepositoryCreateManyInputDTO = {
	items: readonly GardeningEventRepositoryCreateInputDTO[];
};
export type GardeningEventRepositoryCreateManyOutputDTO = { count: number };

export type GardeningEventRepositoryGetOneOutputDTO = GardeningEventEntity;

export type GardeningEventRepositoryFilterClause = RepositoryEntityFilterClause<
	GardeningEventEntity,
	"createdAt" | "updatedAt"
>;

export type GardeningEventRepositoryGetManyOutputDTO = ItemsContainer<GardeningEventEntity>;

export type GardeningEventRepositoryUpdatePatchDTO = RepositoryUpdatePatchDto<GardeningEventEntity>;
export type GardeningEventRepositoryUpdateOutputDTO = GardeningEventEntity;

export type GardeningEventRepositoryUpdateManyOutputDTO = { count: number };

export type GardeningEventRepositoryDeleteOutputDTO = GardeningEventEntityId;

export type GardeningEventRepositoryDeleteManyOutputDTO = { count: number };

/** OR branch for events linked to a plant (junction semantics; adapter resolves). */
export type GardeningEventRepositoryForPlantFilterClause = {
	plantId: PlantEntity["id"];
	workspaceKey: PlantEntity["workspaceKey"];
};

/** OR branch for events linked to a location (junction semantics; adapter resolves). */
export type GardeningEventRepositoryForLocationFilterClause = {
	locationId: LocationEntity["id"];
	workspaceKey: LocationEntity["workspaceKey"];
};

export type GardeningEventRepositoryGetBindingsOutputDTO = {
	plantIds: PlantEntityId[];
	locationIds: LocationEntityId[];
};

/**
 * Gardening event persistence (v2): core CRUD via segregated ports; linkage queries and binds are extra methods
 * because `plantId` / `locationId` are not on {@link GardeningEventEntity}.
 */
export interface GardeningEventRepositoryPort
	extends RepositoryCreateOnePort<
			GardeningEventRepositoryCreateInputDTO,
			GardeningEventRepositoryCreateOutputDTO
		>,
		RepositoryCreateManyPort<
			GardeningEventRepositoryCreateManyInputDTO,
			GardeningEventRepositoryCreateManyOutputDTO
		>,
		RepositoryGetOnePort<GardeningEventRepositoryFilterClause, GardeningEventRepositoryGetOneOutputDTO>,
		RepositoryGetManyPort<GardeningEventRepositoryFilterClause, GardeningEventRepositoryGetManyOutputDTO>,
		RepositoryUpdateOnePort<
			GardeningEventRepositoryFilterClause,
			GardeningEventRepositoryUpdatePatchDTO,
			GardeningEventRepositoryUpdateOutputDTO
		>,
		RepositoryUpdateManyPort<
			GardeningEventRepositoryFilterClause,
			GardeningEventRepositoryUpdatePatchDTO,
			GardeningEventRepositoryUpdateManyOutputDTO
		>,
		RepositoryDeleteOnePort<GardeningEventRepositoryFilterClause, GardeningEventRepositoryDeleteOutputDTO>,
		RepositoryDeleteManyPort<
			GardeningEventRepositoryFilterClause,
			GardeningEventRepositoryDeleteManyOutputDTO
		> {
	/**
	 * List events linked to a plant (within adapter scope).
	 *
	 * @param input - {@link WithRequiredRepositoryFilters} over {@link GardeningEventRepositoryForPlantFilterClause}.
	 * @returns output {@link GardeningEventRepositoryGetManyOutputDTO}.
	 */
	getManyForPlant(
		input: WithRequiredRepositoryFilters<GardeningEventRepositoryForPlantFilterClause>,
	): Promise<GardeningEventRepositoryGetManyOutputDTO>;

	/**
	 * List events linked to a location (within adapter scope).
	 *
	 * @param input - {@link WithRequiredRepositoryFilters} over {@link GardeningEventRepositoryForLocationFilterClause}.
	 * @returns output {@link GardeningEventRepositoryGetManyOutputDTO}.
	 */
	getManyForLocation(
		input: WithRequiredRepositoryFilters<GardeningEventRepositoryForLocationFilterClause>,
	): Promise<GardeningEventRepositoryGetManyOutputDTO>;

	/**
	 * Attach an existing event to a plant (junction row).
	 *
	 * @param input - {@link WithRequiredRepositoryFilters} identifying the event, plus `plantId`.
	 * @returns output updated {@link GardeningEventEntity}.
	 */
	bindToPlantOne(
		input: WithRequiredRepositoryFilters<GardeningEventRepositoryFilterClause> & {
			plantId: PlantEntity["id"];
		},
	): Promise<GardeningEventEntity>;

	/**
	 * Attach an existing event to a location (junction row).
	 *
	 * @param input - {@link WithRequiredRepositoryFilters} identifying the event, plus `locationId`.
	 * @returns output updated {@link GardeningEventEntity}.
	 */
	bindToLocationOne(
		input: WithRequiredRepositoryFilters<GardeningEventRepositoryFilterClause> & {
			locationId: LocationEntity["id"];
		},
	): Promise<GardeningEventEntity>;

	/**
	 * Read plant and location binding ids for an event.
	 *
	 * @param input - {@link WithRequiredRepositoryFilters} over {@link GardeningEventRepositoryFilterClause}.
	 * @returns output {@link GardeningEventRepositoryGetBindingsOutputDTO}.
	 */
	getBindingsOne(
		input: WithRequiredRepositoryFilters<GardeningEventRepositoryFilterClause>,
	): Promise<GardeningEventRepositoryGetBindingsOutputDTO>;
}
