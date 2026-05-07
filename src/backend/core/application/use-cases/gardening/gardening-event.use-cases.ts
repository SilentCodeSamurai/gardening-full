import {
	type GardeningEventRepositoryPort,
	GardeningEventRepositoryPortToken,
} from "@backend/core/application/ports/repositories/gardening/gardening-event.repository.port";
import {
	type LocationRepositoryPort,
	LocationRepositoryPortToken,
} from "@backend/core/application/ports/repositories/gardening/location.repository.port";
import {
	type PlantRepositoryPort,
	PlantRepositoryPortToken,
} from "@backend/core/application/ports/repositories/gardening/plant.repository.port";
import {
	type SpatialNodeRepositoryPort,
	SpatialNodeRepositoryPortToken,
} from "@backend/core/application/ports/repositories/spatial/spatial-node.repository.port";
import {
	type TransactionManagerPort,
	TransactionManagerPortToken,
} from "@backend/core/application/ports/transaction/transaction-manager.port";
import { AccessControlApplicationService } from "@backend/core/application/services/access-control/access-control.application-service";
import { BaseUseCase } from "@backend/core/application/use-cases/shared/base.use-case";
import { UseCaseValidationError } from "@backend/core/application/use-cases/shared/errors";
import { TransactionalUseCase } from "@backend/core/application/use-cases/shared/transactional.use-case";
import type { UseCaseRequest } from "@backend/core/application/use-cases/use-case-context";
import type {
	GardeningEventEntity,
	GardeningEventEntityId,
	LocationEntityId,
	PlantEntityId,
} from "@backend/core/domain/gardening/entities";
import type { GardeningAction } from "@backend/core/domain/gardening/value-objects";
import type { ItemsContainer } from "@backend/shared/types";
import { inject, injectable } from "tsyringe";

export type GardeningEventGetAllUseCaseInput = UseCaseRequest;
export type GardeningEventGetAllUseCaseOutput = ItemsContainer<GardeningEventEntity>;

@injectable()
export class GardeningEventGetAllUseCase extends BaseUseCase<
	GardeningEventGetAllUseCaseInput,
	GardeningEventGetAllUseCaseOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(GardeningEventRepositoryPortToken)
		private readonly gardeningEventRepository: GardeningEventRepositoryPort,
	) {
		super();
	}

	protected async execute(input: GardeningEventGetAllUseCaseInput): Promise<GardeningEventGetAllUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const scope = input.context.activeWorkspaceScope;
		return this.gardeningEventRepository.getMany({ filters: [{ workspace: scope }] });
	}
}

export type GardeningEventGetByIdUseCaseInput = UseCaseRequest<{ id: GardeningEventEntityId }>;
export type GardeningEventGetByIdUseCaseOutput = GardeningEventEntity;

@injectable()
export class GardeningEventGetByIdUseCase extends BaseUseCase<
	GardeningEventGetByIdUseCaseInput,
	GardeningEventGetByIdUseCaseOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(GardeningEventRepositoryPortToken)
		private readonly gardeningEventRepository: GardeningEventRepositoryPort,
	) {
		super();
	}

	protected async execute(input: GardeningEventGetByIdUseCaseInput): Promise<GardeningEventGetByIdUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const scope = input.context.activeWorkspaceScope;
		return this.gardeningEventRepository.getOne({ filters: [{ id: input.dto.id, workspace: scope }] });
	}
}

export type GardeningEventUpdateUseCaseInput = UseCaseRequest<{
	id: GardeningEventEntityId;
	action?: GardeningAction;
	occurredAt?: Date | null;
}>;
export type GardeningEventUpdateUseCaseOutput = GardeningEventEntity;

