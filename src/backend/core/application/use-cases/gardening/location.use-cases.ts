import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import type { LocationEntity, LocationEntityId } from "@backend/core/domain/gardening/entities";
import type { ItemsContainer } from "@backend/shared/types";
import { inject, injectable } from "tsyringe";
import {
	type LocationRepositoryCreateInputDTO,
	type LocationRepositoryDeleteOutputDTO,
	type LocationRepositoryPort,
	LocationRepositoryPortToken,
	type LocationRepositoryUpdatePatchDTO,
} from "../../ports/repositories/gardening/location.repository.port";
import {
	type TransactionManagerPort,
	TransactionManagerPortToken,
} from "../../ports/transaction/transaction-manager.port";
import { AccessControlApplicationService } from "../../services/access-control/access-control.application-service";
import { SpatialNodeRefApplicationService } from "../../services/spatial/spatial-node-ref.application-service";
import { BaseUseCase } from "../shared/base.use-case";
import { BaseUseCaseError, UseCaseValidationError } from "../shared/errors";
import type { ExcludeWorkspace } from "../shared/types";
import { TransactionalUseCase } from "../shared/transactional.use-case";
import type { UseCaseRequest } from "../use-case-context";

type LocationCreatePayload = ExcludeWorkspace<LocationRepositoryCreateInputDTO>;
export type LocationCreateUseCaseInput = UseCaseRequest<LocationCreatePayload>;
export type LocationCreateUseCaseOutput = LocationEntity;

@injectable()
export class LocationCreateUseCase extends BaseUseCase<LocationCreateUseCaseInput, LocationCreateUseCaseOutput> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(LocationRepositoryPortToken) private readonly locationRepository: LocationRepositoryPort,
	) {
		super();
	}

	protected async execute(input: LocationCreateUseCaseInput): Promise<LocationCreateUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "create" });
		return this.locationRepository.createOne({
			...input.dto,
			workspace: input.context.activeWorkspaceScope,
		});
	}
}

export type LocationGetByIdUseCaseInput = UseCaseRequest<{ id: LocationEntityId }>;
export type LocationGetByIdUseCaseOutput = LocationEntity;

@injectable()
export class LocationGetByIdUseCase extends BaseUseCase<LocationGetByIdUseCaseInput, LocationGetByIdUseCaseOutput> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(LocationRepositoryPortToken) private readonly locationRepository: LocationRepositoryPort,
	) {
		super();
	}

	protected async execute(input: LocationGetByIdUseCaseInput): Promise<LocationGetByIdUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const scope = input.context.activeWorkspaceScope;
		return this.locationRepository.getOne({ filters: [{ id: input.dto.id, workspace: scope }] });
	}
}

export type LocationGetAllUseCaseInput = UseCaseRequest;
export type LocationGetAllUseCaseOutput = ItemsContainer<LocationEntity>;

@injectable()
export class LocationGetAllUseCase extends BaseUseCase<LocationGetAllUseCaseInput, LocationGetAllUseCaseOutput> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(LocationRepositoryPortToken) private readonly locationRepository: LocationRepositoryPort,
	) {
		super();
	}

	protected async execute(input: LocationGetAllUseCaseInput): Promise<LocationGetAllUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({
			...input.context,
			action: "read",
		});
		const scope = input.context.activeWorkspaceScope;
		const all = await this.locationRepository.getMany({ filters: [{ workspace: scope }] });
		return {
			items: all.items.map((item) => ({
				...item,
				systemCatalog: WorkspaceVO.isGlobalShared(item.workspace),
			})),
		};
	}
}

type LocationUpdatePayload = ExcludeWorkspace<LocationRepositoryUpdatePatchDTO>;
export type LocationUpdateUseCaseInput = UseCaseRequest<{ id: LocationEntityId } & LocationUpdatePayload>;
export type LocationUpdateUseCaseOutput = LocationEntity;

@injectable()
export class LocationUpdateUseCase extends BaseUseCase<LocationUpdateUseCaseInput, LocationUpdateUseCaseOutput> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(LocationRepositoryPortToken) private readonly locationRepository: LocationRepositoryPort,
	) {
		super();
	}

	protected async execute(input: LocationUpdateUseCaseInput): Promise<LocationUpdateUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "update" });
		const scope = input.context.activeWorkspaceScope;
		const { id, ...patch } = input.dto;
		return this.locationRepository.updateOne({
			filters: [{ id, workspace: scope }],
			dto: patch,
		});
	}
}

export type LocationBulkEditByIdsUseCaseInput = UseCaseRequest<
	{ ids: LocationEntityId[] } & LocationUpdatePayload
>;
export type LocationBulkEditByIdsUseCaseOutput = { count: number };

@injectable()
export class LocationBulkEditByIdsUseCase extends BaseUseCase<
	LocationBulkEditByIdsUseCaseInput,
	LocationBulkEditByIdsUseCaseOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(LocationRepositoryPortToken) private readonly locationRepository: LocationRepositoryPort,
	) {
		super();
	}

	protected async execute(
		input: LocationBulkEditByIdsUseCaseInput,
	): Promise<LocationBulkEditByIdsUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "update" });
		if (input.dto.ids.length < 1) {
			throw new UseCaseValidationError({
				useCaseName: "LocationBulkEditByIdsUseCase",
				validationCode: "invalid-ids",
				i18nMessageKey: "errors_application_location_bulk_edit_by_ids_invalid_ids",
				context: { idCount: input.dto.ids.length },
				details: { minAllowed: 1 },
				message: "bulkEditByIds ids must be at least 1.",
			});
		}
		const scope = input.context.activeWorkspaceScope;
		const { ids, ...patch } = input.dto;
		return this.locationRepository.updateMany({
			filters: ids.map((id) => ({ id, workspace: scope })),
			dto: patch,
		});
	}
}

