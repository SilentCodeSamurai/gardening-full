import type { GardeningEventRepositoryPort } from "@backend/core/application/ports/repositories/gardening/gardening-event.repository.port";
import type { LocationRepositoryPort } from "@backend/core/application/ports/repositories/gardening/location.repository.port";
import type { PlantRepositoryPort } from "@backend/core/application/ports/repositories/gardening/plant.repository.port";
import type { SpatialNodeRepositoryPort } from "@backend/core/application/ports/repositories/spatial/spatial-node.repository.port";
import {
	APPLICATION_RESOURCE_TYPES,
	gardeningEventRef,
	gardeningLocationRef,
	gardeningPlantRef,
} from "@backend/core/application/resource-refs";
import { AccessControlApplicationService } from "@backend/core/application/services/access-control/access-control.application-service";
import type { IUseCase } from "@backend/core/application/use-cases/shared/use-case.interface";
import type { UseCaseRequest } from "@backend/core/application/use-cases/use-case-context";
import type {
	GardeningEventEntity,
	GardeningEventEntityId,
	LocationEntityId,
	PlantEntityId,
} from "@backend/core/domain/gardening/entities";
import type { GardeningAction } from "@backend/core/domain/gardening/value-objects";
import type { ItemsContainer } from "@backend/shared/types";

export type GardeningEventGetAllUseCaseInput = UseCaseRequest;
export type GardeningEventGetAllUseCaseOutput = ItemsContainer<GardeningEventEntity>;

export class GardeningEventGetAllUseCase
	implements IUseCase<GardeningEventGetAllUseCaseInput, GardeningEventGetAllUseCaseOutput>
{
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly gardeningEventRepository: GardeningEventRepositoryPort,
	) {}

	public async execute(input: GardeningEventGetAllUseCaseInput): Promise<GardeningEventGetAllUseCaseOutput> {
		const mask = await this.access.getReadableResourceMask({
			actorRef: input.context.actorRef,
			resourceType: APPLICATION_RESOURCE_TYPES.event,
		});
		const all = await this.gardeningEventRepository.getAll();
		return { items: AccessControlApplicationService.filterItemsByReadableMask(all.items, mask) };
	}
}

export type GardeningEventGetByIdUseCaseInput = UseCaseRequest<{ id: GardeningEventEntityId }>;
export type GardeningEventGetByIdUseCaseOutput = GardeningEventEntity;

export class GardeningEventGetByIdUseCase
	implements IUseCase<GardeningEventGetByIdUseCaseInput, GardeningEventGetByIdUseCaseOutput>
{
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly gardeningEventRepository: GardeningEventRepositoryPort,
	) {}

	public async execute(input: GardeningEventGetByIdUseCaseInput): Promise<GardeningEventGetByIdUseCaseOutput> {
		const row = await this.gardeningEventRepository.getById({ id: input.dto.id });
		await this.access.assertCanRead(input.context, gardeningEventRef(String(input.dto.id)));
		return row;
	}
}

export type GardeningEventUpdateUseCaseInput = UseCaseRequest<{
	id: GardeningEventEntityId;
	action?: GardeningAction;
}>;
export type GardeningEventUpdateUseCaseOutput = GardeningEventEntity;

export class GardeningEventUpdateUseCase
	implements IUseCase<GardeningEventUpdateUseCaseInput, GardeningEventUpdateUseCaseOutput>
{
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly gardeningEventRepository: GardeningEventRepositoryPort,
	) {}

	public async execute(input: GardeningEventUpdateUseCaseInput): Promise<GardeningEventUpdateUseCaseOutput> {
		await this.gardeningEventRepository.getById({ id: input.dto.id });
		await this.access.assertCanUpdate(input.context, gardeningEventRef(String(input.dto.id)));
		return this.gardeningEventRepository.update(input.dto);
	}
}

export type GardeningEventDeleteUseCaseInput = UseCaseRequest<{ id: GardeningEventEntityId }>;
export type GardeningEventDeleteUseCaseOutput = GardeningEventEntityId;

