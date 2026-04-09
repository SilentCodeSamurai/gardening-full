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
import {
	APPLICATION_RESOURCE_TYPES,
	gardeningLocationRef,
} from "../../resource-refs";
import { AccessControlApplicationService } from "../../services/access-control/access-control.application-service";
import type { SpatialOperationsService } from "../../services/spatial/spatial-operations.service";
import { BaseUseCaseError } from "../shared/errors";
import type { IUseCase } from "../shared/use-case.interface";
import type { UseCaseRequest } from "../use-case-context";

export type LocationCreateUseCaseInput = UseCaseRequest<LocationRepositoryCreateInputDTO>;
export type LocationCreateUseCaseOutput = LocationEntity;

export class LocationCreateUseCase implements IUseCase<LocationCreateUseCaseInput, LocationCreateUseCaseOutput> {
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly locationRepository: LocationRepositoryPort,
	) {}

	public async execute(input: LocationCreateUseCaseInput): Promise<LocationCreateUseCaseOutput> {
		await this.access.assertCanCreate(input.context, input.context.workspaceRef);
		const created = await this.locationRepository.create(input.dto);
		await this.access.bootstrapResourceAdminForActor(input.context, gardeningLocationRef(String(created.id)));
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
		const row = await this.locationRepository.getById({ id: input.dto.id });
		await this.access.assertCanRead(input.context, gardeningLocationRef(String(input.dto.id)));
		return row;
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
		const mask = await this.access.getReadableResourceMask({
			actorRef: input.context.actorRef,
			resourceType: APPLICATION_RESOURCE_TYPES.location,
		});
		const all = await this.locationRepository.getAll();
		return { items: AccessControlApplicationService.filterItemsByReadableMask(all.items, mask) };
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
		await this.locationRepository.getById({ id: input.dto.id });
		await this.access.assertCanUpdate(input.context, gardeningLocationRef(String(input.dto.id)));
		return this.locationRepository.update(input.dto);
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
		await this.locationRepository.getById({ id: input.dto.id });
		await this.access.assertCanDelete(input.context, gardeningLocationRef(String(input.dto.id)));
		const placement = await this.spatialOperationsService.getPlacementStatusByRef({
			entity: "location",
			entityId: String(input.dto.id),
		});
		if (placement.isPlaced) {
			throw new LocationDeleteUseCasePlacedEntityError({ id: String(input.dto.id) });
		}
		const deletedId = await this.locationRepository.delete({ id: input.dto.id });
		await this.spatialOperationsService.deleteUnplacedNodeByRef({
			entity: "location",
			entityId: String(deletedId),
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
		if (input.dto.ids.length < 1) {
			throw new RepositoryValidationError({
				operation: "deleteMany",
				validationCode: "invalid-ids",
				context: { idCount: input.dto.ids.length },
				details: { minAllowed: 1 },
				message: "deleteMany ids must be at least 1.",
			});
		}
		for (const id of input.dto.ids) {
			await this.locationRepository.getById({ id });
			await this.access.assertCanDelete(input.context, gardeningLocationRef(String(id)));
		}
		const placedIdSet = new Set<string>();
		for (const id of input.dto.ids) {
			const placement = await this.spatialOperationsService.getPlacementStatusByRef({
				entity: "location",
				entityId: String(id),
			});
			if (placement.isPlaced) placedIdSet.add(String(id));
		}
		if (placedIdSet.size > 0) {
			throw new LocationDeleteManyUseCasePlacedEntityError({ ids: [...placedIdSet].sort() });
		}
		const { deletedIds } = await this.locationRepository.deleteMany({ ids: input.dto.ids });
		for (const deletedId of deletedIds) {
			await this.spatialOperationsService.deleteUnplacedNodeByRef({
				entity: "location",
				entityId: String(deletedId),
			});
		}
		return { deletedIds };
	}
}
