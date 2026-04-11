import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import type { LocationEntity, LocationEntityId } from "@backend/core/domain/gardening/entities";
import type { ItemsContainer } from "@backend/shared/types";
import type {
	LocationRepositoryCreateInputDTO,
	LocationRepositoryDeleteManyInputDTO,
	LocationRepositoryDeleteManyOutputDTO,
	LocationRepositoryPort,
	LocationRepositoryUpdateInputDTO,
} from "../../ports/repositories/gardening/location.repository.port";
import { RepositoryValidationError } from "../../ports/repositories/shared/base-repository.errors";
import type { AccessControlApplicationService } from "../../services/access-control/access-control.application-service";
import type { SpatialOperationsService } from "../../services/spatial/spatial-operations.service";
import { BaseUseCaseError } from "../shared/errors";
import type { IUseCase } from "../shared/use-case.interface";
import type { UseCaseRequest } from "../use-case-context";

type LocationCreatePayload = Omit<LocationRepositoryCreateInputDTO, "workspaceKey">;
export type LocationCreateUseCaseInput = UseCaseRequest<LocationCreatePayload>;
export type LocationCreateUseCaseOutput = LocationEntity;

export class LocationCreateUseCase implements IUseCase<LocationCreateUseCaseInput, LocationCreateUseCaseOutput> {
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly locationRepository: LocationRepositoryPort,
	) {}

	public async execute(input: LocationCreateUseCaseInput): Promise<LocationCreateUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "create" });
		const created = await this.locationRepository.createScoped({
			dto: {
				...input.dto,
				workspaceKey: input.context.activeWorkspaceScope.toKey(),
			},
		});
		return created;
	}
}

export type LocationGetByIdUseCaseInput = UseCaseRequest<{ id: LocationEntityId }>;
export type LocationGetByIdUseCaseOutput = LocationEntity;

export class LocationGetByIdUseCase implements IUseCase<LocationGetByIdUseCaseInput, LocationGetByIdUseCaseOutput> {
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly locationRepository: LocationRepositoryPort,
	) {}

	public async execute(input: LocationGetByIdUseCaseInput): Promise<LocationGetByIdUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const wk = input.context.activeWorkspaceScope.toKey();
		return this.locationRepository.getByIdScoped({ workspaceKey: wk, dto: { id: input.dto.id } });
	}
}

export type LocationGetAllUseCaseInput = UseCaseRequest;
export type LocationGetAllUseCaseOutput = ItemsContainer<LocationEntity>;

export class LocationGetAllUseCase implements IUseCase<LocationGetAllUseCaseInput, LocationGetAllUseCaseOutput> {
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly locationRepository: LocationRepositoryPort,
	) {}

	public async execute(input: LocationGetAllUseCaseInput): Promise<LocationGetAllUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({
			...input.context,
			action: "read",
		});
		const all = await this.locationRepository.getAllScoped({
			workspaceKeys: [input.context.activeWorkspaceScope.toKey()],
		});
		return {
			items: all.items.map((item) => ({
				...item,
				systemCatalog: WorkspaceVO.isGlobalSharedKey(item.workspaceKey),
			})),
		};
	}
}

export type LocationUpdateUseCaseInput = UseCaseRequest<LocationRepositoryUpdateInputDTO>;
export type LocationUpdateUseCaseOutput = LocationEntity;

export class LocationUpdateUseCase implements IUseCase<LocationUpdateUseCaseInput, LocationUpdateUseCaseOutput> {
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly locationRepository: LocationRepositoryPort,
	) {}

	public async execute(input: LocationUpdateUseCaseInput): Promise<LocationUpdateUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "update" });
		const wk = input.context.activeWorkspaceScope.toKey();
		return this.locationRepository.updateByIdScoped({
			workspaceKey: wk,
			dto: input.dto,
		});
	}
}

export type LocationDeleteUseCaseInput = UseCaseRequest<{ id: LocationEntityId }>;
export type LocationDeleteUseCaseOutput = LocationEntityId;

export class LocationDeleteUseCasePlacedEntityError extends BaseUseCaseError {
	constructor(params: { id: string }) {
		super({
			message: "This location is placed. Remove it in the editor first.",
			useCaseName: "LocationDeleteUseCase",
			context: params,
		});
	}
}

export class LocationDeleteManyUseCasePlacedEntityError extends BaseUseCaseError {
	constructor(params: { ids: string[] }) {
		super({
			message: "The selection includes placed items. Remove them in the editor first.",
			useCaseName: "LocationDeleteManyUseCase",
			context: params,
		});
	}
}

export class LocationDeleteUseCase implements IUseCase<LocationDeleteUseCaseInput, LocationDeleteUseCaseOutput> {
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly locationRepository: LocationRepositoryPort,
		private readonly spatialOperationsService: SpatialOperationsService,
	) {}

	public async execute(input: LocationDeleteUseCaseInput): Promise<LocationDeleteUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "delete" });
		const wk = input.context.activeWorkspaceScope.toKey();
		const placement = await this.spatialOperationsService.getPlacementStatusByRef({
			ref: { entity: "location", entityId: String(input.dto.id) },
			workspaceKeys: [wk],
		});
		if (placement.isPlaced) {
			throw new LocationDeleteUseCasePlacedEntityError({ id: String(input.dto.id) });
		}
		const deletedId = await this.locationRepository.deleteByIdScoped({
			workspaceKey: wk,
			dto: { id: input.dto.id },
		});
		await this.spatialOperationsService.deleteUnplacedNodeByRef({
			ref: { entity: "location", entityId: String(deletedId) },
			workspaceKeys: [wk],
		});
		return deletedId;
	}
}

export type LocationDeleteManyUseCaseInput = UseCaseRequest<LocationRepositoryDeleteManyInputDTO>;
export type LocationDeleteManyUseCaseOutput = LocationRepositoryDeleteManyOutputDTO;

export class LocationDeleteManyUseCase
	implements IUseCase<LocationDeleteManyUseCaseInput, LocationDeleteManyUseCaseOutput>
{
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly locationRepository: LocationRepositoryPort,
		private readonly spatialOperationsService: SpatialOperationsService,
	) {}

	public async execute(input: LocationDeleteManyUseCaseInput): Promise<LocationDeleteManyUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "delete" });
		if (input.dto.ids.length < 1) {
			throw new RepositoryValidationError({
				operation: "deleteMany",
				validationCode: "invalid-ids",
				context: { idCount: input.dto.ids.length },
				details: { minAllowed: 1 },
				message: "deleteMany ids must be at least 1.",
			});
		}
		const wk = input.context.activeWorkspaceScope.toKey();
		const placedIdSet = new Set<string>();
		for (const id of input.dto.ids) {
			const placement = await this.spatialOperationsService.getPlacementStatusByRef({
				ref: { entity: "location", entityId: String(id) },
				workspaceKeys: [wk],
			});
			if (placement.isPlaced) placedIdSet.add(String(id));
		}
		if (placedIdSet.size > 0) {
			throw new LocationDeleteManyUseCasePlacedEntityError({ ids: [...placedIdSet].sort() });
		}
		const { deletedIds } = await this.locationRepository.deleteManyScoped({
			workspaceKeys: [wk],
			dto: { ids: input.dto.ids },
		});
		for (const deletedId of deletedIds) {
			await this.spatialOperationsService.deleteUnplacedNodeByRef({
				ref: { entity: "location", entityId: String(deletedId) },
				workspaceKeys: [wk],
			});
		}
		return { deletedIds };
	}
}