export class GardeningEventDeleteUseCase
	implements IUseCase<GardeningEventDeleteUseCaseInput, GardeningEventDeleteUseCaseOutput>
{
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly gardeningEventRepository: GardeningEventRepositoryPort,
	) {}

	public async execute(input: GardeningEventDeleteUseCaseInput): Promise<GardeningEventDeleteUseCaseOutput> {
		await this.gardeningEventRepository.getById({ id: input.dto.id });
		await this.access.assertCanDelete(input.context, gardeningEventRef(String(input.dto.id)));
		return this.gardeningEventRepository.delete({ id: input.dto.id });
	}
}

export type GardeningEventCreateUseCaseInput = UseCaseRequest<{
	action: GardeningAction;
}>;
export type GardeningEventCreateUseCaseOutput = GardeningEventEntity;

export class GardeningEventCreateUseCase
	implements IUseCase<GardeningEventCreateUseCaseInput, GardeningEventCreateUseCaseOutput>
{
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly gardeningEventRepository: GardeningEventRepositoryPort,
	) {}

	public async execute(input: GardeningEventCreateUseCaseInput): Promise<GardeningEventCreateUseCaseOutput> {
		await this.access.assertCanCreate(input.context, input.context.workspaceRef);
		const gardeningEvent = await this.gardeningEventRepository.create({
			action: input.dto.action,
		});
		await this.access.bootstrapResourceAdminForActor(input.context, gardeningEventRef(String(gardeningEvent.id)));
		return gardeningEvent;
	}
}

export type GardeningEventCreateForLocationUseCaseInput = UseCaseRequest<{
	locationId: LocationEntityId;
	action: GardeningAction;
}>;
export type GardeningEventCreateForLocationUseCaseOutput = GardeningEventEntity;

export class GardeningEventCreateForLocationUseCase
	implements IUseCase<GardeningEventCreateForLocationUseCaseInput, GardeningEventCreateForLocationUseCaseOutput>
{
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly gardeningEventRepository: GardeningEventRepositoryPort,
		private readonly plantRepository: PlantRepositoryPort,
		private readonly spatialNodeRepository: SpatialNodeRepositoryPort,
		private readonly locationRepository: LocationRepositoryPort,
	) {}

	public async execute(
		input: GardeningEventCreateForLocationUseCaseInput,
	): Promise<GardeningEventCreateForLocationUseCaseOutput> {
		await this.locationRepository.getById({ id: input.dto.locationId });
		await this.access.assertCanRead(input.context, gardeningLocationRef(String(input.dto.locationId)));
		await this.access.assertCanCreate(input.context, input.context.workspaceRef);
		const gardeningEvent = await this.gardeningEventRepository.create({
			action: input.dto.action,
		});
		await this.access.bootstrapResourceAdminForActor(input.context, gardeningEventRef(String(gardeningEvent.id)));
		try {
			const locationNode = await this.spatialNodeRepository.getByRef({
				ref: { entity: "location", entityId: String(input.dto.locationId) },
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
			locationId: input.dto.locationId,
		});
		return gardeningEvent;
	}
}

export type GardeningEventCreateForPlantListUseCaseInput = UseCaseRequest<{
	action: GardeningAction;
	plantIds: PlantEntityId[];
}>;
export type GardeningEventCreateForPlantListUseCaseOutput = GardeningEventEntity;

