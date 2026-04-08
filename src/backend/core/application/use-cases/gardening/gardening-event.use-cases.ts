import type { GardeningAction } from "@backend/core/domain/gardening/value-objects";
import type {
	GardeningEventEntity,
	GardeningEventEntityId,
	LocationEntityId,
	PlantEntityId,
} from "@backend/core/domain/gardening/entities";
import type { ItemsContainer } from "@backend/shared/types";
import type { IUseCase } from "../shared/use-case.interface";
import type { GardeningEventRepositoryPort } from "../../ports/repositories/gardening/gardening-event.repository.port";
import type { PlantRepositoryPort } from "../../ports/repositories/gardening/plant.repository.port";
import type { SpatialNodeRepositoryPort } from "../../ports/repositories/spatial/spatial-node.repository.port";

export type GardeningEventGetAllUseCaseOutput = ItemsContainer<GardeningEventEntity>;

export class GardeningEventGetAllUseCase implements IUseCase<void, GardeningEventGetAllUseCaseOutput> {
	constructor(private readonly gardeningEventRepository: GardeningEventRepositoryPort) {}

	public async execute(): Promise<GardeningEventGetAllUseCaseOutput> {
		return this.gardeningEventRepository.getAll();
	}
}

export type GardeningEventGetByIdUseCaseInput = {
	id: GardeningEventEntityId;
};
export type GardeningEventGetByIdUseCaseOutput = GardeningEventEntity;

export class GardeningEventGetByIdUseCase
	implements IUseCase<GardeningEventGetByIdUseCaseInput, GardeningEventGetByIdUseCaseOutput>
{
	constructor(private readonly gardeningEventRepository: GardeningEventRepositoryPort) {}

	public async execute(input: GardeningEventGetByIdUseCaseInput): Promise<GardeningEventGetByIdUseCaseOutput> {
		return this.gardeningEventRepository.getById(input);
	}
}

export type GardeningEventUpdateUseCaseInput = {
	id: GardeningEventEntityId;
	action?: GardeningAction;
};
export type GardeningEventUpdateUseCaseOutput = GardeningEventEntity;

export class GardeningEventUpdateUseCase
	implements IUseCase<GardeningEventUpdateUseCaseInput, GardeningEventUpdateUseCaseOutput>
{
	constructor(private readonly gardeningEventRepository: GardeningEventRepositoryPort) {}

	public async execute(input: GardeningEventUpdateUseCaseInput): Promise<GardeningEventUpdateUseCaseOutput> {
		return this.gardeningEventRepository.update(input);
	}
}

export type GardeningEventDeleteUseCaseInput = {
	id: GardeningEventEntityId;
};
export type GardeningEventDeleteUseCaseOutput = GardeningEventEntityId;

export class GardeningEventDeleteUseCase
	implements IUseCase<GardeningEventDeleteUseCaseInput, GardeningEventDeleteUseCaseOutput>
{
	constructor(private readonly gardeningEventRepository: GardeningEventRepositoryPort) {}

	public async execute(input: GardeningEventDeleteUseCaseInput): Promise<GardeningEventDeleteUseCaseOutput> {
		return this.gardeningEventRepository.delete(input);
	}
}

export type GardeningEventCreateUseCaseInput = {
	action: GardeningAction;
};
export type GardeningEventCreateUseCaseOutput = GardeningEventEntity;

export class GardeningEventCreateUseCase
	implements IUseCase<GardeningEventCreateUseCaseInput, GardeningEventCreateUseCaseOutput>
{
	constructor(private readonly gardeningEventRepository: GardeningEventRepositoryPort) {}

	public async execute(input: GardeningEventCreateUseCaseInput): Promise<GardeningEventCreateUseCaseOutput> {
		return this.gardeningEventRepository.create({
			action: input.action,
		});
	}
}

export type GardeningEventCreateForLocationUseCaseInput = {
	locationId: LocationEntityId;
	action: GardeningAction;
};
export type GardeningEventCreateForLocationUseCaseOutput = GardeningEventEntity;