export type LocationDeleteUseCaseInput = UseCaseRequest<{ id: LocationEntityId }>;
export type LocationDeleteUseCaseOutput = LocationRepositoryDeleteOutputDTO;

export class LocationDeleteUseCasePlacedEntityError extends BaseUseCaseError {
	constructor(params: { id: string }) {
		super({
			message: "This location is placed. Remove it in the editor first.",
			i18nMessageKey: "errors_application_location_delete_placed",
			useCaseName: "LocationDeleteUseCase",
			context: params,
		});
	}
}

export class LocationDeleteManyUseCasePlacedEntityError extends BaseUseCaseError {
	constructor(params: { ids: string[] }) {
		super({
			message: "The selection includes placed items. Remove them in the editor first.",
			i18nMessageKey: "errors_application_location_delete_many_placed",
			useCaseName: "LocationDeleteManyUseCase",
			context: params,
		});
	}
}

@injectable()
export class LocationDeleteUseCase extends TransactionalUseCase<
	LocationDeleteUseCaseInput,
	LocationDeleteUseCaseOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(SpatialNodeRefApplicationService) private readonly spatialNodeRefService: SpatialNodeRefApplicationService,
		@inject(LocationRepositoryPortToken) private readonly locationRepository: LocationRepositoryPort,
		@inject(TransactionManagerPortToken) transactionManager: TransactionManagerPort,
	) {
		super(transactionManager);
	}

	protected async execute(input: LocationDeleteUseCaseInput): Promise<LocationDeleteUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "delete" });
		const scope = input.context.activeWorkspaceScope;
		const placement = await this.spatialNodeRefService.getPlacementStatusByRef({
			ref: { entity: "location", entityId: String(input.dto.id) },
			workspaces: [scope],
		});
		if (placement.isPlaced) {
			throw new LocationDeleteUseCasePlacedEntityError({ id: String(input.dto.id) });
		}
		const deletedId = await this.locationRepository.deleteOne({
			filters: [{ id: input.dto.id, workspace: scope }],
		});
		await this.spatialNodeRefService.deleteUnplacedNodeByRef({
			ref: { entity: "location", entityId: String(deletedId) },
			workspaces: [scope],
		});
		return deletedId;
	}
}

export type LocationDeleteManyUseCaseInput = UseCaseRequest<{ ids: LocationEntityId[] }>;
export type LocationDeleteManyUseCaseOutput = { deletedIds: LocationEntityId[] };

@injectable()
export class LocationDeleteManyUseCase extends TransactionalUseCase<
	LocationDeleteManyUseCaseInput,
	LocationDeleteManyUseCaseOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(SpatialNodeRefApplicationService) private readonly spatialNodeRefService: SpatialNodeRefApplicationService,
		@inject(LocationRepositoryPortToken) private readonly locationRepository: LocationRepositoryPort,
		@inject(TransactionManagerPortToken) transactionManager: TransactionManagerPort,
	) {
		super(transactionManager);
	}

	protected async execute(input: LocationDeleteManyUseCaseInput): Promise<LocationDeleteManyUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "delete" });
		if (input.dto.ids.length < 1) {
			throw new UseCaseValidationError({
				useCaseName: "LocationDeleteManyUseCase",
				validationCode: "invalid-ids",
				i18nMessageKey: "errors_application_location_delete_many_invalid_ids",
				context: { idCount: input.dto.ids.length },
				details: { minAllowed: 1 },
				message: "deleteMany ids must be at least 1.",
			});
		}
		const scope = input.context.activeWorkspaceScope;
		const placedIdSet = new Set<string>();
		for (const id of input.dto.ids) {
			const placement = await this.spatialNodeRefService.getPlacementStatusByRef({
				ref: { entity: "location", entityId: String(id) },
				workspaces: [scope],
			});
			if (placement.isPlaced) placedIdSet.add(String(id));
		}
		if (placedIdSet.size > 0) {
			throw new LocationDeleteManyUseCasePlacedEntityError({ ids: [...placedIdSet].sort() });
		}
		const filters = input.dto.ids.map((id) => ({ id, workspace: scope }));
		const { count } = await this.locationRepository.deleteMany({ filters });
		if (count !== input.dto.ids.length) {
			throw new UseCaseValidationError({
				useCaseName: "LocationDeleteManyUseCase",
				validationCode: "partial-delete",
				i18nMessageKey: "errors_application_location_delete_many_partial_delete",
				context: { requested: input.dto.ids.length, deleted: count },
				message: "deleteMany removed fewer rows than requested.",
			});
		}
		for (const deletedId of input.dto.ids) {
			await this.spatialNodeRefService.deleteUnplacedNodeByRef({
				ref: { entity: "location", entityId: String(deletedId) },
				workspaces: [scope],
			});
		}
		return { deletedIds: input.dto.ids };
	}
}