export class GardeningEventCreateForPlantListUseCase
	implements IUseCase<GardeningEventCreateForPlantListUseCaseInput, GardeningEventCreateForPlantListUseCaseOutput>
{
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly gardeningEventRepository: GardeningEventRepositoryPort,
		private readonly plantRepository: PlantRepositoryPort,
	) {}

	public async execute(
		input: GardeningEventCreateForPlantListUseCaseInput,
	): Promise<GardeningEventCreateForPlantListUseCaseOutput> {
		for (const pid of input.dto.plantIds) {
			await this.plantRepository.getById({ id: pid });
			await this.access.assertCanRead(input.context, gardeningPlantRef(String(pid)));
		}
		await this.access.assertCanCreate(input.context, input.context.workspaceRef);
		const gardeningEvent = await this.gardeningEventRepository.create({
			action: input.dto.action,
		});
		await this.access.bootstrapResourceAdminForActor(input.context, gardeningEventRef(String(gardeningEvent.id)));
		const plants = await this.plantRepository.getListByIds({ ids: input.dto.plantIds });
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

export type GardeningEventGetForPlantUseCaseInput = UseCaseRequest<{ plantId: PlantEntityId }>;
export type GardeningEventGetForPlantUseCaseOutput = ItemsContainer<GardeningEventEntity>;

export class GardeningEventGetForPlantUseCase
	implements IUseCase<GardeningEventGetForPlantUseCaseInput, GardeningEventGetForPlantUseCaseOutput>
{
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly gardeningEventRepository: GardeningEventRepositoryPort,
		private readonly plantRepository: PlantRepositoryPort,
	) {}

	public async execute(
		input: GardeningEventGetForPlantUseCaseInput,
	): Promise<GardeningEventGetForPlantUseCaseOutput> {
		await this.plantRepository.getById({ id: input.dto.plantId });
		await this.access.assertCanRead(input.context, gardeningPlantRef(String(input.dto.plantId)));
		const raw = await this.gardeningEventRepository.getForPlant({ plantId: input.dto.plantId });
		const mask = await this.access.getReadableResourceMask({
			actorRef: input.context.actorRef,
			resourceType: APPLICATION_RESOURCE_TYPES.event,
		});
		return { items: AccessControlApplicationService.filterItemsByReadableMask(raw.items, mask) };
	}
}

export type GardeningEventGetForLocationUseCaseInput = UseCaseRequest<{ locationId: LocationEntityId }>;
export type GardeningEventGetForLocationUseCaseOutput = ItemsContainer<GardeningEventEntity>;

export class GardeningEventGetForLocationUseCase
	implements IUseCase<GardeningEventGetForLocationUseCaseInput, GardeningEventGetForLocationUseCaseOutput>
{
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly gardeningEventRepository: GardeningEventRepositoryPort,
		private readonly locationRepository: LocationRepositoryPort,
	) {}

	public async execute(
		input: GardeningEventGetForLocationUseCaseInput,
	): Promise<GardeningEventGetForLocationUseCaseOutput> {
		await this.locationRepository.getById({ id: input.dto.locationId });
		await this.access.assertCanRead(input.context, gardeningLocationRef(String(input.dto.locationId)));
		const raw = await this.gardeningEventRepository.getForLocation({ locationId: input.dto.locationId });
		const mask = await this.access.getReadableResourceMask({
			actorRef: input.context.actorRef,
			resourceType: APPLICATION_RESOURCE_TYPES.event,
		});
		return { items: AccessControlApplicationService.filterItemsByReadableMask(raw.items, mask) };
	}
}

export type GardeningEventGetBindingsForEventUseCaseInput = UseCaseRequest<{ id: GardeningEventEntityId }>;
export type GardeningEventGetBindingsForEventUseCaseOutput = {
	plantIds: PlantEntityId[];
	locationIds: LocationEntityId[];
};

export class GardeningEventGetBindingsForEventUseCase
	implements IUseCase<GardeningEventGetBindingsForEventUseCaseInput, GardeningEventGetBindingsForEventUseCaseOutput>
{
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly gardeningEventRepository: GardeningEventRepositoryPort,
	) {}

	public async execute(
		input: GardeningEventGetBindingsForEventUseCaseInput,
	): Promise<GardeningEventGetBindingsForEventUseCaseOutput> {
		await this.gardeningEventRepository.getById({ id: input.dto.id });
		await this.access.assertCanRead(input.context, gardeningEventRef(String(input.dto.id)));
		return this.gardeningEventRepository.getBindingsForEvent({ id: input.dto.id });
	}
}