export class GardeningEventCreateForLocationUseCase
	implements IUseCase<GardeningEventCreateForLocationUseCaseInput, GardeningEventCreateForLocationUseCaseOutput>
{
	constructor(
		private readonly gardeningEventRepository: GardeningEventRepositoryPort,
		private readonly plantRepository: PlantRepositoryPort,
		private readonly spatialNodeRepository: SpatialNodeRepositoryPort,
	) {}

	public async execute(
		input: GardeningEventCreateForLocationUseCaseInput,
	): Promise<GardeningEventCreateForLocationUseCaseOutput> {
		const gardeningEvent = await this.gardeningEventRepository.create({
			action: input.action,
		});
		try {
			const locationNode = await this.spatialNodeRepository.getByRef({
				ref: { entity: "location", entityId: String(input.locationId) },
			});
			const allNodes = await this.spatialNodeRepository.getAll();
			const directPlantIds = allNodes.items
				.filter(
					(n) =>
						n.ref.entity === "plant" &&
						n.parentId !== null &&
						String(n.parentId) === String(locationNode.id),
				)
				.map((n) => n.ref.entityId as PlantEntityId);
			const plants = await this.plantRepository.getListByIds({ ids: directPlantIds });
			await Promise.all(
				plants.items.map((plant) =>
					this.gardeningEventRepository.bindToPlant({
						id: gardeningEvent.id,
						plantId: plant.id,
					}),
				),
			);
		} catch {
			// Spatial mapping is optional during bootstrap/reset states.
		}
		await this.gardeningEventRepository.bindToLocation({
			id: gardeningEvent.id,
			locationId: input.locationId,
		});
		return gardeningEvent;
	}
}

export type GardeningEventCreateForPlantListUseCaseInput = {
	action: GardeningAction;
	plantIds: PlantEntityId[];
};
export type GardeningEventCreateForPlantListUseCaseOutput = GardeningEventEntity;

export class GardeningEventCreateForPlantListUseCase
	implements IUseCase<GardeningEventCreateForPlantListUseCaseInput, GardeningEventCreateForPlantListUseCaseOutput>
{
	constructor(
		private readonly gardeningEventRepository: GardeningEventRepositoryPort,
		private readonly plantRepository: PlantRepositoryPort,
	) {}

	public async execute(
		input: GardeningEventCreateForPlantListUseCaseInput,
	): Promise<GardeningEventCreateForPlantListUseCaseOutput> {
		const gardeningEvent = await this.gardeningEventRepository.create({
			action: input.action,
		});
		const plants = await this.plantRepository.getListByIds({ ids: input.plantIds });
		const promises = [];
		for (const plant of plants.items) {
			promises.push(
				this.gardeningEventRepository.bindToPlant({
					id: gardeningEvent.id,
					plantId: plant.id,
				}),
			);
		}
		await Promise.all(promises);
		return gardeningEvent;
	}
}

export type GardeningEventGetForPlantUseCaseInput = {
	plantId: PlantEntityId;
};
export type GardeningEventGetForPlantUseCaseOutput = ItemsContainer<GardeningEventEntity>;

export class GardeningEventGetForPlantUseCase
	implements IUseCase<GardeningEventGetForPlantUseCaseInput, GardeningEventGetForPlantUseCaseOutput>
{
	constructor(private readonly gardeningEventRepository: GardeningEventRepositoryPort) {}

	public async execute(
		input: GardeningEventGetForPlantUseCaseInput,
	): Promise<GardeningEventGetForPlantUseCaseOutput> {
		return this.gardeningEventRepository.getForPlant(input);
	}
}

export type GardeningEventGetForLocationUseCaseInput = {
	locationId: LocationEntityId;
};
export type GardeningEventGetForLocationUseCaseOutput = ItemsContainer<GardeningEventEntity>;

export class GardeningEventGetForLocationUseCase
	implements IUseCase<GardeningEventGetForLocationUseCaseInput, GardeningEventGetForLocationUseCaseOutput>
{
	constructor(private readonly gardeningEventRepository: GardeningEventRepositoryPort) {}

	public async execute(
		input: GardeningEventGetForLocationUseCaseInput,
	): Promise<GardeningEventGetForLocationUseCaseOutput> {
		return this.gardeningEventRepository.getForLocation(input);
	}
}

export type GardeningEventGetBindingsForEventUseCaseInput = {
	id: GardeningEventEntityId;
};
export type GardeningEventGetBindingsForEventUseCaseOutput = {
	plantIds: PlantEntityId[];
	locationIds: LocationEntityId[];
};

export class GardeningEventGetBindingsForEventUseCase
	implements IUseCase<GardeningEventGetBindingsForEventUseCaseInput, GardeningEventGetBindingsForEventUseCaseOutput>
{
	constructor(private readonly gardeningEventRepository: GardeningEventRepositoryPort) {}

	public async execute(
		input: GardeningEventGetBindingsForEventUseCaseInput,
	): Promise<GardeningEventGetBindingsForEventUseCaseOutput> {
		return this.gardeningEventRepository.getBindingsForEvent({ id: input.id });
	}
}