@injectable()
export class GardeningEventUpdateUseCase extends BaseUseCase<
	GardeningEventUpdateUseCaseInput,
	GardeningEventUpdateUseCaseOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(GardeningEventRepositoryPortToken)
		private readonly gardeningEventRepository: GardeningEventRepositoryPort,
	) {
		super();
	}

	protected async execute(input: GardeningEventUpdateUseCaseInput): Promise<GardeningEventUpdateUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "update" });
		const scope = input.context.activeWorkspaceScope;
		const { id, ...patch } = input.dto;
		return this.gardeningEventRepository.updateOne({
			filters: [{ id, workspace: scope }],
			dto: patch,
		});
	}
}

export type GardeningEventBulkEditByIdsUseCaseInput = UseCaseRequest<{
	ids: GardeningEventEntityId[];
	action?: GardeningAction;
	occurredAt?: Date | null;
}>;
export type GardeningEventBulkEditByIdsUseCaseOutput = { count: number };

@injectable()
export class GardeningEventBulkEditByIdsUseCase extends BaseUseCase<
	GardeningEventBulkEditByIdsUseCaseInput,
	GardeningEventBulkEditByIdsUseCaseOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(GardeningEventRepositoryPortToken)
		private readonly gardeningEventRepository: GardeningEventRepositoryPort,
	) {
		super();
	}

	protected async execute(
		input: GardeningEventBulkEditByIdsUseCaseInput,
	): Promise<GardeningEventBulkEditByIdsUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "update" });
		if (input.dto.ids.length < 1) {
			throw new UseCaseValidationError({
				useCaseName: "GardeningEventBulkEditByIdsUseCase",
				validationCode: "invalid-ids",
				i18nMessageKey: "errors_application_gardening_event_bulk_edit_by_ids_invalid_ids",
				context: { idCount: input.dto.ids.length },
				details: { minAllowed: 1 },
				message: "bulkEditByIds ids must be at least 1.",
			});
		}
		const scope = input.context.activeWorkspaceScope;
		const { ids, ...patch } = input.dto;
		return this.gardeningEventRepository.updateMany({
			filters: ids.map((id) => ({ id, workspace: scope })),
			dto: patch,
		});
	}
}

export type GardeningEventDeleteUseCaseInput = UseCaseRequest<{ id: GardeningEventEntityId }>;
export type GardeningEventDeleteUseCaseOutput = GardeningEventEntityId;

@injectable()
export class GardeningEventDeleteUseCase extends BaseUseCase<
	GardeningEventDeleteUseCaseInput,
	GardeningEventDeleteUseCaseOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(GardeningEventRepositoryPortToken)
		private readonly gardeningEventRepository: GardeningEventRepositoryPort,
	) {
		super();
	}

	protected async execute(input: GardeningEventDeleteUseCaseInput): Promise<GardeningEventDeleteUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "delete" });
		const scope = input.context.activeWorkspaceScope;
		return this.gardeningEventRepository.deleteOne({
			filters: [{ id: input.dto.id, workspace: scope }],
		});
	}
}

export type GardeningEventDeleteManyUseCaseInput = UseCaseRequest<{ ids: GardeningEventEntityId[] }>;
export type GardeningEventDeleteManyUseCaseOutput = { count: number };

@injectable()
export class GardeningEventDeleteManyUseCase extends BaseUseCase<
	GardeningEventDeleteManyUseCaseInput,
	GardeningEventDeleteManyUseCaseOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(GardeningEventRepositoryPortToken)
		private readonly gardeningEventRepository: GardeningEventRepositoryPort,
	) {
		super();
	}

	protected async execute(
		input: GardeningEventDeleteManyUseCaseInput,
	): Promise<GardeningEventDeleteManyUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "delete" });
		const scope = input.context.activeWorkspaceScope;
		return this.gardeningEventRepository.deleteMany({
			filters: input.dto.ids.map((id) => ({ id, workspace: scope })),
		});
	}
}

export type GardeningEventCreateUseCaseInput = UseCaseRequest<{
	action: GardeningAction;
	occurredAt: Date | null;
}>;
export type GardeningEventCreateUseCaseOutput = GardeningEventEntity;

