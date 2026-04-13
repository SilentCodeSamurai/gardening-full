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
		const wk = input.context.activeWorkspaceScope.toKey();
		return this.gardeningEventRepository.getMany({ filters: [{ workspaceKey: wk }] });
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
		return this.gardeningEventRepository.getOne({ filters: [{ id: input.dto.id, workspaceKey: wk }] });
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
		const { id, ...patch } = input.dto;
		return this.gardeningEventRepository.updateOne({
			filters: [{ id, workspaceKey: wk }],
			dto: patch,
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
		return this.gardeningEventRepository.deleteOne({
			filters: [{ id: input.dto.id, workspaceKey: wk }],
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
		return this.gardeningEventRepository.createOne({
			action: input.dto.action,
			workspaceKey: input.context.activeWorkspaceScope.toKey(),
		});
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
		await this.locationRepository.getOne({ filters: [{ id: input.dto.locationId, workspaceKey: wk }] });
		const gardeningEvent = await this.gardeningEventRepository.createOne({
			action: input.dto.action,
			workspaceKey: input.context.activeWorkspaceScope.toKey(),
		});
		const activeKey = input.context.activeWorkspaceScope.toKey();
		try {
			const locationNode = await this.spatialNodeRepository.getOneByRef({
				filters: [
					{
						ref: { entity: "location", entityId: String(input.dto.locationId) },
						workspaceKey: activeKey,
					},
				],
			});
			const allNodes = await this.spatialNodeRepository.getMany({ filters: [{ workspaceKey: activeKey }] });
			const directPlantIds = allNodes.items
				.filter(
					(n) =>
						n.ref.entity === "plant" &&
						n.parentId !== null &&
						String(n.parentId) === String(locationNode.id),
				)
				.map((n) => n.ref.entityId as PlantEntityId);
			const plants =
				directPlantIds.length > 0
					? await this.plantRepository.getMany({
							filters: directPlantIds.map((id) => ({ id, workspaceKey: activeKey })),
						})
					: { items: [] };
			await Promise.all(
				plants.items.map((plant) =>
					this.gardeningEventRepository.bindToPlantOne({
						filters: [{ id: gardeningEvent.id, workspaceKey: gardeningEvent.workspaceKey }],
						plantId: plant.id,
					}),
				),
			);
		} catch {
			// Spatial mapping is optional during bootstrap/reset states.
		}
		await this.gardeningEventRepository.bindToLocationOne({
			filters: [{ id: gardeningEvent.id, workspaceKey: gardeningEvent.workspaceKey }],
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
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "create" });
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const gardeningEvent = await this.gardeningEventRepository.createOne({
			action: input.dto.action,
			workspaceKey: input.context.activeWorkspaceScope.toKey(),
		});
		const activeKey = input.context.activeWorkspaceScope.toKey();
		const plants = await this.plantRepository.getMany({
			filters: input.dto.plantIds.map((id) => ({ id, workspaceKey: activeKey })),
		});
		const promises = [];
		for (const plant of plants.items) {
			promises.push(
				this.gardeningEventRepository.bindToPlantOne({
					filters: [{ id: gardeningEvent.id, workspaceKey: gardeningEvent.workspaceKey }],
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
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const activeKey = input.context.activeWorkspaceScope.toKey();
		await this.plantRepository.getOne({ filters: [{ id: input.dto.plantId, workspaceKey: activeKey }] });
		return this.gardeningEventRepository.getManyForPlant({
			filters: [{ plantId: input.dto.plantId, workspaceKey: activeKey }],
		});
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
		const activeKey = input.context.activeWorkspaceScope.toKey();
		await this.locationRepository.getOne({ filters: [{ id: input.dto.locationId, workspaceKey: activeKey }] });
		return this.gardeningEventRepository.getManyForLocation({
			filters: [{ locationId: input.dto.locationId, workspaceKey: activeKey }],
		});
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
		await this.gardeningEventRepository.getOne({ filters: [{ id: input.dto.id, workspaceKey: wk }] });
		return this.gardeningEventRepository.getBindingsOne({
			filters: [{ id: input.dto.id, workspaceKey: wk }],
		});
	}
}
