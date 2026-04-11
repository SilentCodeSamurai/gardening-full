import type { GardeningEventRepositoryPort } from "@backend/core/application/ports/repositories/gardening/gardening-event.repository.port";
import type { LocationRepositoryPort } from "@backend/core/application/ports/repositories/gardening/location.repository.port";
import type { PlantRepositoryPort } from "@backend/core/application/ports/repositories/gardening/plant.repository.port";
import type { SpatialNodeRepositoryPort } from "@backend/core/application/ports/repositories/spatial/spatial-node.repository.port";
import type { AccessControlApplicationService } from "@backend/core/application/services/access-control/access-control.application-service";
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
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		return await this.gardeningEventRepository.getAllScoped({
			workspaceKeys: [input.context.activeWorkspaceScope.toKey()],
		});
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
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const wk = input.context.activeWorkspaceScope.toKey();
		return this.gardeningEventRepository.getByIdScoped({ workspaceKey: wk, dto: { id: input.dto.id } });
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
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "update" });
		const wk = input.context.activeWorkspaceScope.toKey();
		return this.gardeningEventRepository.updateByIdScoped({
			workspaceKey: wk,
			dto: input.dto,
		});
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
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "delete" });
		const wk = input.context.activeWorkspaceScope.toKey();
		return this.gardeningEventRepository.deleteByIdScoped({
			workspaceKey: wk,
			dto: { id: input.dto.id },
		});
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
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "create" });
		const gardeningEvent = await this.gardeningEventRepository.createScoped({
			dto: {
				action: input.dto.action,
				workspaceKey: input.context.activeWorkspaceScope.toKey(),
			},
		});
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
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "create" });
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const wk = input.context.activeWorkspaceScope.toKey();
		await this.locationRepository.getByIdScoped({ workspaceKey: wk, dto: { id: input.dto.locationId } });
		const gardeningEvent = await this.gardeningEventRepository.createScoped({
			dto: {
				action: input.dto.action,
				workspaceKey: input.context.activeWorkspaceScope.toKey(),
			},
		});
		const activeKey = input.context.activeWorkspaceScope.toKey();
		try {
			const locationNode = await this.spatialNodeRepository.getByRefScoped({
				workspaceKeys: [activeKey],
				dto: { ref: { entity: "location", entityId: String(input.dto.locationId) } },
			});
			const allNodes = await this.spatialNodeRepository.getAllScoped({
				workspaceKeys: [activeKey],
			});
			const directPlantIds = allNodes.items
				.filter(
					(n) =>
						n.ref.entity === "plant" &&
						n.parentId !== null &&
						String(n.parentId) === String(locationNode.id),
				)
				.map((n) => n.ref.entityId as PlantEntityId);
			const plants = await this.plantRepository.getListByIdsScoped({
				workspaceKeys: [activeKey],
				dto: { ids: directPlantIds },
			});
			await Promise.all(
				plants.items.map((plant) =>
					this.gardeningEventRepository.bindToPlantScoped({
						workspaceKey: gardeningEvent.workspaceKey,
						dto: {
							id: gardeningEvent.id,
							plantId: plant.id,
						},
					}),
				),
			);
		} catch {
			// Spatial mapping is optional during bootstrap/reset states.
		}
		await this.gardeningEventRepository.bindToLocationScoped({
			workspaceKey: gardeningEvent.workspaceKey,
			dto: {
				id: gardeningEvent.id,
				locationId: input.dto.locationId,
			},
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
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "create" });
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const gardeningEvent = await this.gardeningEventRepository.createScoped({
			dto: {
				action: input.dto.action,
				workspaceKey: input.context.activeWorkspaceScope.toKey(),
			},
		});
		const activeKeys = [input.context.activeWorkspaceScope.toKey()] as const;
		const plants = await this.plantRepository.getListByIdsScoped({
			workspaceKeys: activeKeys,
			dto: { ids: input.dto.plantIds },
		});
		const promises = [];
		for (const plant of plants.items) {
			promises.push(
				this.gardeningEventRepository.bindToPlantScoped({
					workspaceKey: gardeningEvent.workspaceKey,
					dto: {
						id: gardeningEvent.id,
						plantId: plant.id,
					},
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
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const activeKeys = [input.context.activeWorkspaceScope.toKey()] as const;
		await this.plantRepository.getByIdScoped({
			workspaceKey: activeKeys[0],
			dto: { id: input.dto.plantId },
		});
		const raw = await this.gardeningEventRepository.getForPlantScoped({
			workspaceKeys: activeKeys,
			dto: { plantId: input.dto.plantId },
		});
		return { items: raw.items };
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
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const activeKeys = [input.context.activeWorkspaceScope.toKey()] as const;
		await this.locationRepository.getByIdScoped({
			workspaceKey: activeKeys[0],
			dto: { id: input.dto.locationId },
		});
		const raw = await this.gardeningEventRepository.getForLocationScoped({
			workspaceKeys: activeKeys,
			dto: { locationId: input.dto.locationId },
		});
		return { items: raw.items };
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
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const wk = input.context.activeWorkspaceScope.toKey();
		await this.gardeningEventRepository.getByIdScoped({ workspaceKey: wk, dto: { id: input.dto.id } });
		return this.gardeningEventRepository.getBindingsForEventScoped({
			workspaceKey: wk,
			dto: { id: input.dto.id },
		});
	}
}