@injectable()
export class GardeningEventCreateUseCase extends BaseUseCase<
	GardeningEventCreateUseCaseInput,
	GardeningEventCreateUseCaseOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(GardeningEventRepositoryPortToken)
		private readonly gardeningEventRepository: GardeningEventRepositoryPort,
	) {
		super();
	}

	protected async execute(input: GardeningEventCreateUseCaseInput): Promise<GardeningEventCreateUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "create" });
		return this.gardeningEventRepository.createOne({
			action: input.dto.action,
			occurredAt: input.dto.occurredAt,
			workspace: input.context.activeWorkspaceScope,
		});
	}
}

export type GardeningEventCreateForLocationUseCaseInput = UseCaseRequest<{
	locationId: LocationEntityId;
	action: GardeningAction;
	occurredAt: Date | null;
}>;
export type GardeningEventCreateForLocationUseCaseOutput = GardeningEventEntity;

@injectable()
export class GardeningEventCreateForLocationUseCase extends TransactionalUseCase<
	GardeningEventCreateForLocationUseCaseInput,
	GardeningEventCreateForLocationUseCaseOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(GardeningEventRepositoryPortToken)
		private readonly gardeningEventRepository: GardeningEventRepositoryPort,
		@inject(PlantRepositoryPortToken) private readonly plantRepository: PlantRepositoryPort,
		@inject(SpatialNodeRepositoryPortToken)
		private readonly spatialNodeRepository: SpatialNodeRepositoryPort,
		@inject(LocationRepositoryPortToken) private readonly locationRepository: LocationRepositoryPort,
		@inject(TransactionManagerPortToken) transactionManager: TransactionManagerPort,
	) {
		super(transactionManager);
	}

	protected async execute(
		input: GardeningEventCreateForLocationUseCaseInput,
	): Promise<GardeningEventCreateForLocationUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "create" });
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const scope = input.context.activeWorkspaceScope;
		await this.locationRepository.getOne({
			filters: [{ id: input.dto.locationId, workspace: scope }],
		});
		const gardeningEvent = await this.gardeningEventRepository.createOne({
			action: input.dto.action,
			occurredAt: input.dto.occurredAt,
			workspace: input.context.activeWorkspaceScope,
		});
		const activeScope = input.context.activeWorkspaceScope;
		try {
			const locationNode = await this.spatialNodeRepository.getOneByRef({
				filters: [
					{
						ref: { entity: "location", entityId: String(input.dto.locationId) },
					},
				],
			});
			const allNodes = await this.spatialNodeRepository.getMany({ filters: [{ workspace: activeScope }] });
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
							filters: directPlantIds.map((id) => ({ id, workspace: activeScope })),
						})
					: { items: [] };
			await Promise.all(
				plants.items.map((plant) => {
					return this.gardeningEventRepository.bindToPlantOne({
						filters: [{ id: gardeningEvent.id, workspace: gardeningEvent.workspace }],
						plantId: plant.id,
					});
				}),
			);
		} catch {
			// Spatial mapping is optional during bootstrap/reset states.
		}
		await this.gardeningEventRepository.bindToLocationOne({
			filters: [{ id: gardeningEvent.id, workspace: gardeningEvent.workspace }],
			locationId: input.dto.locationId,
		});
		return gardeningEvent;
	}
}

export type GardeningEventCreateForPlantListUseCaseInput = UseCaseRequest<{
	action: GardeningAction;
	plantIds: PlantEntityId[];
	occurredAt: Date | null;
}>;
export type GardeningEventCreateForPlantListUseCaseOutput = GardeningEventEntity;

@injectable()
export class GardeningEventCreateForPlantListUseCase extends TransactionalUseCase<
	GardeningEventCreateForPlantListUseCaseInput,
	GardeningEventCreateForPlantListUseCaseOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(GardeningEventRepositoryPortToken)
		private readonly gardeningEventRepository: GardeningEventRepositoryPort,
		@inject(PlantRepositoryPortToken) private readonly plantRepository: PlantRepositoryPort,
		@inject(TransactionManagerPortToken) transactionManager: TransactionManagerPort,
	) {
		super(transactionManager);
	}

	protected async execute(
		input: GardeningEventCreateForPlantListUseCaseInput,
	): Promise<GardeningEventCreateForPlantListUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "create" });
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const gardeningEvent = await this.gardeningEventRepository.createOne({
			action: input.dto.action,
			occurredAt: input.dto.occurredAt,
			workspace: input.context.activeWorkspaceScope,
		});
		const activeScope = input.context.activeWorkspaceScope;
		const plants = await this.plantRepository.getMany({
			filters: input.dto.plantIds.map((id) => ({ id, workspace: activeScope })),
		});
		const promises = [];
		for (const plant of plants.items) {
			promises.push(
				this.gardeningEventRepository.bindToPlantOne({
					filters: [{ id: gardeningEvent.id, workspace: gardeningEvent.workspace }],
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

@injectable()
export class GardeningEventGetForPlantUseCase extends BaseUseCase<
	GardeningEventGetForPlantUseCaseInput,
	GardeningEventGetForPlantUseCaseOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(GardeningEventRepositoryPortToken)
		private readonly gardeningEventRepository: GardeningEventRepositoryPort,
		@inject(PlantRepositoryPortToken) private readonly plantRepository: PlantRepositoryPort,
	) {
		super();
	}

	protected async execute(
		input: GardeningEventGetForPlantUseCaseInput,
	): Promise<GardeningEventGetForPlantUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const activeScope = input.context.activeWorkspaceScope;
		await this.plantRepository.getOne({ filters: [{ id: input.dto.plantId, workspace: activeScope }] });
		return this.gardeningEventRepository.getManyForPlant({
			filters: [{ plantId: input.dto.plantId }],
		});
	}
}

export type GardeningEventGetForLocationUseCaseInput = UseCaseRequest<{ locationId: LocationEntityId }>;
export type GardeningEventGetForLocationUseCaseOutput = ItemsContainer<GardeningEventEntity>;

@injectable()
export class GardeningEventGetForLocationUseCase extends BaseUseCase<
	GardeningEventGetForLocationUseCaseInput,
	GardeningEventGetForLocationUseCaseOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(GardeningEventRepositoryPortToken)
		private readonly gardeningEventRepository: GardeningEventRepositoryPort,
		@inject(LocationRepositoryPortToken) private readonly locationRepository: LocationRepositoryPort,
	) {
		super();
	}

	protected async execute(
		input: GardeningEventGetForLocationUseCaseInput,
	): Promise<GardeningEventGetForLocationUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const activeScope = input.context.activeWorkspaceScope;
		await this.locationRepository.getOne({ filters: [{ id: input.dto.locationId, workspace: activeScope }] });
		return this.gardeningEventRepository.getManyForLocation({
			filters: [{ locationId: input.dto.locationId }],
		});
	}
}

export type GardeningEventGetBindingsForEventUseCaseInput = UseCaseRequest<{ id: GardeningEventEntityId }>;
export type GardeningEventGetBindingsForEventUseCaseOutput = {
	plantIds: PlantEntityId[];
	locationIds: LocationEntityId[];
};

@injectable()
export class GardeningEventGetBindingsForEventUseCase extends BaseUseCase<
	GardeningEventGetBindingsForEventUseCaseInput,
	GardeningEventGetBindingsForEventUseCaseOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(GardeningEventRepositoryPortToken)
		private readonly gardeningEventRepository: GardeningEventRepositoryPort,
	) {
		super();
	}

	protected async execute(
		input: GardeningEventGetBindingsForEventUseCaseInput,
	): Promise<GardeningEventGetBindingsForEventUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const scope = input.context.activeWorkspaceScope;
		await this.gardeningEventRepository.getOne({ filters: [{ id: input.dto.id, workspace: scope }] });
		return this.gardeningEventRepository.getBindingsOne({
			filters: [{ id: input.dto.id, workspace: scope }],
		});
	}
}
